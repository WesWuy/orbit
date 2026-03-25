/**
 * useOrbitEngine — main React hook that wires the Orbit brain to the UI.
 *
 * This is the Gen 1 equivalent of useOrbitProtocol from orbit-companion.
 * Instead of connecting to a WebSocket runtime, it runs the engine locally
 * and subscribes to phone sensor updates.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { ModeManager, Mode } from '../engine/mode-manager'
import { parseIntent, IntentType } from '../engine/intent-parser'
import { buildContext, type OrbitContext } from '../engine/context'
import { explain, statusLine } from '../engine/explainer'
import type { SensorAdapter, SensorSnapshot } from '../sensors/sensor-adapter'
import { MockSensors } from '../sensors/mock-sensors'

export interface OrbitEngineState {
  mode: Mode
  sensors: SensorSnapshot
  context: OrbitContext
  explanation: string
  statusLine: string
  availableModes: Mode[]
}

const DEFAULT_SNAPSHOT: SensorSnapshot = {
  timestamp: Date.now(),
  location: null,
  heading_deg: 0,
  speed_kmh: 0,
  battery_pct: 100,
  camera_active: false,
  motion_state: 'stationary',
}

export function useOrbitEngine() {
  const modeManager = useRef(new ModeManager()).current
  const sensorRef = useRef<SensorAdapter | null>(null)
  const sessionStart = useRef(Date.now()).current

  const [mode, setMode] = useState<Mode>(Mode.SLEEP)
  const [sensors, setSensors] = useState<SensorSnapshot>(DEFAULT_SNAPSHOT)
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  // Derived state
  const context = buildContext(sensors, mode, isOnline, lastCapture, sessionStart)
  const currentExplanation = explain(mode, context)
  const currentStatusLine = statusLine(mode, context)

  // Start sensors on mount
  useEffect(() => {
    // Use MockSensors for development, DeviceSensors for production
    const adapter = new MockSensors()
    sensorRef.current = adapter

    const unsubscribe = adapter.onUpdate((snapshot) => {
      setSensors(snapshot)
    })

    adapter.start()

    return () => {
      unsubscribe()
      adapter.stop()
    }
  }, [])

  // Switch mode
  const switchMode = useCallback((target: Mode, reason?: string): boolean => {
    const success = modeManager.transition(target, reason ?? `User switched to ${target}`)
    if (success) {
      setMode(target)
    }
    return success
  }, [modeManager])

  // Wake up (SLEEP -> AMBIENT)
  const wake = useCallback(() => {
    return switchMode(Mode.AMBIENT, 'User woke Orbit')
  }, [switchMode])

  // Process text command
  const processCommand = useCallback((text: string): { success: boolean; message: string } => {
    const intent = parseIntent(text)

    const MODE_MAP: Partial<Record<IntentType, Mode>> = {
      [IntentType.FOCUS]: Mode.FOCUS,
      [IntentType.GUIDE]: Mode.GUIDE,
      [IntentType.CAPTURE]: Mode.CAPTURE,
      [IntentType.CONVERSE]: Mode.CONVERSE,
      [IntentType.SLEEP]: Mode.SLEEP,
      [IntentType.AMBIENT]: Mode.AMBIENT,
    }

    if (intent.type === IntentType.STATUS) {
      return { success: true, message: currentExplanation }
    }

    if (intent.type === IntentType.SEARCH_MEMORY) {
      return { success: true, message: `Searching memories for: "${intent.params.query ?? text}"` }
    }

    // Efficiency is a sub-mode of Guide — switch to guide and signal efficiency
    if (intent.type === IntentType.EFFICIENCY) {
      const success = switchMode(Mode.GUIDE, `Efficiency: ${text}`)
      return {
        success,
        message: success
          ? 'Opening Efficiency — let me help you plan your day!'
          : `Can't switch to guide from ${mode}`,
      }
    }

    const targetMode = MODE_MAP[intent.type]
    if (targetMode) {
      const success = switchMode(targetMode, `Command: ${text}`)
      return {
        success,
        message: success ? `Switched to ${targetMode}` : `Can't switch to ${targetMode} from ${mode}`,
      }
    }

    if (intent.type === IntentType.UNKNOWN) {
      return { success: false, message: "I didn't understand that. Try: focus, guide, capture, efficiency, sleep." }
    }

    return { success: false, message: `Unhandled intent: ${intent.type}` }
  }, [switchMode, mode, currentExplanation])

  const engineState: OrbitEngineState = {
    mode,
    sensors,
    context,
    explanation: currentExplanation,
    statusLine: currentStatusLine,
    availableModes: modeManager.availableTransitions(),
  }

  return {
    state: engineState,
    switchMode,
    wake,
    processCommand,
    setLastCapture,
    modeHistory: modeManager.history,
  }
}

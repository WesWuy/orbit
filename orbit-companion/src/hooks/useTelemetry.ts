/**
 * Core hook: connects to the Orbit Runtime via Protocol v1 WebSocket.
 *
 * Merges high-frequency telemetry.snapshot (~20Hz) with low-frequency
 * runtime.status (~1Hz) into a single OrbitState for the UI.
 *
 * Exposes:
 *  - state: merged OrbitState
 *  - connected: link health based on heartbeat pong
 *  - safetyEvents: recent safety events for banner display
 *  - sendCommand: send a command and get accepted/rejected result
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { OrbitProtocolClient } from '../lib/ws'
import type {
  TelemetryPayload,
  RuntimeStatusPayload,
  CommandAcceptedPayload,
  CommandRejectedPayload,
  SafetyLowBatteryPayload,
  SafetyEstopPayload,
  ModeChangedPayload,
  RuntimeReadyPayload,
} from '../lib/protocol'
import type { OrbitState, SafetyEvent, CommandResult } from '../lib/types'

const DEFAULT_STATE: OrbitState = {
  mode: 'idle',
  flight_state: 'docked',
  safety_state: 'nominal',
  estop_active: false,
  companion_connected: false,
  explanation: 'Connecting to Orbit Runtime...',
  sim_time: 0,
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  heading_deg: 0,
  altitude_m: 0,
  speed_ms: 0,
  battery_pct: 100,
  target_locked: false,
  target_distance_m: 0,
  dock_distance_m: 0,
}

export function useOrbitProtocol() {
  const [state, setState] = useState<OrbitState>(DEFAULT_STATE)
  const [connected, setConnected] = useState(false)
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([])
  const [runtimeVersion, setRuntimeVersion] = useState<string>('')

  const clientRef = useRef<OrbitProtocolClient | null>(null)

  useEffect(() => {
    const client = new OrbitProtocolClient({
      onTelemetry: (payload: TelemetryPayload) => {
        setState((prev) => ({
          ...prev,
          sim_time: payload.sim_time,
          position: payload.position,
          velocity: payload.velocity,
          heading_deg: payload.heading_deg,
          altitude_m: payload.altitude_m,
          speed_ms: payload.speed_ms,
          battery_pct: payload.battery_pct,
          target_locked: payload.target_locked,
          target_distance_m: payload.target_distance_m,
          dock_distance_m: payload.dock_distance_m,
        }))
      },

      onRuntimeStatus: (payload: RuntimeStatusPayload) => {
        setState((prev) => ({
          ...prev,
          mode: payload.mode,
          flight_state: payload.flight_state,
          safety_state: payload.safety_state,
          estop_active: payload.estop_active,
          companion_connected: payload.companion_connected,
          battery_pct: payload.battery_pct,
          explanation: payload.explanation,
        }))
      },

      onCommandAccepted: (_payload: CommandAcceptedPayload) => {
        // Handled via sendCommand promise resolution
      },

      onCommandRejected: (_payload: CommandRejectedPayload) => {
        // Handled via sendCommand promise resolution
      },

      onSafetyEvent: (type: string, payload: SafetyLowBatteryPayload | SafetyEstopPayload) => {
        const event: SafetyEvent = {
          timestamp: Date.now(),
          type,
          code: payload.code,
          message: payload.message,
        }
        setSafetyEvents((prev) => [...prev.slice(-19), event])
      },

      onModeChanged: (payload: ModeChangedPayload) => {
        setState((prev) => ({ ...prev, mode: payload.to_mode }))
      },

      onRuntimeReady: (payload: RuntimeReadyPayload) => {
        setRuntimeVersion(payload.version)
      },

      onConnectionChange: (isConnected: boolean) => {
        setConnected(isConnected)
      },
    })

    client.connect()
    clientRef.current = client

    return () => client.destroy()
  }, [])

  const sendCommand = useCallback(async (text: string): Promise<CommandResult> => {
    const client = clientRef.current
    if (!client) {
      return { accepted: false, message: 'No client', mode: '', intent: '', code: 'NO_CLIENT' }
    }
    const result = await client.sendCommand(text)
    if (result.accepted) {
      const p = result.payload as CommandAcceptedPayload
      return { accepted: true, message: p.message, mode: p.mode, intent: p.intent, code: '' }
    } else {
      const p = result.payload as CommandRejectedPayload
      return { accepted: false, message: p.message, mode: '', intent: '', code: p.code }
    }
  }, [])

  const clearSafetyEvents = useCallback(() => setSafetyEvents([]), [])

  return { state, connected, safetyEvents, runtimeVersion, sendCommand, clearSafetyEvents }
}

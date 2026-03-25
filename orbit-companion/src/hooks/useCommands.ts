/**
 * Hook for sending commands via the Orbit Protocol and maintaining history.
 *
 * Commands go through the WebSocket protocol (not REST), so they follow the
 * proper path: Companion → Runtime → Safety Supervisor → Vehicle Adapter.
 */

import { useState, useCallback } from 'react'
import type { CommandResult, CommandEntry } from '../lib/types'

// Command text mappings for quick actions
const ACTION_COMMANDS: Record<string, string> = {
  launch: 'launch',
  land: 'land',
  dock: 'dock',
  orbit: 'orbit',
  focus: 'focus',
  guide: 'guide',
  capture: 'capture',
  estop: 'emergency stop',
  resetEstop: 'reset estop',
}

export function useCommands(protocolSendCommand: (text: string) => Promise<CommandResult>) {
  const [history, setHistory] = useState<CommandEntry[]>([])
  const [loading, setLoading] = useState(false)

  const sendCommand = useCallback(async (text: string) => {
    setLoading(true)
    try {
      const result = await protocolSendCommand(text)
      const entry: CommandEntry = { timestamp: Date.now(), text, result }
      setHistory((prev) => [...prev.slice(-49), entry])
      return result
    } finally {
      setLoading(false)
    }
  }, [protocolSendCommand])

  const quickAction = useCallback(async (action: string) => {
    const commandText = ACTION_COMMANDS[action] ?? action
    return sendCommand(commandText)
  }, [sendCommand])

  return { history, sendCommand, quickAction, loading }
}

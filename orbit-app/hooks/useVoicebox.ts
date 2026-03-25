/**
 * useVoicebox — React hook for Merope's voice.
 *
 * Connects to Voicebox on mount, provides speak/stop/toggle,
 * and tracks connection + speaking state reactively.
 *
 * Usage:
 *   const { speak, stop, speaking, connected, enabled, toggle } = useVoicebox()
 *   // After getting AI response:
 *   speak("Hello! I'm Merope.", "chatty")
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  initVoicebox,
  speak as vbSpeak,
  stop as vbStop,
  toggleVoice,
  getVoiceboxState,
  onVoiceboxStateChange,
  destroyVoicebox,
  type VoiceboxState,
} from '../services/voicebox'

export interface UseVoiceboxReturn {
  /** Whether Voicebox server is reachable */
  connected: boolean
  /** Whether Merope is currently speaking */
  speaking: boolean
  /** Whether voice is enabled (user toggle) */
  enabled: boolean
  /** Name of the active voice profile */
  profileName: string | null
  /** Speak text with optional emotion */
  speak: (text: string, emotion?: string) => Promise<void>
  /** Stop current speech */
  stop: () => void
  /** Toggle voice on/off */
  toggle: () => void
}

export function useVoicebox(): UseVoiceboxReturn {
  const [state, setState] = useState<VoiceboxState>(getVoiceboxState)
  const initialized = useRef(false)

  useEffect(() => {
    // Subscribe to state changes
    const unsub = onVoiceboxStateChange(setState)

    // Initialize on first mount
    if (!initialized.current) {
      initialized.current = true
      initVoicebox()
    }

    return () => {
      unsub()
    }
  }, [])

  const speak = useCallback(async (text: string, emotion?: string) => {
    await vbSpeak(text, emotion)
  }, [])

  const stop = useCallback(() => {
    vbStop()
  }, [])

  const toggle = useCallback(() => {
    toggleVoice()
  }, [])

  return {
    connected: state.connected,
    speaking: state.speaking,
    enabled: state.enabled,
    profileName: state.profileName,
    speak,
    stop,
    toggle,
  }
}

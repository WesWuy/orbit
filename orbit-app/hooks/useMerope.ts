/**
 * useMerope — React hook for Merope's personality state.
 *
 * Tracks her emotional state, current expertise, and provides
 * her greeting/transition messages. Wire this into any screen
 * that wants Merope to show up.
 */

import { useState, useCallback, useRef } from 'react'
import { Mode } from '../engine/mode-manager'
import type { OrbitContext } from '../engine/context'
import {
  getMeropeGreeting,
  getMeropeThinking,
  getMeropeEmotion,
  getMeropeTransitionMessage,
  getMeropeSystemPrompt,
  MODE_EXPERTISE,
  type MeropeEmotionalState,
  type ModeExpertise,
} from '../engine/merope'

export interface MeropeState {
  emotion: MeropeEmotionalState
  expertise: ModeExpertise
  greeting: string
  thinkingLabel: string
  systemPrompt: string
  lastMessage: string | null
  isThinking: boolean
}

export function useMerope(mode: Mode, context: OrbitContext) {
  const [isThinking, setIsThinking] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const previousMode = useRef<Mode>(mode)

  const emotion = getMeropeEmotion(mode, isThinking)
  const expertise = MODE_EXPERTISE[mode]
  const greeting = getMeropeGreeting(mode, context)
  const thinkingLabel = getMeropeThinking(mode)
  const systemPrompt = getMeropeSystemPrompt(mode, context)

  // Get transition message when mode changes
  const getTransitionMessage = useCallback((newMode: Mode): string => {
    const msg = getMeropeTransitionMessage(previousMode.current, newMode)
    previousMode.current = newMode
    setLastMessage(msg)
    return msg
  }, [])

  // Mark Merope as thinking (during AI calls)
  const startThinking = useCallback(() => setIsThinking(true), [])
  const stopThinking = useCallback(() => setIsThinking(false), [])

  // Let Merope "say" something
  const say = useCallback((text: string) => {
    setLastMessage(text)
  }, [])

  const state: MeropeState = {
    emotion,
    expertise,
    greeting,
    thinkingLabel,
    systemPrompt,
    lastMessage,
    isThinking,
  }

  return {
    merope: state,
    getTransitionMessage,
    startThinking,
    stopThinking,
    say,
  }
}

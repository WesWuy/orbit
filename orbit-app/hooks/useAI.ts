/**
 * useAI — React hook for the AI client.
 */

import { useRef, useState, useCallback } from 'react'
import { MockAIClient, type AIClient, type VisionResult, type ConversationMessage } from '../services/ai-client'
import type { OrbitContext } from '../engine/context'

export function useAI() {
  const client = useRef<AIClient>(new MockAIClient()).current
  const [analyzing, setAnalyzing] = useState(false)
  const [chatting, setChatting] = useState(false)

  const analyzeImage = useCallback(async (imageBase64: string, context: OrbitContext): Promise<VisionResult> => {
    setAnalyzing(true)
    try {
      return await client.analyzeImage(imageBase64, context)
    } finally {
      setAnalyzing(false)
    }
  }, [client])

  const chat = useCallback(async (messages: ConversationMessage[], context: OrbitContext): Promise<string> => {
    setChatting(true)
    try {
      return await client.chat(messages, context)
    } finally {
      setChatting(false)
    }
  }, [client])

  const describeCapture = useCallback(async (imageBase64: string, context: OrbitContext): Promise<string> => {
    return client.describeCapture(imageBase64, context)
  }, [client])

  return { analyzeImage, chat, describeCapture, analyzing, chatting }
}

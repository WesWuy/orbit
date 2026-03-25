/**
 * useAI — React hook for the AI client.
 *
 * Supports MockAIClient (offline) and MistralAIClient (live).
 * Set MISTRAL_API_KEY in orbit-app/config.ts to enable Mistral.
 */

import { useRef, useState, useCallback } from 'react'
import { MockAIClient, MistralAIClient, type AIClient, type VisionResult, type ConversationMessage } from '../services/ai-client'
import type { OrbitContext } from '../engine/context'
import { AI_CONFIG } from '../config'

function createClient(): AIClient {
  if (AI_CONFIG.mistralApiKey) {
    console.log('[Merope] Using Mistral AI — she can think for real now!')
    return new MistralAIClient(AI_CONFIG.mistralApiKey, {
      chatModel: AI_CONFIG.mistralChatModel,
      visionModel: AI_CONFIG.mistralVisionModel,
    })
  }
  console.log('[Merope] Using Mock AI — add a Mistral API key to config.ts to make her real')
  return new MockAIClient()
}

export function useAI() {
  const clientRef = useRef<AIClient | null>(null)
  if (!clientRef.current) {
    clientRef.current = createClient()
  }
  const client = clientRef.current
  const [analyzing, setAnalyzing] = useState(false)
  const [chatting, setChatting] = useState(false)

  const analyzeImage = useCallback(async (imageBase64: string, context: OrbitContext): Promise<VisionResult> => {
    setAnalyzing(true)
    try {
      return await client.analyzeImage(imageBase64, context)
    } catch (err) {
      console.error('[Merope] Vision error:', err)
      return {
        description: "Oops, I couldn't see clearly. My connection might be spotty. Try again?",
        objects: [{ label: 'error', confidence: 0 }],
      }
    } finally {
      setAnalyzing(false)
    }
  }, [client])

  const chat = useCallback(async (messages: ConversationMessage[], context: OrbitContext): Promise<string> => {
    setChatting(true)
    try {
      return await client.chat(messages, context)
    } catch (err) {
      console.error('[Merope] Chat error:', err)
      return "Sorry, I lost my connection for a second. What were you saying?"
    } finally {
      setChatting(false)
    }
  }, [client])

  const describeCapture = useCallback(async (imageBase64: string, context: OrbitContext): Promise<string> => {
    try {
      return await client.describeCapture(imageBase64, context)
    } catch (err) {
      console.error('[Merope] Capture error:', err)
      return 'A moment captured — description unavailable right now.'
    }
  }, [client])

  return { analyzeImage, chat, describeCapture, analyzing, chatting }
}

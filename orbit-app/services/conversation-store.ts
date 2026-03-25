/**
 * Conversation Store — persist chat history across sessions.
 *
 * Stores conversation messages in AsyncStorage.
 * Merope can reference past conversations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ConversationMessage } from './ai-client'

const STORAGE_KEY = 'orbit_conversations'
const MAX_STORED_MESSAGES = 100 // Keep last 100 messages

export interface StoredConversation {
  messages: ConversationMessage[]
  lastUpdated: number
  mode: string
}

export interface ConversationSummary {
  totalMessages: number
  lastTopic: string | null
  lastUpdated: number
}

/**
 * Load all stored conversations.
 */
export async function loadConversations(): Promise<StoredConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Save a conversation session.
 */
export async function saveConversation(
  messages: ConversationMessage[],
  mode: string
): Promise<void> {
  try {
    const existing = await loadConversations()
    existing.push({
      messages: messages.slice(-MAX_STORED_MESSAGES),
      lastUpdated: Date.now(),
      mode,
    })
    // Keep only last 20 conversation sessions
    const trimmed = existing.slice(-20)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (err) {
    console.warn('[ConversationStore] Save failed:', err)
  }
}

/**
 * Get recent messages for context injection.
 * Returns the last N messages across all sessions.
 */
export async function getRecentContext(count = 10): Promise<ConversationMessage[]> {
  const conversations = await loadConversations()
  const allMessages: ConversationMessage[] = []
  for (const conv of conversations) {
    allMessages.push(...conv.messages)
  }
  return allMessages.slice(-count)
}

/**
 * Get a summary of conversation history for Merope's system prompt.
 */
export async function getConversationSummary(): Promise<ConversationSummary> {
  const conversations = await loadConversations()
  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0)

  // Find last user message as topic hint
  let lastTopic: string | null = null
  for (let i = conversations.length - 1; i >= 0; i--) {
    const msgs = conversations[i].messages
    for (let j = msgs.length - 1; j >= 0; j--) {
      if (msgs[j].role === 'user') {
        lastTopic = msgs[j].content.slice(0, 80)
        break
      }
    }
    if (lastTopic) break
  }

  return {
    totalMessages,
    lastTopic,
    lastUpdated: conversations.length > 0
      ? conversations[conversations.length - 1].lastUpdated
      : 0,
  }
}

/**
 * Clear all stored conversations.
 */
export async function clearConversations(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}

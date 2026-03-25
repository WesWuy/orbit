/**
 * Converse Mode — voice/text conversation with Orbit.
 *
 * Chat with Orbit like a friend. It's context-aware —
 * knows where you are, what time it is, what you've been doing.
 */

import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { useAI } from '../hooks/useAI'
import type { ConversationMessage } from '../services/ai-client'

interface ChatBubble {
  role: 'user' | 'orbit'
  text: string
  timestamp: number
}

export default function ConverseScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const { chat, chatting } = useAI()
  const [input, setInput] = useState('')
  const [bubbles, setBubbles] = useState<ChatBubble[]>([
    {
      role: 'orbit',
      text: getGreeting(state.context.time_of_day),
      timestamp: Date.now(),
    },
  ])
  const scrollRef = useRef<ScrollView>(null)
  const messagesRef = useRef<ConversationMessage[]>([])

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [bubbles.length])

  const handleSend = async () => {
    if (!input.trim() || chatting) return
    const userText = input.trim()
    setInput('')

    // Add user bubble
    setBubbles((prev) => [...prev, { role: 'user', text: userText, timestamp: Date.now() }])

    // Build conversation history for AI
    messagesRef.current.push({ role: 'user', content: userText })

    // Get AI response
    const response = await chat(messagesRef.current, state.context)
    messagesRef.current.push({ role: 'assistant', content: response })

    // Add Orbit bubble
    setBubbles((prev) => [...prev, { role: 'orbit', text: response, timestamp: Date.now() }])
  }

  return (
    <View style={styles.container}>
      <OrbitStatusBar
        mode="Converse"
        modeColor="#ec4899"
        statusLine={state.statusLine}
        onBack={() => router.back()}
      />

      {/* Chat area */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
      >
        {bubbles.map((bubble, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              bubble.role === 'user' ? styles.userBubble : styles.orbitBubble,
            ]}
          >
            {bubble.role === 'orbit' && (
              <Text style={styles.orbitLabel}>Orbit</Text>
            )}
            <Text style={[
              styles.bubbleText,
              bubble.role === 'user' ? styles.userText : styles.orbitText,
            ]}>
              {bubble.text}
            </Text>
            <Text style={styles.bubbleTime}>
              {new Date(bubble.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: false,
              })}
            </Text>
          </View>
        ))}

        {chatting && (
          <View style={[styles.bubble, styles.orbitBubble]}>
            <Text style={styles.orbitLabel}>Orbit</Text>
            <Text style={styles.thinkingText}>thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Context chip */}
      <View style={styles.contextBar}>
        <Text style={styles.contextText}>
          📍 {state.sensors.location
            ? `${state.sensors.location.lat.toFixed(3)}, ${state.sensors.location.lng.toFixed(3)}`
            : '---'}
          {'  ·  '}{state.context.motion_state}
          {'  ·  '}{state.context.time_of_day}
        </Text>
      </View>

      {/* Input */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          placeholder="Talk to Orbit..."
          placeholderTextColor="#4b5563"
          returnKeyType="send"
          editable={!chatting}
        />
        <TouchableOpacity
          style={[styles.sendBtn, chatting && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={chatting || !input.trim()}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function getGreeting(timeOfDay: string): string {
  switch (timeOfDay) {
    case 'morning': return "Good morning! ☀️ What are we up to today?"
    case 'afternoon': return "Hey! How's the afternoon going? Anything I can help with?"
    case 'evening': return "Good evening! 🌅 How was your day? Want to explore or just chat?"
    case 'night': return "Night owl mode! 🦉 What's on your mind?"
    default: return "Hey there! Ready when you are."
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, gap: 10, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  orbitBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 4,
  },
  orbitLabel: {
    color: '#ec4899',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  orbitText: { color: '#e5e7eb' },
  bubbleTime: { color: '#ffffff40', fontSize: 10, marginTop: 4, textAlign: 'right' },
  thinkingText: { color: '#9ca3af', fontSize: 13, fontStyle: 'italic' },
  contextBar: {
    borderTopWidth: 1,
    borderTopColor: '#1f293740',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  contextText: { color: '#374151', fontSize: 10, textAlign: 'center' },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f293740',
  },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#e5e7eb',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#4b5563' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
})

/**
 * Converse Mode — talk to Merope.
 *
 * Chat with Merope like a friend. She's context-aware —
 * knows where you are, what time it is, what you've been doing.
 * Cosmic glassmorphism aesthetic.
 */

import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Image } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { useOrbitEngine } from '../hooks/useOrbitEngine'

const MEROPE_HEADSHOT = require('../assets/merope-headshot.png')
import { useAI } from '../hooks/useAI'
import { useMerope } from '../hooks/useMerope'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE, getMeropeEmotion } from '../engine/merope'
import type { ConversationMessage } from '../services/ai-client'
import { playTone } from '../services/sound-engine'
import { tapLight, notifySuccess } from '../services/haptics'
import { saveConversation, getRecentContext } from '../services/conversation-store'
import { useVoicebox } from '../hooks/useVoicebox'

const CONVERSE_COLOR = MODE_EXPERTISE[Mode.CONVERSE].color

interface ChatBubble {
  role: 'user' | 'merope'
  text: string
  timestamp: number
}

export default function ConverseScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const { chat, chatting } = useAI()
  const { merope } = useMerope(Mode.CONVERSE, state.context)
  const voicebox = useVoicebox()
  const [input, setInput] = useState('')
  const [bubbles, setBubbles] = useState<ChatBubble[]>([
    {
      role: 'merope',
      text: merope.greeting,
      timestamp: Date.now(),
    },
  ])
  const scrollRef = useRef<ScrollView>(null)
  const messagesRef = useRef<ConversationMessage[]>([])

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [bubbles.length])

  // Load recent conversation context on mount
  useEffect(() => {
    (async () => {
      const recent = await getRecentContext(6)
      if (recent.length > 0) {
        messagesRef.current = [...recent]
      }
    })()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || chatting) return
    const userText = input.trim()
    setInput('')
    playTone('send')
    tapLight()

    setBubbles((prev) => [...prev, { role: 'user', text: userText, timestamp: Date.now() }])
    messagesRef.current.push({ role: 'user', content: userText })

    const response = await chat(messagesRef.current, state.context)
    messagesRef.current.push({ role: 'assistant', content: response })

    setBubbles((prev) => [...prev, { role: 'merope', text: response, timestamp: Date.now() }])
    playTone('meropeReply')
    notifySuccess()
    voicebox.speak(response, 'chatty')

    // Persist conversation
    saveConversation(messagesRef.current, Mode.CONVERSE)
  }

  return (
    <Starfield modeColor={CONVERSE_COLOR} starCount={20}>
      <View style={styles.container}>
        <OrbitStatusBar
          mode="Converse"
          modeColor={CONVERSE_COLOR}
          statusLine={state.statusLine}
          onBack={() => router.back()}
        />

        {/* Voice indicator */}
        {voicebox.connected && (
          <TouchableOpacity
            onPress={voicebox.toggle}
            style={styles.voiceBar}
            activeOpacity={0.7}
          >
            <Text style={styles.voiceBarIcon}>
              {voicebox.speaking ? '🔊' : voicebox.enabled ? '🔈' : '🔇'}
            </Text>
            <Text style={[styles.voiceBarText, { color: voicebox.enabled ? CONVERSE_COLOR + '80' : '#ffffff30' }]}>
              {voicebox.speaking
                ? 'Merope is speaking...'
                : voicebox.enabled
                ? `Voice: ${voicebox.profileName ?? 'Active'}`
                : 'Voice off'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Chat area */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {bubbles.map((bubble, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                bubble.role === 'user' ? styles.userBubble : styles.meropeBubble,
                bubble.role === 'user'
                  ? { backgroundColor: CONVERSE_COLOR }
                  : {},
              ]}
            >
              {bubble.role === 'merope' && (
                <View style={styles.meropeHeader}>
                  <Image source={MEROPE_HEADSHOT} style={styles.meropeChatAvatar} />
                  <Text style={[styles.meropeLabel, { color: CONVERSE_COLOR }]}>Merope</Text>
                </View>
              )}
              <Text style={[
                styles.bubbleText,
                bubble.role === 'user' ? styles.userText : styles.meropeText,
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
            <View style={[styles.bubble, styles.meropeBubble]}>
              <View style={styles.meropeHeader}>
                <Image source={MEROPE_HEADSHOT} style={[styles.meropeChatAvatar, { opacity: 0.6 }]} />
                <Text style={[styles.meropeLabel, { color: CONVERSE_COLOR }]}>Merope</Text>
              </View>
              <Text style={[styles.thinkingText, { color: CONVERSE_COLOR + '80' }]}>{merope.thinkingLabel}</Text>
            </View>
          )}
        </ScrollView>

        {/* Context chip */}
        <GlassCard intensity="light" style={styles.contextBar}>
          <Text style={styles.contextText}>
            {state.sensors.location
              ? `${state.sensors.location.lat.toFixed(3)}, ${state.sensors.location.lng.toFixed(3)}`
              : '---'}
            {'  ·  '}{state.context.motion_state}
            {'  ·  '}{state.context.time_of_day}
          </Text>
        </GlassCard>

        {/* Input */}
        <View style={styles.inputArea}>
          <TextInput
            style={[styles.input, { borderColor: CONVERSE_COLOR + '25' }]}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            placeholder="Talk to Merope..."
            placeholderTextColor="#4b556340"
            returnKeyType="send"
            editable={!chatting}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: CONVERSE_COLOR },
              (chatting || !input.trim()) && { opacity: 0.4 },
            ]}
            onPress={handleSend}
            disabled={chatting || !input.trim()}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomRightRadius: 4,
  },
  meropeBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  meropeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  meropeChatAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  meropeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  meropeText: { color: '#d1d5db' },
  bubbleTime: { color: '#ffffff25', fontSize: 10, marginTop: 4, textAlign: 'right' },
  thinkingText: { fontSize: 13, fontStyle: 'italic' },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  voiceBarIcon: { fontSize: 12 },
  voiceBarText: { fontSize: 10, letterSpacing: 0.5 },
  contextBar: {
    marginHorizontal: 12,
    marginBottom: 4,
    padding: 6,
    borderRadius: 12,
  },
  contextText: { color: '#ffffff30', fontSize: 10, textAlign: 'center', letterSpacing: 0.5 },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    color: '#e5e7eb',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
})

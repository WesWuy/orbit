/**
 * QuickChat — inline chat bar for the home screen.
 *
 * Talk to Merope without leaving the home screen.
 * Shows her latest response in a floating glass bubble.
 */

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing, Image } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { GlassCard } from './GlassCard'

const MEROPE_HEADSHOT = require('../assets/merope-headshot.png')

interface QuickChatProps {
  modeColor: string
  onSend: (text: string) => void
  latestResponse: string | null
  isThinking: boolean
  thinkingLabel: string
}

export function QuickChat({ modeColor, onSend, latestResponse, isThinking, thinkingLabel }: QuickChatProps) {
  const [input, setInput] = useState('')
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (latestResponse || isThinking) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start()
    }
  }, [latestResponse, isThinking, fadeAnim])

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <View style={styles.container}>
      {/* Response bubble */}
      {(latestResponse || isThinking) && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <GlassCard glowColor={modeColor} intensity="light" style={styles.responseBubble}>
            <View style={styles.responseHeader}>
              <Image source={MEROPE_HEADSHOT} style={styles.avatar} />
              <Text style={[styles.responseName, { color: modeColor }]}>Merope</Text>
            </View>
            <Text style={styles.responseText}>
              {isThinking ? thinkingLabel : latestResponse}
            </Text>
          </GlassCard>
        </Animated.View>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { borderColor: modeColor + '30' }]}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          placeholder="Ask Merope anything..."
          placeholderTextColor="#4b556380"
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: modeColor }]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  responseBubble: {
    padding: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  responseName: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  responseText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
})

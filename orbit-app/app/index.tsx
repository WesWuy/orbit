/**
 * Orbit Gen 1 — Home Screen.
 *
 * Merope floats in a cosmic starfield. Modes orbit around her.
 * Quick chat lets you talk without leaving. Sensors hide in a drawer.
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated, Easing, Image } from 'react-native'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { useMerope } from '../hooks/useMerope'
import { useAI } from '../hooks/useAI'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE, getMeropeEmotion } from '../engine/merope'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { FloatingMerope } from '../components/FloatingMerope'
import { ModeRing } from '../components/ModeRing'
import { QuickChat } from '../components/QuickChat'
import { ModeTransition } from '../components/ModeTransition'
import { playTone, playModeChime, playWakeSequence } from '../services/sound-engine'
import { tapMedium, tapLight, notifySuccess, selectionTick } from '../services/haptics'
import { getTopSuggestion, type Suggestion } from '../services/proactive-suggestions'
import { saveConversation, getRecentContext } from '../services/conversation-store'

const MODE_ROUTES: Partial<Record<Mode, string>> = {
  [Mode.FOCUS]: '/focus',
  [Mode.GUIDE]: '/guide',
  [Mode.CAPTURE]: '/capture',
  [Mode.CONVERSE]: '/converse',
}

const MEROPE_BRANDED = require('../assets/merope-branded.png')

export default function HomeScreen() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const splashAnim = useRef(new Animated.Value(1)).current
  const { state, switchMode, wake, processCommand } = useOrbitEngine()

  // Check onboarding + splash
  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem('orbit_onboarding_complete')
        if (!done) {
          router.replace('/onboarding')
          return
        }
      } catch {}
      // Splash fade out
      setTimeout(() => {
        Animated.timing(splashAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start(() => setReady(true))
      }, 1200)
    })()
  }, [router, splashAnim])
  const { merope, getTransitionMessage } = useMerope(state.mode, state.context)
  const { chat, chatting } = useAI()
  const [showSensors, setShowSensors] = useState(false)
  const [chatResponse, setChatResponse] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const sensorAnim = useRef(new Animated.Value(0)).current

  const modeColor = MODE_EXPERTISE[state.mode].color
  const meropeEmotion = getMeropeEmotion(state.mode, chatting)
  const loc = state.sensors.location
  const contextRef = useRef(state.context)
  contextRef.current = state.context

  // Proactive suggestions — check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestion(getTopSuggestion(state.context, state.mode))
    }, 30000)
    // Initial check after 3 seconds (let the app settle)
    const initial = setTimeout(() => {
      setSuggestion(getTopSuggestion(state.context, state.mode))
    }, 3000)
    return () => { clearInterval(interval); clearTimeout(initial) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode])

  const handleModeSelect = useCallback((m: Mode) => {
    playModeChime()
    tapMedium()

    if (state.mode === Mode.SLEEP && m !== Mode.AMBIENT) {
      wake()
      playWakeSequence()
      setTimeout(() => {
        switchMode(m)
        const route = MODE_ROUTES[m]
        if (route) router.push(route as any)
      }, 100)
      return
    }
    getTransitionMessage(m)
    switchMode(m)
    const route = MODE_ROUTES[m]
    if (route) router.push(route as any)
  }, [state.mode, switchMode, wake, router, getTransitionMessage])

  const handleQuickChat = useCallback(async (text: string) => {
    playTone('send')
    tapLight()

    if (state.mode === Mode.SLEEP) {
      wake()
      playWakeSequence()
    }

    const result = processCommand(text)
    if (result.success) {
      setChatResponse(result.message)
      playTone('meropePing')
      notifySuccess()
      return
    }

    // Include recent conversation context
    const recentCtx = await getRecentContext(5)
    const messages = [
      ...recentCtx,
      { role: 'user' as const, content: text },
    ]

    const response = await chat(messages, contextRef.current)
    setChatResponse(response)
    playTone('meropeReply')
    notifySuccess()

    // Persist conversation
    saveConversation(
      [{ role: 'user', content: text }, { role: 'assistant', content: response }],
      state.mode
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode, wake, processCommand, chat])

  const handleWake = useCallback(() => {
    wake()
    playWakeSequence()
    tapMedium()
  }, [wake])

  const toggleSensors = () => {
    selectionTick()
    const toValue = showSensors ? 0 : 1
    Animated.timing(sensorAnim, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
    setShowSensors(!showSensors)
  }

  const sensorHeight = sensorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  })

  // Splash screen
  if (!ready) {
    return (
      <Starfield modeColor="#3b82f6" starCount={40}>
        <Animated.View style={[styles.splash, { opacity: splashAnim }]}>
          <Image source={MEROPE_BRANDED} style={styles.splashImage} resizeMode="contain" />
          <Text style={styles.splashTitle}>ORBIT</Text>
          <Text style={styles.splashSub}>Gen 1</Text>
          <Text style={styles.splashTag}>Merope is waking up...</Text>
        </Animated.View>
      </Starfield>
    )
  }

  return (
    <Starfield modeColor={modeColor}>
      {/* Mode transition overlay */}
      <ModeTransition fromMode={null} toMode={state.mode} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.dot, { backgroundColor: modeColor }]} />
            <Text style={styles.title}>Orbit</Text>
            <Text style={styles.gen}>1</Text>
          </View>
          <TouchableOpacity onPress={toggleSensors}>
            <Text style={[styles.statusText, { color: modeColor + '90' }]}>{state.statusLine}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Merope */}
          <View style={styles.meropeSection}>
            <FloatingMerope
              modeColor={modeColor}
              size="hero"
              isThinking={chatting}
              emotion={meropeEmotion}
            />
            <Text style={[styles.meropeName, { color: modeColor }]}>MEROPE</Text>
            <Text style={styles.meropeRole}>{merope.expertise.role}</Text>
          </View>

          {/* Speech */}
          <GlassCard glowColor={modeColor} intensity="light" style={styles.speechCard}>
            <Text style={styles.speechText}>{state.explanation}</Text>
          </GlassCard>

          {/* Mode Ring or Wake Button */}
          {state.mode === Mode.SLEEP ? (
            <TouchableOpacity
              style={[styles.wakeBtn, { borderColor: modeColor + '40' }]}
              onPress={handleWake}
              activeOpacity={0.7}
            >
              <Text style={styles.wakeIcon}>✦</Text>
              <Text style={[styles.wakeText, { color: '#e5e7eb' }]}>Wake Merope</Text>
              <Text style={styles.wakeHint}>tap to begin</Text>
            </TouchableOpacity>
          ) : (
            <ModeRing
              currentMode={state.mode}
              availableModes={state.availableModes}
              onModeSelect={handleModeSelect}
            />
          )}

          {/* Proactive Suggestion */}
          {suggestion && state.mode !== Mode.SLEEP && (
            <TouchableOpacity
              onPress={() => {
                if (suggestion.suggestedMode) handleModeSelect(suggestion.suggestedMode)
                setSuggestion(null)
              }}
              activeOpacity={0.8}
            >
              <GlassCard glowColor={modeColor} intensity="light" style={styles.suggestionCard}>
                <View style={styles.suggestionRow}>
                  <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </View>
                <Text style={[styles.suggestionAction, { color: modeColor }]}>
                  {suggestion.suggestedMode ? `Switch to ${suggestion.suggestedMode} →` : 'Got it'}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          )}

          {/* Quick Chat */}
          <QuickChat
            modeColor={modeColor}
            onSend={handleQuickChat}
            latestResponse={chatResponse}
            isThinking={chatting}
            thinkingLabel={merope.thinkingLabel}
          />

          {/* Sensor Drawer */}
          <TouchableOpacity onPress={toggleSensors} activeOpacity={0.8}>
            <GlassCard intensity="light" style={styles.sensorToggle}>
              <Text style={styles.sensorToggleText}>
                {showSensors ? '▾ SENSORS' : '▸ SENSORS'}
              </Text>
              <Text style={styles.sensorQuick}>
                {loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : '---'}
                {'  ·  '}{state.sensors.speed_kmh.toFixed(1)} km/h
                {'  ·  '}{state.sensors.battery_pct.toFixed(0)}%
              </Text>
            </GlassCard>
          </TouchableOpacity>

          <Animated.View style={{ height: sensorHeight, overflow: 'hidden' }}>
            <GlassCard intensity="light" style={styles.sensorGrid}>
              <View style={styles.sensorRow}>
                <Stat label="LAT" value={loc ? loc.lat.toFixed(4) : '---'} />
                <Stat label="LNG" value={loc ? loc.lng.toFixed(4) : '---'} />
                <Stat label="ALT" value={loc ? `${loc.alt.toFixed(0)}m` : '---'} />
              </View>
              <View style={styles.sensorRow}>
                <Stat label="HDG" value={`${state.sensors.heading_deg.toFixed(0)}°`} />
                <Stat label="SPEED" value={`${state.sensors.speed_kmh.toFixed(1)} km/h`} />
                <Stat label="BAT" value={`${state.sensors.battery_pct.toFixed(0)}%`} warn={state.sensors.battery_pct < 20} />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footer}>ORBIT v0.2.0 — Merope is with you</Text>
        </ScrollView>
      </View>
    </Starfield>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, warn && { color: '#f59e0b' }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e5e7eb',
    letterSpacing: 1,
  },
  gen: {
    fontSize: 9,
    color: '#ffffff30',
    fontWeight: '700',
    letterSpacing: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  meropeSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  meropeName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 5,
    marginTop: 4,
  },
  meropeRole: {
    fontSize: 11,
    color: '#ffffff50',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  speechCard: {
    padding: 14,
  },
  speechText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  wakeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 8,
  },
  wakeIcon: {
    fontSize: 28,
    color: '#e5e7eb',
  },
  wakeText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  wakeHint: {
    fontSize: 11,
    color: '#ffffff30',
    letterSpacing: 1,
  },
  sensorToggle: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sensorToggleText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff40',
    letterSpacing: 2,
  },
  sensorQuick: {
    fontSize: 10,
    color: '#ffffff30',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  sensorGrid: {
    padding: 12,
    marginTop: 4,
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 8,
    color: '#ffffff30',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff80',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  footer: {
    textAlign: 'center',
    fontSize: 9,
    color: '#ffffff15',
    letterSpacing: 1,
    marginTop: 8,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashImage: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e5e7eb',
    letterSpacing: 6,
  },
  splashSub: {
    fontSize: 11,
    color: '#ffffff30',
    letterSpacing: 3,
    fontWeight: '600',
  },
  splashTag: {
    fontSize: 12,
    color: '#3b82f680',
    fontStyle: 'italic',
    marginTop: 16,
  },
  suggestionCard: {
    padding: 12,
    gap: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  suggestionIcon: {
    fontSize: 16,
  },
  suggestionText: {
    flex: 1,
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 19,
  },
  suggestionAction: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
})

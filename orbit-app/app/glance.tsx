/**
 * Glance — minimal ambient status screen.
 *
 * Designed for quick peeks without full app engagement.
 * Shows Merope's glow, current mode, one-line status,
 * and latest suggestion. Apple Watch complication energy.
 */

import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { useMerope } from '../hooks/useMerope'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE, getMeropeEmotion } from '../engine/merope'
import { Starfield } from '../components/Starfield'
import { FloatingMerope } from '../components/FloatingMerope'
import { GlassCard } from '../components/GlassCard'
import { getTopSuggestion, type Suggestion } from '../services/proactive-suggestions'

export default function GlanceScreen() {
  const router = useRouter()
  const { state, wake } = useOrbitEngine()
  const { merope } = useMerope(state.mode, state.context)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const pulseAnim = useRef(new Animated.Value(0.5)).current

  const modeColor = MODE_EXPERTISE[state.mode].color
  const expertise = MODE_EXPERTISE[state.mode]
  const emotion = getMeropeEmotion(state.mode, false)
  const loc = state.sensors.location

  // Ambient pulse for the time display
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  // Suggestions
  useEffect(() => {
    setSuggestion(getTopSuggestion(state.context, state.mode))
  }, [state.context, state.mode])

  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <Starfield modeColor={modeColor} starCount={15}>
      <TouchableOpacity
        style={styles.container}
        onPress={() => router.replace('/')}
        activeOpacity={0.9}
      >
        {/* Time */}
        <Animated.Text style={[styles.time, { opacity: pulseAnim }]}>
          {timeStr}
        </Animated.Text>

        {/* Merope */}
        <FloatingMerope
          modeColor={modeColor}
          size="medium"
          emotion={emotion}
        />

        {/* Mode */}
        <View style={styles.modeRow}>
          <Text style={styles.modeIcon}>{expertise.icon}</Text>
          <Text style={[styles.modeName, { color: modeColor }]}>{expertise.role}</Text>
        </View>

        {/* Status line */}
        <Text style={styles.status}>{state.statusLine}</Text>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {loc && (
            <Text style={styles.stat}>
              {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
            </Text>
          )}
          <Text style={[styles.stat, { color: modeColor + '60' }]}>
            {state.sensors.speed_kmh.toFixed(0)} km/h
          </Text>
          <Text style={[
            styles.stat,
            state.sensors.battery_pct < 20 && { color: '#f59e0b' },
          ]}>
            {state.sensors.battery_pct.toFixed(0)}%
          </Text>
        </View>

        {/* Suggestion */}
        {suggestion && (
          <GlassCard intensity="light" glowColor={modeColor} style={styles.suggestionCard}>
            <Text style={styles.suggestionText}>
              {suggestion.icon} {suggestion.text}
            </Text>
          </GlassCard>
        )}

        {/* Tap hint */}
        <Text style={styles.hint}>tap anywhere to open Orbit</Text>
      </TouchableOpacity>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    paddingTop: Platform.OS === 'web' ? 30 : 60,
  },
  time: {
    fontSize: 48,
    fontWeight: '200',
    color: '#ffffff80',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeIcon: {
    fontSize: 16,
  },
  modeName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  status: {
    fontSize: 11,
    color: '#ffffff30',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  stat: {
    fontSize: 11,
    color: '#ffffff25',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  suggestionCard: {
    padding: 10,
    marginTop: 8,
    maxWidth: 300,
  },
  suggestionText: {
    color: '#ffffff60',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  hint: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 40,
    fontSize: 10,
    color: '#ffffff15',
    letterSpacing: 1,
  },
})

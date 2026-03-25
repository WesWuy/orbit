/**
 * Merope Avatar — animated glowing star that IS Orbit's face.
 *
 * A luminous orb that shifts color, pulse speed, and glow intensity
 * based on Merope's current emotional state and mode.
 * Orbital rings spin around her when she's active.
 *
 * She's the shyest star in the Pleiades — small but always there.
 */

import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native'
import { useEffect, useRef, useMemo } from 'react'
import type { MeropeEmotionalState, AvatarVisuals } from '../engine/merope'
import { EMOTION_VISUALS, MODE_EXPERTISE } from '../engine/merope'
import type { Mode } from '../engine/mode-manager'

interface MeropeAvatarProps {
  emotion: MeropeEmotionalState
  mode: Mode
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
  showRole?: boolean
}

const SIZE_MAP = {
  small: 40,
  medium: 64,
  large: 96,
}

export function MeropeAvatar({
  emotion,
  mode,
  size = 'medium',
  showLabel = false,
  showRole = false,
}: MeropeAvatarProps) {
  const visuals = EMOTION_VISUALS[emotion]
  const expertise = MODE_EXPERTISE[mode]
  const baseSize = SIZE_MAP[size]
  const scaledSize = baseSize * visuals.size

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current
  const ringRotation = useRef(new Animated.Value(0)).current

  const pulseDuration = visuals.pulseSpeed === 'fast' ? 800 :
                        visuals.pulseSpeed === 'medium' ? 1500 : 2500

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1 + visuals.glowIntensity * 0.15,
          duration: pulseDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: pulseDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseDuration, visuals.glowIntensity, pulseAnim])

  // Ring rotation
  useEffect(() => {
    if (visuals.rings === 0) return
    const spin = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    spin.start()
    return () => spin.stop()
  }, [visuals.rings, ringRotation])

  const ringRotationDeg = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const ringData = useMemo(() => {
    return Array.from({ length: visuals.rings }, (_, i) => ({
      key: i,
      size: scaledSize + 16 + i * 14,
      opacity: 0.3 - i * 0.08,
      borderWidth: 1.5 - i * 0.3,
    }))
  }, [visuals.rings, scaledSize])

  return (
    <View style={[styles.container, { width: scaledSize + 60, height: scaledSize + 60 + (showLabel ? 40 : 0) + (showRole ? 18 : 0) }]}>
      {/* Orbital rings */}
      {ringData.map((ring) => (
        <Animated.View
          key={ring.key}
          style={[
            styles.ring,
            {
              width: ring.size,
              height: ring.size,
              borderRadius: ring.size / 2,
              borderColor: visuals.glowColor,
              borderWidth: Math.max(ring.borderWidth, 0.5),
              opacity: Math.max(ring.opacity, 0.1),
              transform: [
                { rotate: ringRotationDeg },
                { rotateX: `${60 + ring.key * 15}deg` },
              ],
            },
          ]}
        />
      ))}

      {/* Glow layer */}
      <View
        style={[
          styles.glow,
          {
            width: scaledSize * 1.6,
            height: scaledSize * 1.6,
            borderRadius: scaledSize * 0.8,
            backgroundColor: visuals.glowColor,
            opacity: visuals.glowIntensity * 0.15,
          },
        ]}
      />

      {/* Core orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: scaledSize,
            height: scaledSize,
            borderRadius: scaledSize / 2,
            backgroundColor: visuals.glowColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Inner bright spot */}
        <View
          style={[
            styles.innerGlow,
            {
              width: scaledSize * 0.5,
              height: scaledSize * 0.5,
              borderRadius: scaledSize * 0.25,
              backgroundColor: '#ffffff',
              opacity: 0.3 + visuals.glowIntensity * 0.3,
            },
          ]}
        />
      </Animated.View>

      {/* Name label */}
      {showLabel && (
        <Text style={[styles.label, { color: visuals.glowColor }]}>
          MEROPE
        </Text>
      )}

      {/* Role label */}
      {showRole && (
        <Text style={styles.role}>
          {expertise.role}
        </Text>
      )}
    </View>
  )
}

// ── Compact inline avatar (for status bars and chat bubbles) ──

interface MeropeInlineProps {
  emotion: MeropeEmotionalState
  size?: number
}

export function MeropeInline({ emotion, size = 20 }: MeropeInlineProps) {
  const visuals = EMOTION_VISUALS[emotion]

  return (
    <View style={[styles.inline, { width: size, height: size }]}>
      <View
        style={[
          styles.inlineDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: visuals.glowColor,
          },
        ]}
      />
      <View
        style={[
          styles.inlineInner,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: '#ffffff',
            opacity: 0.4 + visuals.glowIntensity * 0.3,
          },
        ]}
      />
    </View>
  )
}

// ── Speech bubble (for Merope's quick messages) ──

interface MeropeSpeechProps {
  emotion: MeropeEmotionalState
  mode: Mode
  text: string
}

export function MeropeSpeech({ emotion, mode, text }: MeropeSpeechProps) {
  const visuals = EMOTION_VISUALS[emotion]

  return (
    <View style={styles.speechContainer}>
      <MeropeInline emotion={emotion} size={24} />
      <View style={[styles.speechBubble, { borderColor: visuals.glowColor + '40' }]}>
        <Text style={styles.speechName}>Merope</Text>
        <Text style={styles.speechText}>{text}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  glow: {
    position: 'absolute',
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(100, 150, 255, 0.3)',
      } as any,
    }),
  },
  innerGlow: {},
  label: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  role: {
    marginTop: 2,
    fontSize: 10,
    color: '#6b7280',
    letterSpacing: 1,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineDot: {},
  inlineInner: {
    position: 'absolute',
  },
  speechContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  speechName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ec4899',
    letterSpacing: 1,
    marginBottom: 4,
  },
  speechText: {
    fontSize: 13,
    color: '#d1d5db',
    lineHeight: 19,
  },
})

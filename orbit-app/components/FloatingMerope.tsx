/**
 * FloatingMerope — Merope's image with emotion-reactive visuals.
 *
 * She bobs up and down slowly, with a pulsing glow behind her.
 * Visual behavior changes based on emotional state:
 * - Calm: slow bob, gentle glow
 * - Excited: faster bob, sparkle particles, brighter glow
 * - Sleepy: barely moves, dim glow, slight tilt
 * - Curious: wider bob, pulsing glow
 * - Thinking: orbiting dots, fast pulse
 */

import { View, Image, StyleSheet, Animated, Easing, Platform } from 'react-native'
import { useEffect, useRef, useMemo } from 'react'
import type { MeropeEmotionalState } from '../engine/merope'
import { EMOTION_VISUALS } from '../engine/merope'

const MEROPE_FLOATING = require('../assets/merope-floating.png')
const MEROPE_HEADSHOT = require('../assets/merope-headshot.png')

interface FloatingMeropeProps {
  modeColor: string
  size?: 'small' | 'medium' | 'large' | 'hero'
  variant?: 'floating' | 'headshot'
  isThinking?: boolean
  emotion?: MeropeEmotionalState
}

const SIZE_CONFIG = {
  small: { width: 60, height: 80, glow: 50 },
  medium: { width: 120, height: 160, glow: 90 },
  large: { width: 180, height: 240, glow: 130 },
  hero: { width: 240, height: 320, glow: 180 },
}

// Emotion-specific animation parameters
const EMOTION_ANIM = {
  calm:      { bobAmount: -6,  bobDuration: 3500, glowHigh: 0.18, glowLow: 0.10, glowSpeed: 2500 },
  alert:     { bobAmount: -10, bobDuration: 2000, glowHigh: 0.30, glowLow: 0.15, glowSpeed: 1200 },
  curious:   { bobAmount: -12, bobDuration: 2500, glowHigh: 0.28, glowLow: 0.12, glowSpeed: 1500 },
  excited:   { bobAmount: -14, bobDuration: 1800, glowHigh: 0.40, glowLow: 0.15, glowSpeed: 800 },
  guiding:   { bobAmount: -8,  bobDuration: 2800, glowHigh: 0.25, glowLow: 0.12, glowSpeed: 1800 },
  nostalgic: { bobAmount: -5,  bobDuration: 4000, glowHigh: 0.20, glowLow: 0.10, glowSpeed: 3000 },
  chatty:    { bobAmount: -9,  bobDuration: 2200, glowHigh: 0.25, glowLow: 0.12, glowSpeed: 1400 },
  sleepy:    { bobAmount: -3,  bobDuration: 5000, glowHigh: 0.10, glowLow: 0.04, glowSpeed: 4000 },
  thinking:  { bobAmount: -6,  bobDuration: 2000, glowHigh: 0.35, glowLow: 0.10, glowSpeed: 600 },
}

// Generate sparkle particles for excited/curious states
interface Sparkle { id: number; angle: number; distance: number; size: number; delay: number }

function generateSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * 360,
    distance: 0.7 + Math.random() * 0.4,
    size: 2 + Math.random() * 2,
    delay: Math.random() * 2,
  }))
}

export function FloatingMerope({
  modeColor,
  size = 'large',
  variant = 'floating',
  isThinking = false,
  emotion = 'calm',
}: FloatingMeropeProps) {
  const config = SIZE_CONFIG[size]
  const effectiveEmotion = isThinking ? 'thinking' : emotion
  const animParams = EMOTION_ANIM[effectiveEmotion]
  const visuals = EMOTION_VISUALS[effectiveEmotion]

  const floatAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(animParams.glowLow)).current
  const thinkingAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(visuals.size)).current

  const sparkles = useMemo(() => generateSparkles(6), [])

  // Scale transition when emotion changes
  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: visuals.size,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start()
  }, [visuals.size, scaleAnim])

  // Floating bob — speed and amplitude change with emotion
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: animParams.bobAmount,
          duration: animParams.bobDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: animParams.bobDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    )
    float.start()
    return () => float.stop()
  }, [floatAnim, animParams.bobAmount, animParams.bobDuration])

  // Glow pulse — intensity and speed change with emotion
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: animParams.glowHigh,
          duration: animParams.glowSpeed,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: animParams.glowLow,
          duration: animParams.glowSpeed,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [glowAnim, animParams.glowHigh, animParams.glowLow, animParams.glowSpeed])

  // Thinking rotation
  useEffect(() => {
    if (!isThinking) return
    const spin = Animated.loop(
      Animated.timing(thinkingAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    )
    spin.start()
    return () => spin.stop()
  }, [thinkingAnim, isThinking])

  const image = variant === 'headshot' ? MEROPE_HEADSHOT : MEROPE_FLOATING
  const glowColor = visuals.glowColor
  const showSparkles = effectiveEmotion === 'excited' || effectiveEmotion === 'curious' || effectiveEmotion === 'alert'

  return (
    <View style={[styles.container, { width: config.width + 40, height: config.height + 40 }]}>
      {/* Primary glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: config.glow,
            height: config.glow,
            borderRadius: config.glow / 2,
            backgroundColor: glowColor,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Secondary glow ring */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: config.glow * 1.6,
            height: config.glow * 1.6,
            borderRadius: config.glow * 0.8,
            backgroundColor: glowColor,
            opacity: Animated.multiply(glowAnim, 0.3),
          },
        ]}
      />

      {/* Sparkle particles (excited/curious/alert) */}
      {showSparkles && Platform.OS === 'web' && sparkles.map((s) => {
        const rad = (s.angle * Math.PI) / 180
        const dist = config.glow * s.distance
        return (
          <View
            key={s.id}
            style={[
              styles.sparkle,
              {
                width: s.size,
                height: s.size,
                borderRadius: s.size / 2,
                backgroundColor: glowColor,
                left: (config.width + 40) / 2 + Math.cos(rad) * dist - s.size / 2,
                top: (config.height + 40) / 2 + Math.sin(rad) * dist - s.size / 2,
                // CSS animation for web
                animation: `twinkle ${1 + s.delay}s ease-in-out infinite`,
                animationDelay: `${s.delay}s`,
                '--star-opacity': 0.8,
              } as any,
            ]}
          />
        )
      })}

      {/* Merope image with scale and float */}
      <Animated.View style={{
        transform: [
          { translateY: floatAnim },
          { scale: scaleAnim },
        ],
      }}>
        <Image
          source={image}
          style={{
            width: config.width,
            height: config.height,
            // Sleepy tilt
            ...(effectiveEmotion === 'sleepy' ? { transform: [{ rotate: '-3deg' }] } : {}),
          }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Thinking dots orbit */}
      {isThinking && (
        <Animated.View
          style={[
            styles.thinkingRing,
            {
              width: config.glow + 20,
              height: config.glow + 20,
              transform: [{
                rotate: thinkingAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              }],
            },
          ]}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.thinkingDot,
                {
                  backgroundColor: glowColor,
                  top: i === 0 ? 0 : undefined,
                  bottom: i === 1 ? 0 : undefined,
                  left: i === 2 ? 0 : undefined,
                  right: i === 0 ? 0 : undefined,
                  alignSelf: i === 1 ? 'flex-end' : i === 2 ? 'flex-start' : undefined,
                },
              ]}
            />
          ))}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  sparkle: {
    position: 'absolute',
    opacity: 0.6,
  },
  thinkingRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})

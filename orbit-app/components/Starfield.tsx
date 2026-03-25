/**
 * Starfield — animated cosmic background.
 *
 * Layers of drifting stars at different speeds create depth.
 * Color-tinted to match the current mode. Stars twinkle.
 * Uses CSS animations on web for GPU-accelerated performance.
 */

import { View, StyleSheet, Platform } from 'react-native'
import { useMemo } from 'react'
import { LinearGradient } from 'expo-linear-gradient'

interface StarfieldProps {
  modeColor?: string
  starCount?: number
  children?: React.ReactNode
}

interface Star {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  speed: number
}

function generateStars(count: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.8,
      speed: 2 + Math.random() * 4, // seconds
    })
  }
  return stars
}

// Inject CSS keyframes once on web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes twinkle {
      0%, 100% { opacity: var(--star-opacity); }
      50% { opacity: calc(var(--star-opacity) * 0.3); }
    }
  `
  document.head.appendChild(style)
}

export function Starfield({ modeColor = '#3b82f6', starCount = 60, children }: StarfieldProps) {
  const stars = useMemo(() => generateStars(starCount), [starCount])
  const tintColor = modeColor + '15'

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020510', '#0a0e17', '#080c18', '#020510']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Mode color nebula */}
      <View style={[styles.nebula, styles.nebulaTop, { backgroundColor: tintColor }]} />
      <View style={[styles.nebula, styles.nebulaBottom, { backgroundColor: modeColor + '0a' }]} />

      {/* Stars — pure CSS animation on web, static on native */}
      {stars.map((star) => (
        <View
          key={star.id}
          style={[
            {
              position: 'absolute',
              left: `${star.x}%` as any,
              top: `${star.y}%` as any,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#fff',
              opacity: star.opacity,
            },
            Platform.OS === 'web' ? {
              // @ts-ignore — CSS custom property + animation
              '--star-opacity': star.opacity,
              animation: `twinkle ${star.speed}s ease-in-out infinite`,
              animationDelay: `${Math.random() * star.speed}s`,
            } as any : {},
          ]}
        />
      ))}

      {/* Content */}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  nebula: {
    position: 'absolute',
    borderRadius: 999,
  },
  nebulaTop: {
    top: -100,
    right: -50,
    width: 300,
    height: 300,
  },
  nebulaBottom: {
    bottom: -80,
    left: -60,
    width: 250,
    height: 250,
  },
})

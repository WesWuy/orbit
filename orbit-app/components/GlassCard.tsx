/**
 * GlassCard — frosted glassmorphism card.
 *
 * Semi-transparent with subtle border glow.
 * Floats over the starfield background.
 */

import { View, StyleSheet, Platform } from 'react-native'
import type { ViewStyle } from 'react-native'

interface GlassCardProps {
  children: React.ReactNode
  glowColor?: string
  intensity?: 'light' | 'medium' | 'strong'
  style?: ViewStyle
}

const INTENSITY_MAP = {
  light: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)' },
  medium: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' },
  strong: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)' },
}

export function GlassCard({ children, glowColor, intensity = 'medium', style }: GlassCardProps) {
  const { bg, border } = INTENSITY_MAP[intensity]

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: glowColor ? glowColor + '25' : border,
          ...(Platform.OS === 'web' ? {
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          } as any : {}),
        },
        style,
      ]}
    >
      {/* Top highlight line */}
      <View style={[styles.highlight, { backgroundColor: glowColor ? glowColor + '15' : 'rgba(255,255,255,0.05)' }]} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
  },
})

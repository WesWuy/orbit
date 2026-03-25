/**
 * ModeRing — radial mode selector.
 *
 * Modes orbit around Merope like planets around a star.
 * Active mode glows brighter. Tapping a mode triggers transition.
 */

import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native'
import { useEffect, useRef } from 'react'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE } from '../engine/merope'

interface ModeRingProps {
  currentMode: Mode
  availableModes: Mode[]
  onModeSelect: (mode: Mode) => void
}

const ALL_MODES: Mode[] = [
  Mode.FOCUS,
  Mode.GUIDE,
  Mode.CAPTURE,
  Mode.CONVERSE,
  Mode.AMBIENT,
  Mode.SLEEP,
]

export function ModeRing({ currentMode, availableModes, onModeSelect }: ModeRingProps) {
  const ringRotation = useRef(new Animated.Value(0)).current

  // Slow ambient rotation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 60000, // Full rotation in 60s — very slow
        easing: Easing.linear,
        useNativeDriver: false,
      })
    )
    spin.start()
    return () => spin.stop()
  }, [ringRotation])

  return (
    <View style={styles.container}>
      {/* Ring track */}
      <View style={styles.ringTrack} />

      {/* Mode nodes */}
      {ALL_MODES.map((mode, index) => {
        const expertise = MODE_EXPERTISE[mode]
        const isActive = currentMode === mode
        const isAvailable = availableModes.includes(mode)
        const angle = (index / ALL_MODES.length) * 360 - 90 // Start from top
        const rad = (angle * Math.PI) / 180
        const radius = 110

        return (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeNode,
              {
                left: 140 + Math.cos(rad) * radius - 28,
                top: 140 + Math.sin(rad) * radius - 28,
              },
              isActive && { borderColor: expertise.color, backgroundColor: expertise.color + '20' },
              !isAvailable && { opacity: 0.3 },
            ]}
            onPress={() => isAvailable && onModeSelect(mode)}
            disabled={!isAvailable}
            activeOpacity={0.7}
          >
            <Text style={styles.modeIcon}>{expertise.icon}</Text>
            <Text
              style={[
                styles.modeLabel,
                isActive && { color: expertise.color },
              ]}
              numberOfLines={1}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>

            {/* Active glow */}
            {isActive && (
              <View style={[styles.activeGlow, { backgroundColor: expertise.color }]} />
            )}
          </TouchableOpacity>
        )
      })}

      {/* Center label */}
      <View style={styles.centerLabel}>
        <Text style={[styles.centerMode, { color: MODE_EXPERTISE[currentMode].color }]}>
          {MODE_EXPERTISE[currentMode].icon}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: 280,
    alignSelf: 'center',
    position: 'relative',
  },
  ringTrack: {
    position: 'absolute',
    top: 30,
    left: 30,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  modeNode: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modeIcon: {
    fontSize: 18,
  },
  modeLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  activeGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.1,
  },
  centerLabel: {
    position: 'absolute',
    top: 120,
    left: 120,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMode: {
    fontSize: 24,
  },
})

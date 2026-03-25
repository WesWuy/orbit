/**
 * Orbit Status Bar — cosmic header for mode screens.
 *
 * Glassmorphism bar with mode glow, floating back arrow.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface Props {
  mode: string
  modeColor: string
  statusLine: string
  onBack: () => void
}

export function OrbitStatusBar({ mode, modeColor, statusLine, onBack }: Props) {
  return (
    <View style={[styles.container, { borderBottomColor: modeColor + '20' }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={[styles.backText, { color: modeColor + '90' }]}>←</Text>
      </TouchableOpacity>
      <View style={styles.center}>
        <View style={[styles.dot, { backgroundColor: modeColor, shadowColor: modeColor }]} />
        <Text style={[styles.mode, { color: modeColor }]}>{mode.toUpperCase()}</Text>
      </View>
      <Text style={[styles.status, { color: modeColor + '60' }]}>{statusLine}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    fontSize: 18,
    fontWeight: '300',
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mode: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  status: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
})

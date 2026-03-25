/**
 * Orbit Status Bar — compact header for mode screens.
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
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.center}>
        <View style={[styles.dot, { backgroundColor: modeColor }]} />
        <Text style={[styles.mode, { color: modeColor }]}>{mode.toUpperCase()}</Text>
      </View>
      <Text style={styles.status}>{statusLine}</Text>
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
    borderBottomColor: '#1f293740',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    color: '#6b7280',
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  status: {
    fontSize: 11,
    color: '#6b7280',
  },
})

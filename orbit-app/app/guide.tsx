/**
 * Guide Mode — spatial navigation with AR arrow.
 *
 * Tell Orbit where you want to go. It guides you with a compass arrow
 * and distance countdown. On mobile, adds spatial audio pings.
 */

import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { LocationTracker, type GuideState } from '../services/location-tracker'
import { relativeBearing } from '../lib/geo-utils'

export default function GuideScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const tracker = useRef(new LocationTracker()).current
  const [guideState, setGuideState] = useState<GuideState>({
    destination: null, distanceM: 0, bearingDeg: 0, arrived: false,
  })
  const [destInput, setDestInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Update guide state when sensors change
  useEffect(() => {
    const loc = state.sensors.location
    if (loc && tracker.destination) {
      setGuideState(tracker.getGuideState(loc.lat, loc.lng))
    }
  }, [state.sensors, tracker])

  const handleSetDestination = () => {
    if (!destInput.trim()) return
    const dest = tracker.resolveDestination(destInput.trim())
    if (dest) {
      tracker.setDestination(dest)
      setError(null)
      setDestInput('')
      // Immediately compute guide state
      const loc = state.sensors.location
      if (loc) {
        setGuideState(tracker.getGuideState(loc.lat, loc.lng))
      }
    } else {
      setError(`I don't know where "${destInput}" is yet. Try: parliament, market, gallery, canal, park`)
    }
  }

  const handleClear = () => {
    tracker.clearDestination()
    setGuideState({ destination: null, distanceM: 0, bearingDeg: 0, arrived: false })
  }

  // Arrow rotation: relative bearing from user heading to target
  const relBearing = guideState.destination
    ? relativeBearing(state.sensors.heading_deg, guideState.bearingDeg)
    : 0

  const formatDistance = (m: number): string => {
    if (m < 1000) return `${Math.round(m)}m`
    return `${(m / 1000).toFixed(1)}km`
  }

  return (
    <View style={styles.container}>
      <OrbitStatusBar
        mode="Guide"
        modeColor="#10b981"
        statusLine={state.statusLine}
        onBack={() => router.back()}
      />

      {!guideState.destination ? (
        /* Destination input */
        <View style={styles.inputArea}>
          <Text style={styles.prompt}>Where do you want to go?</Text>
          <Text style={styles.subPrompt}>
            Try: parliament, byward market, national gallery, rideau canal, park
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={destInput}
              onChangeText={setDestInput}
              onSubmitEditing={handleSetDestination}
              placeholder="e.g. guide me to the market"
              placeholderTextColor="#4b5563"
              returnKeyType="go"
            />
            <TouchableOpacity style={styles.goBtn} onPress={handleSetDestination}>
              <Text style={styles.goBtnText}>Go</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      ) : guideState.arrived ? (
        /* Arrived! */
        <View style={styles.arrivedArea}>
          <Text style={styles.arrivedIcon}>🎉</Text>
          <Text style={styles.arrivedText}>You've arrived!</Text>
          <Text style={styles.arrivedDest}>{guideState.destination.name}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleClear}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Navigation view */
        <View style={styles.navArea}>
          {/* Destination name */}
          <Text style={styles.destName}>{guideState.destination.name}</Text>
          <Text style={styles.destDistance}>{formatDistance(guideState.distanceM)}</Text>

          {/* Compass arrow */}
          <View style={styles.compassContainer}>
            <View style={styles.compassRing}>
              <View
                style={[
                  styles.arrow,
                  { transform: [{ rotate: `${relBearing}deg` }] },
                ]}
              >
                <Text style={styles.arrowText}>▲</Text>
              </View>
            </View>
            <Text style={styles.compassLabel}>
              {Math.abs(relBearing) < 15
                ? 'Straight ahead!'
                : relBearing > 0
                ? `Turn right ${Math.round(relBearing)}°`
                : `Turn left ${Math.round(Math.abs(relBearing))}°`}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>BEARING</Text>
              <Text style={styles.statValue}>{guideState.bearingDeg.toFixed(0)}°</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>HEADING</Text>
              <Text style={styles.statValue}>{state.sensors.heading_deg.toFixed(0)}°</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>SPEED</Text>
              <Text style={styles.statValue}>{state.sensors.speed_kmh.toFixed(1)} km/h</Text>
            </View>
          </View>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClear}>
            <Text style={styles.cancelBtnText}>Cancel Navigation</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  inputArea: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  prompt: { color: '#e5e7eb', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subPrompt: { color: '#6b7280', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#e5e7eb',
  },
  goBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  goBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { color: '#ef4444', fontSize: 12, textAlign: 'center' },
  navArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  destName: { color: '#10b981', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  destDistance: { color: '#e5e7eb', fontSize: 48, fontWeight: '800' },
  compassContainer: { alignItems: 'center', gap: 12 },
  compassRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#10b98140',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: { color: '#10b981', fontSize: 36 },
  compassLabel: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  statLabel: { color: '#6b7280', fontSize: 9, letterSpacing: 1.5, marginBottom: 2 },
  statValue: { color: '#e5e7eb', fontSize: 16, fontWeight: '600' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  cancelBtnText: { color: '#6b7280', fontSize: 13 },
  arrivedArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  arrivedIcon: { fontSize: 64 },
  arrivedText: { color: '#10b981', fontSize: 28, fontWeight: '800' },
  arrivedDest: { color: '#9ca3af', fontSize: 16 },
  doneBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

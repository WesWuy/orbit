/**
 * Guide Mode — Merope as Navigation Expert.
 *
 * Tell Merope where you want to go. She guides you with a compass arrow
 * and distance countdown. Cosmic glassmorphism aesthetic.
 */

import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { FloatingMerope } from '../components/FloatingMerope'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { useMerope } from '../hooks/useMerope'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE, getMeropeEmotion } from '../engine/merope'
import { playTone } from '../services/sound-engine'
import { tapLight, tapMedium, notifySuccess } from '../services/haptics'
import { LocationTracker, type GuideState } from '../services/location-tracker'
import { relativeBearing } from '../lib/geo-utils'

const GUIDE_COLOR = MODE_EXPERTISE[Mode.GUIDE].color

export default function GuideScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const { merope } = useMerope(Mode.GUIDE, state.context)
  const tracker = useRef(new LocationTracker()).current
  const [guideState, setGuideState] = useState<GuideState>({
    destination: null, distanceM: 0, bearingDeg: 0, arrived: false,
  })
  const [destInput, setDestInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loc = state.sensors.location
    if (loc && tracker.destination) {
      setGuideState(tracker.getGuideState(loc.lat, loc.lng))
    }
  }, [state.sensors, tracker])

  const meropeEmotion = getMeropeEmotion(Mode.GUIDE, false)

  const handleSetDestination = () => {
    if (!destInput.trim()) return
    const dest = tracker.resolveDestination(destInput.trim())
    if (dest) {
      tracker.setDestination(dest)
      setError(null)
      setDestInput('')
      playTone('navigate')
      tapMedium()
      const loc = state.sensors.location
      if (loc) setGuideState(tracker.getGuideState(loc.lat, loc.lng))
    } else {
      setError(`Merope doesn't know "${destInput}" yet. Try: parliament, market, gallery, canal, park`)
    }
  }

  const handleClear = () => {
    tracker.clearDestination()
    setGuideState({ destination: null, distanceM: 0, bearingDeg: 0, arrived: false })
  }

  const relBearing = guideState.destination
    ? relativeBearing(state.sensors.heading_deg, guideState.bearingDeg)
    : 0

  const formatDistance = (m: number): string => {
    if (m < 1000) return `${Math.round(m)}m`
    return `${(m / 1000).toFixed(1)}km`
  }

  return (
    <Starfield modeColor={GUIDE_COLOR} starCount={30}>
      <View style={styles.container}>
        <OrbitStatusBar
          mode="Guide"
          modeColor={GUIDE_COLOR}
          statusLine={state.statusLine}
          onBack={() => router.back()}
        />

        {!guideState.destination ? (
          /* Destination input + Efficiency link */
          <View style={styles.inputArea}>
            <FloatingMerope modeColor={GUIDE_COLOR} size="medium" emotion={meropeEmotion} />
            <Text style={[styles.prompt, { color: GUIDE_COLOR }]}>Where are we going?</Text>
            <Text style={styles.subPrompt}>
              parliament · byward market · national gallery · rideau canal · park
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { borderColor: GUIDE_COLOR + '30' }]}
                value={destInput}
                onChangeText={setDestInput}
                onSubmitEditing={handleSetDestination}
                placeholder="e.g. guide me to the market"
                placeholderTextColor="#4b556350"
                returnKeyType="go"
              />
              <TouchableOpacity style={[styles.goBtn, { backgroundColor: GUIDE_COLOR }]} onPress={handleSetDestination}>
                <Text style={styles.goBtnText}>→</Text>
              </TouchableOpacity>
            </View>

            {error && (
              <GlassCard intensity="light" style={styles.errorCard}>
                <Text style={styles.error}>{error}</Text>
              </GlassCard>
            )}

            {/* Efficiency — navigate your day */}
            <TouchableOpacity
              style={styles.efficiencyBtn}
              onPress={() => {
                playTone('navigate')
                tapMedium()
                router.push('/efficiency' as any)
              }}
              activeOpacity={0.7}
            >
              <GlassCard glowColor="#0ea5e9" intensity="medium" style={styles.efficiencyCard}>
                <View style={styles.efficiencyRow}>
                  <Text style={styles.efficiencyIcon}>⚡</Text>
                  <View style={styles.efficiencyInfo}>
                    <Text style={styles.efficiencyTitle}>Efficiency</Text>
                    <Text style={styles.efficiencyDesc}>Navigate your day — schedule, habits, routines</Text>
                  </View>
                  <Text style={styles.efficiencyArrow}>→</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        ) : guideState.arrived ? (
          /* Arrived! */
          <View style={styles.arrivedArea}>
            <FloatingMerope modeColor={GUIDE_COLOR} size="large" emotion="excited" />
            <Text style={[styles.arrivedText, { color: GUIDE_COLOR }]}>We made it!</Text>
            <Text style={styles.arrivedDest}>{guideState.destination.name}</Text>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: GUIDE_COLOR }]} onPress={handleClear}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Navigation view */
          <View style={styles.navArea}>
            <GlassCard glowColor={GUIDE_COLOR} intensity="light" style={styles.destCard}>
              <Text style={[styles.destName, { color: GUIDE_COLOR }]}>{guideState.destination.name}</Text>
              <Text style={styles.destDistance}>{formatDistance(guideState.distanceM)}</Text>
            </GlassCard>

            {/* Compass arrow */}
            <View style={styles.compassContainer}>
              <View style={[styles.compassRing, { borderColor: GUIDE_COLOR + '30' }]}>
                <View style={[styles.compassInner, { borderColor: GUIDE_COLOR + '15' }]} />
                <View style={[styles.arrow, { transform: [{ rotate: `${relBearing}deg` }] }]}>
                  <Text style={[styles.arrowText, { color: GUIDE_COLOR }]}>▲</Text>
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
            <GlassCard intensity="light" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>BEARING</Text>
                  <Text style={[styles.statValue, { color: GUIDE_COLOR + 'cc' }]}>{guideState.bearingDeg.toFixed(0)}°</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>HEADING</Text>
                  <Text style={[styles.statValue, { color: GUIDE_COLOR + 'cc' }]}>{state.sensors.heading_deg.toFixed(0)}°</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>SPEED</Text>
                  <Text style={[styles.statValue, { color: GUIDE_COLOR + 'cc' }]}>{state.sensors.speed_kmh.toFixed(1)} km/h</Text>
                </View>
              </View>
            </GlassCard>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: GUIDE_COLOR + '30' }]} onPress={handleClear}>
              <Text style={[styles.cancelBtnText, { color: GUIDE_COLOR + '80' }]}>Cancel Navigation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  inputArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  prompt: { fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  subPrompt: { color: '#ffffff40', fontSize: 12, textAlign: 'center', letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', gap: 8, width: '100%' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 14,
    color: '#e5e7eb',
  },
  goBtn: {
    width: 50,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  errorCard: { padding: 10 },
  error: { color: '#f59e0b', fontSize: 12, textAlign: 'center' },
  navArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  destCard: {
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  destName: { fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  destDistance: { color: '#e5e7eb', fontSize: 44, fontWeight: '800' },
  compassContainer: { alignItems: 'center', gap: 12 },
  compassRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
  },
  arrow: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: { fontSize: 36 },
  compassLabel: { color: '#ffffff60', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  statsCard: {
    padding: 12,
    width: '100%',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statLabel: { color: '#ffffff30', fontSize: 8, letterSpacing: 1.5, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '600', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  cancelBtnText: { fontSize: 12, letterSpacing: 0.5 },
  arrivedArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  efficiencyBtn: { width: '100%', marginTop: 8 },
  efficiencyCard: { padding: 14 },
  efficiencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  efficiencyIcon: { fontSize: 24 },
  efficiencyInfo: { flex: 1, gap: 2 },
  efficiencyTitle: { fontSize: 15, fontWeight: '700', color: '#0ea5e9', letterSpacing: 1 },
  efficiencyDesc: { fontSize: 11, color: '#ffffff50' },
  efficiencyArrow: { fontSize: 18, color: '#0ea5e980' },
  arrivedText: { fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  arrivedDest: { color: '#ffffff60', fontSize: 16, letterSpacing: 1 },
  doneBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

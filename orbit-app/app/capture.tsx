/**
 * Capture Mode — "Remember this"
 *
 * Merope as Memory Keeper — saves photos, locations, and AI descriptions.
 * Shows recent memories and lets you search them.
 * Cosmic glassmorphism aesthetic.
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { FloatingMerope } from '../components/FloatingMerope'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { useMemories } from '../hooks/useMemories'
import { useAI } from '../hooks/useAI'
import { useMerope } from '../hooks/useMerope'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE, getMeropeEmotion } from '../engine/merope'
import { playTone } from '../services/sound-engine'
import { tapMedium, notifySuccess } from '../services/haptics'

const CAPTURE_COLOR = MODE_EXPERTISE[Mode.CAPTURE].color

export default function CaptureScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const { memories, count, save, search, refresh } = useMemories()
  const { describeCapture } = useAI()
  const { merope } = useMerope(Mode.CAPTURE, state.context)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<typeof memories | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [refresh])

  const meropeEmotion = getMeropeEmotion(Mode.CAPTURE, saving)

  const handleCapture = async () => {
    playTone('capture')
    tapMedium()
    setSaving(true)
    try {
      const description = await describeCapture('mock-photo', state.context)
      const loc = state.sensors.location

      await save({
        timestamp: Date.now(),
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        alt: loc?.alt ?? null,
        heading_deg: state.sensors.heading_deg,
        photo_uri: null,
        description,
        mode: 'capture',
      })

      setLastSaved(description)
      playTone('meropeReply')
      notifySuccess()
      setTimeout(() => setLastSaved(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    const results = await search(searchQuery.trim())
    setSearchResults(results)
  }

  const displayMemories = searchResults ?? memories

  return (
    <Starfield modeColor={CAPTURE_COLOR} starCount={25}>
      <View style={styles.container}>
        <OrbitStatusBar
          mode="Capture"
          modeColor={CAPTURE_COLOR}
          statusLine={state.statusLine}
          onBack={() => router.back()}
        />

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          {/* Merope + Capture button */}
          <View style={styles.heroSection}>
            <FloatingMerope modeColor={CAPTURE_COLOR} size="small" isThinking={saving} emotion={meropeEmotion} />
          </View>

          <TouchableOpacity
            style={[
              styles.captureBtn,
              { backgroundColor: CAPTURE_COLOR },
              saving && { opacity: 0.7 },
            ]}
            onPress={handleCapture}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.captureBtnIcon}>✦</Text>
            <Text style={styles.captureBtnText}>
              {saving ? 'Merope is remembering...' : 'Remember This'}
            </Text>
          </TouchableOpacity>

          {/* Save confirmation */}
          {lastSaved && (
            <GlassCard glowColor={CAPTURE_COLOR} intensity="medium" style={styles.savedCard}>
              <Text style={[styles.savedLabel, { color: CAPTURE_COLOR }]}>Saved!</Text>
              <Text style={styles.savedText}>{lastSaved}</Text>
            </GlassCard>
          )}

          {/* Location info */}
          {state.sensors.location && (
            <GlassCard intensity="light" style={styles.locationCard}>
              <Text style={styles.locationLabel}>CURRENT LOCATION</Text>
              <Text style={styles.locationCoords}>
                {state.sensors.location.lat.toFixed(4)}, {state.sensors.location.lng.toFixed(4)}
                {'  ·  '}{state.sensors.heading_deg.toFixed(0)}° heading
              </Text>
            </GlassCard>
          )}

          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, { borderColor: CAPTURE_COLOR + '25' }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholder="Search memories..."
              placeholderTextColor="#4b556340"
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.searchBtn, { borderColor: CAPTURE_COLOR + '25' }]}
              onPress={handleSearch}
            >
              <Text style={styles.searchBtnText}>⌕</Text>
            </TouchableOpacity>
          </View>

          {/* Memories list */}
          <View style={styles.memoriesHeader}>
            <Text style={styles.sectionTitle}>MEMORIES</Text>
            <View style={[styles.countBadge, { backgroundColor: CAPTURE_COLOR + '20' }]}>
              <Text style={[styles.countText, { color: CAPTURE_COLOR }]}>{count}</Text>
            </View>
          </View>

          {displayMemories.length === 0 && (
            <Text style={styles.emptyText}>
              {searchResults ? 'No memories match your search' : 'No memories yet — tap "Remember This" to start'}
            </Text>
          )}

          {displayMemories.map((memory) => (
            <GlassCard key={memory.id} intensity="light" style={styles.memoryCard}>
              <View style={styles.memoryHeader}>
                <Text style={[styles.memoryTime, { color: CAPTURE_COLOR + '90' }]}>
                  {new Date(memory.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                {memory.lat != null && (
                  <Text style={styles.memoryCoords}>
                    {memory.lat.toFixed(3)}, {memory.lng?.toFixed(3)}
                  </Text>
                )}
              </View>
              <Text style={styles.memoryDescription}>{memory.description}</Text>
            </GlassCard>
          ))}
        </ScrollView>
      </View>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 12, paddingBottom: 40 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  captureBtn: {
    borderRadius: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  captureBtnIcon: { color: '#0a0e17', fontSize: 16 },
  captureBtnText: { color: '#0a0e17', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  savedCard: { padding: 12 },
  savedLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  savedText: { color: '#d1d5db', fontSize: 13, lineHeight: 19 },
  locationCard: { padding: 10 },
  locationLabel: { color: '#ffffff30', fontSize: 8, letterSpacing: 2, marginBottom: 4 },
  locationCoords: {
    color: '#ffffff50',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: '#e5e7eb',
  },
  searchBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchBtnText: { fontSize: 18, color: '#ffffff60' },
  memoriesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 9, fontWeight: '600', color: '#ffffff40', letterSpacing: 2 },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countText: { fontSize: 10, fontWeight: '700' },
  emptyText: { color: '#ffffff30', fontSize: 12, fontStyle: 'italic' },
  memoryCard: { padding: 12 },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  memoryTime: { fontSize: 11 },
  memoryCoords: { color: '#ffffff30', fontSize: 10, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  memoryDescription: { color: '#d1d5db', fontSize: 13, lineHeight: 19 },
})

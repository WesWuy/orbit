/**
 * Capture Mode — "Remember this"
 *
 * Saves a photo + location + AI description to the memory store.
 * Shows recent memories and lets you search them.
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { useMemories } from '../hooks/useMemories'
import { useAI } from '../hooks/useAI'

export default function CaptureScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const { memories, count, save, search, refresh } = useMemories()
  const { describeCapture } = useAI()
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<typeof memories | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCapture = async () => {
    setSaving(true)
    try {
      // Get AI description (mock in dev)
      const description = await describeCapture('mock-photo', state.context)
      const loc = state.sensors.location

      await save({
        timestamp: Date.now(),
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        alt: loc?.alt ?? null,
        heading_deg: state.sensors.heading_deg,
        photo_uri: null, // Would be real photo URI on device
        description,
        mode: 'capture',
      })

      setLastSaved(description)
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
    <View style={styles.container}>
      <OrbitStatusBar
        mode="Capture"
        modeColor="#f59e0b"
        statusLine={state.statusLine}
        onBack={() => router.back()}
      />

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Capture button */}
        <TouchableOpacity
          style={[styles.captureBtn, saving && styles.captureBtnSaving]}
          onPress={handleCapture}
          disabled={saving}
        >
          <Text style={styles.captureBtnIcon}>{saving ? '⏳' : '📸'}</Text>
          <Text style={styles.captureBtnText}>
            {saving ? 'Saving memory...' : 'Remember This Moment'}
          </Text>
        </TouchableOpacity>

        {/* Success toast */}
        {lastSaved && (
          <View style={styles.toast}>
            <Text style={styles.toastIcon}>✓</Text>
            <Text style={styles.toastText} numberOfLines={2}>{lastSaved}</Text>
          </View>
        )}

        {/* Location info */}
        {state.sensors.location && (
          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>📍 Current Location</Text>
            <Text style={styles.locationCoords}>
              {state.sensors.location.lat.toFixed(4)}, {state.sensors.location.lng.toFixed(4)}
              {'  ·  '}{state.sensors.heading_deg.toFixed(0)}° heading
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholder="Search memories..."
            placeholderTextColor="#4b5563"
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>🔎</Text>
          </TouchableOpacity>
        </View>

        {/* Memories list */}
        <View style={styles.memoriesHeader}>
          <Text style={styles.sectionTitle}>MEMORIES</Text>
          <Text style={styles.countBadge}>{count}</Text>
        </View>

        {displayMemories.length === 0 && (
          <Text style={styles.emptyText}>
            {searchResults ? 'No memories match your search' : 'No memories yet — tap "Remember This" to start'}
          </Text>
        )}

        {displayMemories.map((memory) => (
          <View key={memory.id} style={styles.memoryCard}>
            <View style={styles.memoryHeader}>
              <Text style={styles.memoryTime}>
                {new Date(memory.timestamp).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              {memory.lat != null && (
                <Text style={styles.memoryCoords}>
                  📍 {memory.lat.toFixed(3)}, {memory.lng?.toFixed(3)}
                </Text>
              )}
            </View>
            <Text style={styles.memoryDescription}>{memory.description}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 12, paddingBottom: 40 },
  captureBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  captureBtnSaving: { backgroundColor: '#b45309' },
  captureBtnIcon: { fontSize: 24 },
  captureBtnText: { color: '#0a0e17', fontSize: 17, fontWeight: '800' },
  toast: {
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b98140',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastIcon: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  toastText: { color: '#10b981', fontSize: 13, flex: 1 },
  locationCard: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f293740',
  },
  locationLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
  locationCoords: { color: '#6b7280', fontSize: 11, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#e5e7eb',
  },
  searchBtn: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchBtnText: { fontSize: 18 },
  memoriesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '600', color: '#6b7280', letterSpacing: 2 },
  countBadge: {
    backgroundColor: '#f59e0b20',
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyText: { color: '#4b5563', fontSize: 13, fontStyle: 'italic' },
  memoryCard: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f293740',
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  memoryTime: { color: '#6b7280', fontSize: 11 },
  memoryCoords: { color: '#4b5563', fontSize: 10 },
  memoryDescription: { color: '#d1d5db', fontSize: 13, lineHeight: 19 },
})

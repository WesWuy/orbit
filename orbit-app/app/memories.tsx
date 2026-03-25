/**
 * Memories Gallery — browse and search all captured memories.
 * Cosmic glassmorphism aesthetic.
 */

import { View, Text, StyleSheet, ScrollView, TextInput, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { useMemories } from '../hooks/useMemories'

const MEMORIES_COLOR = '#f59e0b'

export default function MemoriesScreen() {
  const router = useRouter()
  const { memories, count, search, refresh } = useMemories()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<typeof memories | null>(null)

  useEffect(() => { refresh() }, [refresh])

  const handleSearch = async () => {
    if (!query.trim()) { setResults(null); return }
    const r = await search(query.trim())
    setResults(r)
  }

  const display = results ?? memories

  return (
    <Starfield modeColor={MEMORIES_COLOR} starCount={20}>
      <View style={styles.container}>
        <OrbitStatusBar
          mode="Memories"
          modeColor={MEMORIES_COLOR}
          statusLine={`${count} memories`}
          onBack={() => router.back()}
        />

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { borderColor: MEMORIES_COLOR + '25' }]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Search your memories..."
            placeholderTextColor="#4b556340"
            returnKeyType="search"
          />
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {display.length === 0 && (
            <Text style={styles.empty}>
              {results ? 'No matches found' : 'No memories yet — use Capture mode to save moments'}
            </Text>
          )}
          {display.map((m) => (
            <GlassCard key={m.id} intensity="light" style={styles.card}>
              <Text style={[styles.time, { color: MEMORIES_COLOR + '90' }]}>
                {new Date(m.timestamp).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              <Text style={styles.desc}>{m.description}</Text>
              {m.lat != null && (
                <Text style={styles.loc}>
                  {m.lat.toFixed(4)}, {m.lng?.toFixed(4)}
                </Text>
              )}
            </GlassCard>
          ))}
        </ScrollView>
      </View>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'web' ? 20 : 50 },
  searchRow: { padding: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    color: '#e5e7eb',
  },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8, paddingBottom: 40 },
  empty: { color: '#ffffff30', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  card: { padding: 14 },
  time: { fontSize: 11, marginBottom: 4 },
  desc: { color: '#d1d5db', fontSize: 13, lineHeight: 19 },
  loc: { color: '#ffffff30', fontSize: 10, marginTop: 6, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
})

/**
 * Memories Gallery — browse and search all captured memories.
 */

import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { useMemories } from '../hooks/useMemories'

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
    <View style={styles.container}>
      <OrbitStatusBar
        mode="Memories"
        modeColor="#f59e0b"
        statusLine={`${count} memories`}
        onBack={() => router.back()}
      />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          placeholder="Search your memories..."
          placeholderTextColor="#4b5563"
          returnKeyType="search"
        />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {display.length === 0 && (
          <Text style={styles.empty}>
            {results ? 'No matches found' : 'No memories yet — use Capture mode to save moments'}
          </Text>
        )}
        {display.map((m) => (
          <View key={m.id} style={styles.card}>
            <Text style={styles.time}>
              {new Date(m.timestamp).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            <Text style={styles.desc}>{m.description}</Text>
            {m.lat != null && (
              <Text style={styles.loc}>📍 {m.lat.toFixed(4)}, {m.lng?.toFixed(4)}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e17', paddingTop: Platform.OS === 'web' ? 20 : 50 },
  searchRow: { padding: 12 },
  input: {
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#e5e7eb',
  },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8, paddingBottom: 40 },
  empty: { color: '#4b5563', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#111827', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#1f293740',
  },
  time: { color: '#6b7280', fontSize: 11, marginBottom: 4 },
  desc: { color: '#d1d5db', fontSize: 13, lineHeight: 19 },
  loc: { color: '#4b5563', fontSize: 10, marginTop: 6 },
})

/**
 * Focus Mode — "What am I looking at?"
 *
 * Camera view with AI vision overlay. Point at anything,
 * tap the button, and Orbit tells you about it.
 */

import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { useAI } from '../hooks/useAI'
import { useOrbitEngine } from '../hooks/useOrbitEngine'

export default function FocusScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const { analyzeImage, analyzing } = useAI()
  const [result, setResult] = useState<{ description: string; objects: { label: string }[] } | null>(null)

  const handleAnalyze = async () => {
    // In production, this captures a real camera frame
    // For now, use mock AI which returns sample descriptions
    const vision = await analyzeImage('mock-frame', state.context)
    setResult(vision)
  }

  return (
    <View style={styles.container}>
      <OrbitStatusBar
        mode="Focus"
        modeColor="#8b5cf6"
        statusLine={state.statusLine}
        onBack={() => router.back()}
      />

      {/* Camera preview area */}
      <View style={styles.cameraArea}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.cameraText}>Camera Preview</Text>
          <Text style={styles.cameraSubtext}>
            {Platform.OS === 'web' ? 'Camera available on mobile' : 'Point at something interesting'}
          </Text>
        </View>

        {/* Crosshair */}
        <View style={styles.crosshair}>
          <View style={[styles.crossLine, styles.crossH]} />
          <View style={[styles.crossLine, styles.crossV]} />
        </View>

        {/* AI result overlay */}
        {result && (
          <View style={styles.resultOverlay}>
            <Text style={styles.resultDescription}>{result.description}</Text>
            <View style={styles.objectTags}>
              {result.objects.map((obj, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{obj.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.analyzeBtn, analyzing && styles.analyzeBtnActive]}
          onPress={handleAnalyze}
          disabled={analyzing}
        >
          <Text style={styles.analyzeBtnIcon}>{analyzing ? '⏳' : '🔍'}</Text>
          <Text style={styles.analyzeBtnText}>
            {analyzing ? 'Analyzing...' : 'What is this?'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Point your camera at anything — a building, plant, sign, or landmark
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  cameraArea: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  cameraIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  cameraText: {
    color: '#6b7280',
    fontSize: 16,
  },
  cameraSubtext: {
    color: '#374151',
    fontSize: 12,
  },
  crosshair: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  crossLine: {
    position: 'absolute',
    backgroundColor: '#8b5cf640',
  },
  crossH: {
    width: 40,
    height: 1,
    top: 20,
  },
  crossV: {
    width: 1,
    height: 40,
    left: 20,
  },
  resultOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0e17e6',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#8b5cf640',
  },
  resultDescription: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  objectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#8b5cf620',
    borderWidth: 1,
    borderColor: '#8b5cf640',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#8b5cf6',
    fontSize: 11,
    fontWeight: '600',
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  analyzeBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnActive: {
    backgroundColor: '#6d28d9',
  },
  analyzeBtnIcon: {
    fontSize: 20,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    textAlign: 'center',
    color: '#4b5563',
    fontSize: 12,
  },
})

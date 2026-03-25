/**
 * Focus Mode — "What am I looking at?"
 *
 * Camera view with Merope's analytical eye. Point at anything,
 * tap the button, and Merope tells you about it.
 * Cosmic glassmorphism aesthetic.
 */

import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { OrbitStatusBar } from '../components/StatusBar'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { FloatingMerope } from '../components/FloatingMerope'
import { CameraView } from '../components/CameraView'
import { useAI } from '../hooks/useAI'
import { useOrbitEngine } from '../hooks/useOrbitEngine'
import { useMerope } from '../hooks/useMerope'
import { Mode } from '../engine/mode-manager'
import { MODE_EXPERTISE, getMeropeEmotion } from '../engine/merope'
import { playTone } from '../services/sound-engine'
import { tapMedium, notifySuccess } from '../services/haptics'

const FOCUS_COLOR = MODE_EXPERTISE[Mode.FOCUS].color

export default function FocusScreen() {
  const router = useRouter()
  const { state } = useOrbitEngine()
  const { analyzeImage, analyzing } = useAI()
  const { merope } = useMerope(Mode.FOCUS, state.context)
  const [result, setResult] = useState<{ description: string; objects: { label: string }[] } | null>(null)

  const meropeEmotion = getMeropeEmotion(Mode.FOCUS, analyzing)

  const handleAnalyze = async () => {
    playTone('meropePing')
    tapMedium()
    const vision = await analyzeImage('mock-frame', state.context)
    setResult(vision)
    playTone('meropeReply')
    notifySuccess()
  }

  return (
    <Starfield modeColor={FOCUS_COLOR} starCount={30}>
      <View style={styles.container}>
        <OrbitStatusBar
          mode="Focus"
          modeColor={FOCUS_COLOR}
          statusLine={state.statusLine}
          onBack={() => router.back()}
        />

        {/* Camera preview area */}
        <CameraView modeColor={FOCUS_COLOR}>
          {/* Overlay content on top of camera */}
          <View style={styles.cameraOverlay}>
            <FloatingMerope
              modeColor={FOCUS_COLOR}
              size="small"
              isThinking={analyzing}
              emotion={meropeEmotion}
            />

            {/* Crosshair */}
            <View style={styles.crosshair}>
              <View style={[styles.crossLine, styles.crossH, { backgroundColor: FOCUS_COLOR + '40' }]} />
              <View style={[styles.crossLine, styles.crossV, { backgroundColor: FOCUS_COLOR + '40' }]} />
              <View style={[styles.corner, styles.cornerTL, { borderColor: FOCUS_COLOR + '60' }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: FOCUS_COLOR + '60' }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: FOCUS_COLOR + '60' }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: FOCUS_COLOR + '60' }]} />
            </View>

            {/* Thinking indicator */}
            {analyzing && (
              <View style={styles.thinkingOverlay}>
                <GlassCard glowColor={FOCUS_COLOR} intensity="medium" style={styles.thinkingCard}>
                  <Text style={[styles.thinkingText, { color: FOCUS_COLOR }]}>{merope.thinkingLabel}</Text>
                </GlassCard>
              </View>
            )}
          </View>
        </CameraView>

        {/* Result overlay */}
        {result && (
          <GlassCard glowColor={FOCUS_COLOR} intensity="medium" style={styles.resultCard}>
            <Text style={styles.resultText}>{result.description}</Text>
            <View style={styles.objectTags}>
              {result.objects.map((obj, i) => (
                <View key={i} style={[styles.tag, { borderColor: FOCUS_COLOR + '40', backgroundColor: FOCUS_COLOR + '15' }]}>
                  <Text style={[styles.tagText, { color: FOCUS_COLOR }]}>{obj.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              { backgroundColor: FOCUS_COLOR },
              analyzing && { opacity: 0.7 },
            ]}
            onPress={handleAnalyze}
            disabled={analyzing}
            activeOpacity={0.8}
          >
            <Text style={styles.analyzeBtnIcon}>✦</Text>
            <Text style={styles.analyzeBtnText}>
              {analyzing ? 'Merope is looking...' : 'What is this?'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Point your camera — Merope loves figuring things out
          </Text>
        </View>
      </View>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshair: {
    position: 'absolute',
    width: 160,
    height: 160,
  },
  crossLine: {
    position: 'absolute',
  },
  crossH: {
    width: 160,
    height: 1,
    top: 80,
  },
  crossV: {
    width: 1,
    height: 160,
    left: 80,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 2,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  thinkingOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  thinkingCard: {
    padding: 10,
    alignItems: 'center',
  },
  thinkingText: {
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    gap: 10,
  },
  resultText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 21,
  },
  objectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  controls: {
    padding: 16,
    gap: 10,
  },
  analyzeBtn: {
    borderRadius: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnIcon: {
    color: '#fff',
    fontSize: 16,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hint: {
    textAlign: 'center',
    color: '#ffffff30',
    fontSize: 11,
    letterSpacing: 0.5,
  },
})

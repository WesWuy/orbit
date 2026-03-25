/**
 * Onboarding — Meet Merope.
 *
 * 3-screen introduction flow for new users.
 * Screen 1: "Meet Merope" — who she is
 * Screen 2: "Your Modes" — what she can do
 * Screen 3: "Let's Go" — start using Orbit
 */

import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing, Dimensions } from 'react-native'
import { useState, useRef } from 'react'
import { useRouter } from 'expo-router'
import { Starfield } from '../components/Starfield'
import { GlassCard } from '../components/GlassCard'
import { FloatingMerope } from '../components/FloatingMerope'
import { MODE_EXPERTISE } from '../engine/merope'
import { Mode } from '../engine/mode-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const SCREENS = [
  {
    title: 'Meet Merope',
    subtitle: 'Your Aerial AI Companion',
    description: "Named after the shyest star in the Pleiades, Merope is always with you — watching, learning, and ready to help whenever you need her.",
    color: '#3b82f6',
    meropeSize: 'large' as const,
  },
  {
    title: 'Your Modes',
    subtitle: '6 Ways to Explore',
    description: "Merope adapts to what you need. Focus to analyze, Guide to navigate (and plan your day!), Capture to remember, Converse to chat. She's always the right expert.",
    color: '#8b5cf6',
    meropeSize: 'medium' as const,
  },
  {
    title: "Let's Go",
    subtitle: 'Orbit Awaits',
    description: "Wake Merope and start exploring. She's excited to meet you.",
    color: '#ec4899',
    meropeSize: 'large' as const,
  },
]

const MODE_SHOWCASE = [
  { mode: Mode.FOCUS, label: 'Focus' },
  { mode: Mode.GUIDE, label: 'Guide' },
  { mode: Mode.CAPTURE, label: 'Capture' },
  { mode: Mode.CONVERSE, label: 'Converse' },
  { mode: Mode.AMBIENT, label: 'Ambient' },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const animateTransition = (nextPage: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setPage(nextPage)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start()
    })
  }

  const handleNext = () => {
    if (page < SCREENS.length - 1) {
      animateTransition(page + 1)
    }
  }

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('orbit_onboarding_complete', 'true')
    } catch {}
    router.replace('/')
  }

  const screen = SCREENS[page]
  const isLast = page === SCREENS.length - 1

  return (
    <Starfield modeColor={screen.color} starCount={40}>
      <View style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Merope */}
          <View style={styles.meropeArea}>
            <FloatingMerope
              modeColor={screen.color}
              size={screen.meropeSize}
            />
          </View>

          {/* Text */}
          <View style={styles.textArea}>
            <Text style={[styles.title, { color: screen.color }]}>{screen.title}</Text>
            <Text style={styles.subtitle}>{screen.subtitle}</Text>
            <Text style={styles.description}>{screen.description}</Text>
          </View>

          {/* Mode showcase on page 2 */}
          {page === 1 && (
            <View style={styles.modesGrid}>
              {MODE_SHOWCASE.map(({ mode, label }) => {
                const exp = MODE_EXPERTISE[mode]
                return (
                  <GlassCard key={mode} intensity="light" glowColor={exp.color} style={styles.modeChip}>
                    <Text style={styles.modeIcon}>{exp.icon}</Text>
                    <Text style={[styles.modeLabel, { color: exp.color }]}>{label}</Text>
                  </GlassCard>
                )
              })}
            </View>
          )}
        </Animated.View>

        {/* Navigation */}
        <View style={styles.nav}>
          {/* Dots */}
          <View style={styles.dots}>
            {SCREENS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === page
                    ? { backgroundColor: screen.color, width: 20 }
                    : { backgroundColor: '#ffffff20' },
                ]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            {page > 0 && (
              <TouchableOpacity onPress={() => animateTransition(page - 1)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            {!isLast && (
              <TouchableOpacity onPress={() => handleFinish()} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={isLast ? handleFinish : handleNext}
              style={[styles.nextBtn, { backgroundColor: screen.color }]}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>{isLast ? 'Wake Merope ✦' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Starfield>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingBottom: Platform.OS === 'web' ? 30 : 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  meropeArea: {
    marginBottom: 16,
  },
  textArea: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 340,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff60',
    letterSpacing: 2,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#ffffff80',
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 8,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    maxWidth: 320,
  },
  modeChip: {
    padding: 10,
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
    borderRadius: 12,
  },
  modeIcon: {
    fontSize: 20,
  },
  modeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nav: {
    paddingHorizontal: 24,
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backBtnText: {
    color: '#ffffff50',
    fontSize: 14,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    color: '#ffffff30',
    fontSize: 14,
  },
  nextBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 140,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})

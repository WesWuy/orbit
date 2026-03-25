/**
 * Sound Engine — ambient audio feedback for Orbit.
 *
 * Chimes on mode switch, pings on Merope response,
 * subtle whoosh on navigation. Uses expo-av on native,
 * Web Audio API on web.
 */

import { Platform } from 'react-native'

// Tone frequencies mapped to mode colors/feelings
const TONES = {
  modeSwitch: { freq: 523.25, duration: 0.3, type: 'sine' as OscillatorType },    // C5 — bright
  meropePing: { freq: 659.25, duration: 0.15, type: 'sine' as OscillatorType },    // E5 — gentle
  meropeReply: { freq: 392, duration: 0.2, type: 'triangle' as OscillatorType },   // G4 — warm
  capture: { freq: 784, duration: 0.1, type: 'sine' as OscillatorType },           // G5 — snap
  error: { freq: 220, duration: 0.25, type: 'sawtooth' as OscillatorType },        // A3 — low
  wake: { freq: 440, duration: 0.4, type: 'sine' as OscillatorType },              // A4 — rise
  sleep: { freq: 330, duration: 0.5, type: 'sine' as OscillatorType },             // E4 — fade
  navigate: { freq: 587.33, duration: 0.12, type: 'triangle' as OscillatorType },  // D5 — tick
  send: { freq: 698.46, duration: 0.08, type: 'sine' as OscillatorType },          // F5 — quick
  plan: { freq: 493.88, duration: 0.2, type: 'triangle' as OscillatorType },      // B4 — structured
  complete: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType },         // A5 — achievement
} as const

type ToneKey = keyof typeof TONES

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null
  if (!audioCtx && typeof AudioContext !== 'undefined') {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/**
 * Play a synthesized tone. Web only for now.
 * On native, expo-haptics handles feedback (see haptics.ts).
 */
export function playTone(key: ToneKey, volume = 0.15) {
  const ctx = getAudioContext()
  if (!ctx) return

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const tone = TONES[key]
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = tone.type
  osc.frequency.value = tone.freq
  gain.gain.value = volume

  // Fade out to avoid click
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tone.duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + tone.duration + 0.05)
}

/**
 * Play a rising chime for mode switches — two quick ascending tones.
 */
export function playModeChime(volume = 0.12) {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()

  const notes = [523.25, 659.25] // C5, E5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = ctx.currentTime + i * 0.1
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.25)
  })
}

/**
 * Play a warm wake-up sequence — rising arpeggio.
 */
export function playWakeSequence(volume = 0.1) {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()

  const notes = [330, 392, 440, 523.25] // E4, G4, A4, C5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = ctx.currentTime + i * 0.12
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.35)
  })
}

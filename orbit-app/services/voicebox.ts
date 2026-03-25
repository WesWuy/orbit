/**
 * Voicebox Integration — Give Merope a voice.
 *
 * Connects to the Voicebox local TTS server (localhost:17493)
 * to synthesize Merope's text responses into spoken audio.
 *
 * Voicebox runs locally — no cloud, full privacy.
 * When unavailable, Merope falls back to text-only gracefully.
 *
 * Setup: Install Voicebox from https://github.com/jamiepine/voicebox
 * Create a voice profile named "Merope" and set its ID below or
 * let auto-discovery find it.
 */

import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Config ──

const VOICEBOX_BASE = 'http://localhost:17493'
const STORAGE_KEY = 'orbit_voicebox_profile_id'
const CONNECTION_CHECK_INTERVAL = 30000 // 30s

// ── Types ──

export interface VoiceProfile {
  id: string
  name: string
  description?: string
  language?: string
  voice_type?: string
}

export interface VoiceboxState {
  connected: boolean
  profileId: string | null
  profileName: string | null
  speaking: boolean
  enabled: boolean
}

interface GenerateRequest {
  profile_id: string
  text: string
  language?: string
  engine?: string
  model_size?: string
  instruct?: string
  normalize?: boolean
}

// ── State ──

let _state: VoiceboxState = {
  connected: false,
  profileId: null,
  profileName: null,
  speaking: false,
  enabled: true,
}

let _listeners: Array<(state: VoiceboxState) => void> = []
let _currentAudio: HTMLAudioElement | null = null
let _checkInterval: ReturnType<typeof setInterval> | null = null

function setState(partial: Partial<VoiceboxState>) {
  _state = { ..._state, ...partial }
  _listeners.forEach((fn) => fn(_state))
}

export function getVoiceboxState(): VoiceboxState {
  return _state
}

export function onVoiceboxStateChange(fn: (state: VoiceboxState) => void): () => void {
  _listeners.push(fn)
  return () => {
    _listeners = _listeners.filter((l) => l !== fn)
  }
}

// ── Connection ──

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Check if Voicebox is running and reachable.
 */
export async function checkConnection(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    // Native would need a different approach (not localhost)
    setState({ connected: false })
    return false
  }

  try {
    const res = await fetchWithTimeout(`${VOICEBOX_BASE}/health`)
    const connected = res.ok
    setState({ connected })
    return connected
  } catch {
    setState({ connected: false })
    return false
  }
}

// ── Profile Discovery ──

/**
 * Fetch all voice profiles from Voicebox.
 */
export async function listProfiles(): Promise<VoiceProfile[]> {
  try {
    const res = await fetchWithTimeout(`${VOICEBOX_BASE}/profiles`)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/**
 * Auto-discover a Merope voice profile.
 * Looks for profiles named "Merope", "merope", or "orbit".
 * Falls back to the first available profile.
 */
export async function discoverMeropeProfile(): Promise<VoiceProfile | null> {
  const profiles = await listProfiles()
  if (profiles.length === 0) return null

  // Priority: exact "Merope" match → case-insensitive → "orbit" → first profile
  const exact = profiles.find((p) => p.name === 'Merope')
  if (exact) return exact

  const caseInsensitive = profiles.find((p) => p.name.toLowerCase() === 'merope')
  if (caseInsensitive) return caseInsensitive

  const orbit = profiles.find((p) => p.name.toLowerCase().includes('orbit'))
  if (orbit) return orbit

  // Fall back to first profile
  return profiles[0]
}

/**
 * Initialize Voicebox: check connection, find or restore profile.
 */
export async function initVoicebox(): Promise<VoiceboxState> {
  const connected = await checkConnection()
  if (!connected) return _state

  // Try to restore saved profile ID
  let profileId: string | null = null
  let profileName: string | null = null

  try {
    profileId = await AsyncStorage.getItem(STORAGE_KEY)
  } catch {}

  if (profileId) {
    // Verify saved profile still exists
    const profiles = await listProfiles()
    const found = profiles.find((p) => p.id === profileId)
    if (found) {
      profileName = found.name
    } else {
      profileId = null
    }
  }

  // Auto-discover if no saved profile
  if (!profileId) {
    const discovered = await discoverMeropeProfile()
    if (discovered) {
      profileId = discovered.id
      profileName = discovered.name
      try {
        await AsyncStorage.setItem(STORAGE_KEY, profileId)
      } catch {}
    }
  }

  setState({ connected, profileId, profileName })

  // Start periodic connection checks
  if (!_checkInterval) {
    _checkInterval = setInterval(checkConnection, CONNECTION_CHECK_INTERVAL)
  }

  return _state
}

/**
 * Set a specific voice profile by ID.
 */
export async function setProfile(profileId: string): Promise<void> {
  const profiles = await listProfiles()
  const found = profiles.find((p) => p.id === profileId)
  if (found) {
    setState({ profileId: found.id, profileName: found.name })
    try {
      await AsyncStorage.setItem(STORAGE_KEY, found.id)
    } catch {}
  }
}

// ── Speech Generation ──

/**
 * Merope's voice instruction — shapes how she sounds.
 * Used with engines that support delivery instructions (e.g. Qwen3-TTS).
 */
function getMeropeInstruct(emotion?: string): string {
  const base = 'Speak gently and warmly, like a curious friend sharing something interesting.'

  switch (emotion) {
    case 'excited':
      return 'Speak with bright enthusiasm and energy, like discovering something amazing.'
    case 'curious':
      return 'Speak with a soft, inquisitive tone, slightly wondering and fascinated.'
    case 'sleepy':
      return 'Speak very softly and slowly, drowsy and gentle, barely above a whisper.'
    case 'guiding':
      return 'Speak clearly and encouragingly, like a warm guide giving confident directions.'
    case 'nostalgic':
      return 'Speak softly with a warm, reflective tone, savoring a memory.'
    case 'chatty':
      return 'Speak in a relaxed, conversational tone with natural rhythm and warmth.'
    case 'alert':
      return 'Speak with focused clarity and a hint of urgency, attentive and sharp.'
    case 'thinking':
      return 'Speak thoughtfully, with small pauses, as if working through an idea.'
    default:
      return base
  }
}

/**
 * Generate speech from text using Voicebox streaming API.
 * Returns an audio blob URL that can be played.
 */
export async function generateSpeech(
  text: string,
  emotion?: string,
): Promise<string | null> {
  if (!_state.connected || !_state.profileId || !_state.enabled) return null
  if (Platform.OS !== 'web') return null

  const body: GenerateRequest = {
    profile_id: _state.profileId,
    text: cleanTextForSpeech(text),
    language: 'en',
    instruct: getMeropeInstruct(emotion),
    normalize: true,
  }

  try {
    setState({ speaking: true })

    const res = await fetch(`${VOICEBOX_BASE}/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.warn('[Voicebox] Generation failed:', res.status)
      setState({ speaking: false })
      return null
    }

    // Get audio blob and create URL
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    return url
  } catch (err) {
    console.warn('[Voicebox] Generation error:', err)
    setState({ speaking: false })
    return null
  }
}

/**
 * Speak text through Voicebox — generate and play immediately.
 * This is the main function to call from UI components.
 */
export async function speak(
  text: string,
  emotion?: string,
): Promise<void> {
  if (!_state.enabled || !_state.connected || !_state.profileId) return

  // Stop any currently playing audio
  stop()

  const audioUrl = await generateSpeech(text, emotion)
  if (!audioUrl) return

  return new Promise<void>((resolve) => {
    const audio = new Audio(audioUrl)
    _currentAudio = audio

    audio.onended = () => {
      setState({ speaking: false })
      URL.revokeObjectURL(audioUrl)
      _currentAudio = null
      resolve()
    }

    audio.onerror = () => {
      setState({ speaking: false })
      URL.revokeObjectURL(audioUrl)
      _currentAudio = null
      resolve()
    }

    audio.play().catch(() => {
      setState({ speaking: false })
      URL.revokeObjectURL(audioUrl)
      _currentAudio = null
      resolve()
    })
  })
}

/**
 * Stop currently playing speech.
 */
export function stop(): void {
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio.currentTime = 0
    if (_currentAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(_currentAudio.src)
    }
    _currentAudio = null
  }
  setState({ speaking: false })
}

/**
 * Toggle voice on/off.
 */
export function toggleVoice(): boolean {
  const enabled = !_state.enabled
  setState({ enabled })
  if (!enabled) stop()
  return enabled
}

/**
 * Enable or disable voice.
 */
export function setVoiceEnabled(enabled: boolean): void {
  setState({ enabled })
  if (!enabled) stop()
}

// ── Text cleanup ──

/**
 * Clean text for speech synthesis:
 * - Strip emoji (they sound weird when spoken)
 * - Collapse whitespace
 * - Trim
 */
function cleanTextForSpeech(text: string): string {
  return text
    // Remove most emoji ranges
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')   // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')   // symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')   // transport & map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')   // flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')      // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')      // dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')      // variation selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')   // supplemental
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')   // chess symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')   // symbols extended-A
    .replace(/[\u{200D}]/gu, '')               // ZWJ
    // Remove markdown-style formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    // Clean up
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Cleanup ──

export function destroyVoicebox(): void {
  stop()
  if (_checkInterval) {
    clearInterval(_checkInterval)
    _checkInterval = null
  }
  _listeners = []
}

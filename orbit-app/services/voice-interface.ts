/**
 * Voice Interface — speech-to-text and text-to-speech for Orbit.
 *
 * STT: Records audio, sends to cloud API (or uses on-device recognition).
 * TTS: Uses expo-speech to speak Orbit's responses aloud.
 */

import * as Speech from 'expo-speech'

export interface VoiceInterface {
  /** Speak text aloud as Orbit */
  speak(text: string): Promise<void>
  /** Stop speaking */
  stopSpeaking(): void
  /** Check if currently speaking */
  isSpeaking(): Promise<boolean>
}

export class OrbitVoice implements VoiceInterface {
  private _speaking = false

  async speak(text: string): Promise<void> {
    this._speaking = true
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.05,     // Slightly higher — friendly, not robotic
        rate: 1.0,       // Normal pace
        onDone: () => {
          this._speaking = false
          resolve()
        },
        onError: () => {
          this._speaking = false
          resolve()
        },
      })
    })
  }

  stopSpeaking(): void {
    Speech.stop()
    this._speaking = false
  }

  async isSpeaking(): Promise<boolean> {
    return Speech.isSpeakingAsync()
  }
}

/** Mock voice that doesn't actually speak (for web/testing) */
export class MockVoice implements VoiceInterface {
  async speak(_text: string): Promise<void> {
    // Silent
  }

  stopSpeaking(): void {
    // No-op
  }

  async isSpeaking(): Promise<boolean> {
    return false
  }
}

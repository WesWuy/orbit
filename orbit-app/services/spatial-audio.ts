/**
 * Spatial Audio Engine — directional audio cues for Guide mode.
 *
 * Uses the phone's heading and target bearing to pan a ping sound
 * left/right, giving the user a sense of direction without looking
 * at a screen.
 */

import { Audio } from 'expo-av'
import { relativeBearing } from '../lib/geo-utils'

export interface SpatialAudioEngine {
  /** Start playing guide pings */
  start(): Promise<void>
  /** Stop audio */
  stop(): Promise<void>
  /** Update the target bearing and user heading */
  update(userHeading: number, targetBearing: number, distanceM: number): void
}

export class SpatialAudioPlayer implements SpatialAudioEngine {
  private _sound: Audio.Sound | null = null
  private _timer: ReturnType<typeof setInterval> | null = null
  private _relBearing = 0
  private _distance = 0
  private _active = false

  async start(): Promise<void> {
    this._active = true
    // Ping every 1.5s — faster when closer
    this._schedulePing()
  }

  async stop(): Promise<void> {
    this._active = false
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
    if (this._sound) {
      await this._sound.unloadAsync()
      this._sound = null
    }
  }

  update(userHeading: number, targetBearing: number, distanceM: number): void {
    this._relBearing = relativeBearing(userHeading, targetBearing)
    this._distance = distanceM
  }

  private _schedulePing(): void {
    if (!this._active) return

    // Faster pings when closer (800ms at 10m, 2000ms at 500m+)
    const interval = Math.min(2000, Math.max(800, this._distance * 3))

    this._timer = setTimeout(async () => {
      await this._playPing()
      this._schedulePing()
    }, interval)
  }

  private async _playPing(): Promise<void> {
    if (!this._active) return

    try {
      // Pan based on relative bearing: -1 (left) to +1 (right)
      const pan = Math.max(-1, Math.min(1, this._relBearing / 90))

      // Volume: louder when target is roughly ahead
      const absRel = Math.abs(this._relBearing)
      const volume = absRel < 30 ? 1.0 : absRel < 90 ? 0.7 : 0.4

      if (this._sound) {
        await this._sound.setVolumeAsync(volume)
        // Note: pan is not natively supported in expo-av Sound
        // For real spatial audio, use expo-av Audio.Sound with stereo files
        // or react-native-audio-api for Web Audio API
        await this._sound.replayAsync()
      } else {
        // Create a simple beep using expo-av
        // In production, use a real audio file asset
        const { sound } = await Audio.Sound.createAsync(
          // Use a placeholder — in real app this would be a bundled ping.mp3
          { uri: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' },
          { volume, shouldPlay: true },
        )
        this._sound = sound
      }
    } catch {
      // Audio not available (e.g., web without user interaction)
    }
  }
}

/** Mock spatial audio that just logs instead of playing sounds */
export class MockSpatialAudio implements SpatialAudioEngine {
  private _timer: ReturnType<typeof setInterval> | null = null

  async start(): Promise<void> {
    this._timer = setInterval(() => {
      // Silent — just keeps the interface contract
    }, 2000)
  }

  async stop(): Promise<void> {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  update(_userHeading: number, _targetBearing: number, _distanceM: number): void {
    // No-op in mock
  }
}

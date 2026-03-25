/**
 * MockSensors — fake sensor data for development and testing.
 *
 * Simulates a person walking around in Ottawa/Gatineau area.
 * Updates at ~1Hz like real GPS.
 */

import type { SensorAdapter, SensorSnapshot, SensorListener } from './sensor-adapter'

const OTTAWA_LAT = 45.4215
const OTTAWA_LNG = -75.6972

export class MockSensors implements SensorAdapter {
  private _snapshot: SensorSnapshot = {
    timestamp: Date.now(),
    location: { lat: OTTAWA_LAT, lng: OTTAWA_LNG, alt: 70, accuracy: 5 },
    heading_deg: 0,
    speed_kmh: 0,
    battery_pct: 85,
    camera_active: false,
    motion_state: 'stationary',
  }

  private _listeners: SensorListener[] = []
  private _timer: ReturnType<typeof setInterval> | null = null
  private _walkAngle = 0

  async start(): Promise<void> {
    this._timer = setInterval(() => this._tick(), 1000)
  }

  async stop(): Promise<void> {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  getSnapshot(): SensorSnapshot {
    return { ...this._snapshot }
  }

  onUpdate(listener: SensorListener): () => void {
    this._listeners.push(listener)
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener)
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    return true
  }

  async requestLocationPermission(): Promise<boolean> {
    return true
  }

  /** Simulate walking in a slow circle */
  private _tick(): void {
    this._walkAngle += 0.02
    const radius = 0.001 // ~100m in lat/lng

    this._snapshot = {
      timestamp: Date.now(),
      location: {
        lat: OTTAWA_LAT + radius * Math.sin(this._walkAngle),
        lng: OTTAWA_LNG + radius * Math.cos(this._walkAngle),
        alt: 70 + Math.sin(this._walkAngle * 3) * 2,
        accuracy: 3 + Math.random() * 4,
      },
      heading_deg: ((this._walkAngle * 180) / Math.PI + 90) % 360,
      speed_kmh: 4.5 + Math.random() * 1.5, // Walking pace
      battery_pct: Math.max(5, this._snapshot.battery_pct - 0.01),
      camera_active: this._snapshot.camera_active,
      motion_state: 'walking',
    }

    for (const listener of this._listeners) {
      listener(this._snapshot)
    }
  }

  /** Toggle camera for testing */
  setCamera(active: boolean): void {
    this._snapshot = { ...this._snapshot, camera_active: active }
  }
}

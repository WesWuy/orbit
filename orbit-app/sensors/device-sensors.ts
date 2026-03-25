/**
 * DeviceSensors — real phone sensor adapter via Expo APIs.
 *
 * Wraps expo-location, expo-sensors (Magnetometer), and device battery
 * into the SensorAdapter interface.
 */

import * as Location from 'expo-location'
import { Magnetometer } from 'expo-sensors'
import * as Battery from 'expo-battery' // TODO: add expo-battery dependency
import type { SensorAdapter, SensorSnapshot, SensorListener, GeoLocation } from './sensor-adapter'

export class DeviceSensors implements SensorAdapter {
  private _snapshot: SensorSnapshot = {
    timestamp: Date.now(),
    location: null,
    heading_deg: 0,
    speed_kmh: 0,
    battery_pct: 100,
    camera_active: false,
    motion_state: 'stationary',
  }

  private _listeners: SensorListener[] = []
  private _locationSub: Location.LocationSubscription | null = null
  private _magnetSub: ReturnType<typeof Magnetometer.addListener> | null = null
  private _batteryTimer: ReturnType<typeof setInterval> | null = null

  async start(): Promise<void> {
    // Location updates (~1Hz)
    this._locationSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        const speed_kmh = (loc.coords.speed ?? 0) * 3.6 // m/s to km/h
        this._snapshot = {
          ...this._snapshot,
          timestamp: Date.now(),
          location: {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            alt: loc.coords.altitude ?? 0,
            accuracy: loc.coords.accuracy ?? 10,
          },
          speed_kmh: Math.max(0, speed_kmh),
          motion_state: this._classifyMotion(speed_kmh),
        }
        this._notify()
      },
    )

    // Compass heading (~10Hz)
    Magnetometer.setUpdateInterval(100)
    this._magnetSub = Magnetometer.addListener((data) => {
      // Calculate heading from magnetometer
      const heading = Math.atan2(data.y, data.x) * (180 / Math.PI)
      this._snapshot = {
        ...this._snapshot,
        heading_deg: (heading + 360) % 360,
      }
      // Don't notify on every compass update (too frequent)
    })

    // Battery check every 30s
    this._batteryTimer = setInterval(async () => {
      try {
        const level = await Battery.getBatteryLevelAsync()
        this._snapshot = {
          ...this._snapshot,
          battery_pct: Math.round(level * 100),
        }
      } catch {
        // Battery API not available on all devices
      }
    }, 30000)
  }

  async stop(): Promise<void> {
    this._locationSub?.remove()
    this._magnetSub?.remove()
    if (this._batteryTimer) clearInterval(this._batteryTimer)
    this._locationSub = null
    this._magnetSub = null
    this._batteryTimer = null
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
    // Camera permissions handled by expo-camera component
    return true
  }

  async requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync()
    return status === 'granted'
  }

  private _classifyMotion(speed_kmh: number): SensorSnapshot['motion_state'] {
    if (speed_kmh < 1) return 'stationary'
    if (speed_kmh < 7) return 'walking'
    if (speed_kmh < 15) return 'running'
    return 'vehicle'
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener(this._snapshot)
    }
  }
}

/**
 * SensorAdapter — the Gen 1 equivalent of VehicleAdapter.
 *
 * This is THE critical abstraction boundary. All app logic talks to
 * this interface, never to Expo APIs directly.
 *
 * In Gen 1: DeviceSensors wraps phone GPS/IMU/compass/camera.
 * In Gen 2: DroneSensors wraps real drone telemetry via MAVLink.
 * In dev:   MockSensors returns fake data for testing.
 *
 * The entire app works identically regardless of which adapter is plugged in.
 */

export interface GeoLocation {
  lat: number
  lng: number
  alt: number      // meters above sea level
  accuracy: number // meters
}

export interface SensorSnapshot {
  timestamp: number
  location: GeoLocation | null
  heading_deg: number     // compass heading 0-360
  speed_kmh: number       // ground speed
  battery_pct: number     // device battery 0-100
  camera_active: boolean
  motion_state: 'stationary' | 'walking' | 'running' | 'vehicle'
}

export type SensorListener = (snapshot: SensorSnapshot) => void

/**
 * Abstract sensor interface. All implementations must provide these.
 * This is the boundary where Gen 2's drone sensors plug in.
 */
export interface SensorAdapter {
  /** Start sensor subscriptions */
  start(): Promise<void>

  /** Stop all subscriptions and clean up */
  stop(): Promise<void>

  /** Get latest sensor snapshot */
  getSnapshot(): SensorSnapshot

  /** Subscribe to sensor updates */
  onUpdate(listener: SensorListener): () => void

  /** Request camera permissions */
  requestCameraPermission(): Promise<boolean>

  /** Request location permissions */
  requestLocationPermission(): Promise<boolean>
}

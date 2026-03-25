/**
 * Orbit Context — fuses all sensor data into a rich context object.
 *
 * This is the "world model" that gets passed to every AI call.
 * It knows: where you are, what direction you face, how fast you're moving,
 * what time it is, what mode you're in, and what you've recently seen.
 */

import type { SensorSnapshot } from '../sensors/sensor-adapter'
import type { Mode } from './mode-manager'

export interface OrbitContext {
  // Sensor state
  location: { lat: number; lng: number; alt: number } | null
  heading_deg: number
  speed_kmh: number
  motion_state: 'stationary' | 'walking' | 'running' | 'vehicle'

  // Environment
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night'
  local_time: string  // HH:MM format

  // Orbit state
  mode: Mode
  battery_pct: number
  is_online: boolean

  // Recent context
  last_capture_description: string | null
  session_start: number
}

export function buildContext(
  sensors: SensorSnapshot,
  mode: Mode,
  isOnline: boolean,
  lastCapture: string | null,
  sessionStart: number,
): OrbitContext {
  const now = new Date()
  const hour = now.getHours()

  let time_of_day: OrbitContext['time_of_day']
  if (hour >= 5 && hour < 12) time_of_day = 'morning'
  else if (hour >= 12 && hour < 17) time_of_day = 'afternoon'
  else if (hour >= 17 && hour < 21) time_of_day = 'evening'
  else time_of_day = 'night'

  let motion_state: OrbitContext['motion_state']
  if (sensors.speed_kmh < 1) motion_state = 'stationary'
  else if (sensors.speed_kmh < 7) motion_state = 'walking'
  else if (sensors.speed_kmh < 15) motion_state = 'running'
  else motion_state = 'vehicle'

  return {
    location: sensors.location,
    heading_deg: sensors.heading_deg,
    speed_kmh: sensors.speed_kmh,
    motion_state,
    time_of_day,
    local_time: `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    mode,
    battery_pct: sensors.battery_pct,
    is_online: isOnline,
    last_capture_description: lastCapture,
    session_start: sessionStart,
  }
}

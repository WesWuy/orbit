/**
 * Orbit Companion app state types.
 *
 * These are the UI-facing types derived from protocol messages.
 * The hooks merge TelemetryPayload + RuntimeStatusPayload into OrbitState.
 */

export type { Vec3, TelemetryPayload, RuntimeStatusPayload } from './protocol'

/** Merged state from telemetry.snapshot + runtime.status */
export interface OrbitState {
  // From runtime.status (~1Hz)
  mode: string
  flight_state: string
  safety_state: string
  estop_active: boolean
  companion_connected: boolean
  explanation: string

  // From telemetry.snapshot (~20Hz)
  sim_time: number
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  heading_deg: number
  altitude_m: number
  speed_ms: number
  battery_pct: number
  target_locked: boolean
  target_distance_m: number
  dock_distance_m: number
}

/** A safety event received from the Runtime */
export interface SafetyEvent {
  timestamp: number
  type: string       // e.g. "safety.low_battery"
  code: string       // e.g. "BATTERY_WARNING"
  message: string
}

/** Result of a command sent to the Runtime */
export interface CommandResult {
  accepted: boolean
  message: string
  mode: string
  intent: string
  code: string       // reject reason code, empty if accepted
}

/** Entry in the command history log */
export interface CommandEntry {
  timestamp: number
  text: string
  result: CommandResult
}

/**
 * Orbit Protocol v1 — TypeScript types matching orbit/protocol/messages.py.
 *
 * Every WebSocket message is an Envelope:
 *   { type: string, id: string, ts: number, payload: object }
 *
 * Runtime is authoritative. Companion requests; Runtime decides.
 */

// ═══════════════════════════════════════════════════════════════
// Message types
// ═══════════════════════════════════════════════════════════════

export const MsgType = {
  // Telemetry (high frequency ~20Hz)
  TELEMETRY_SNAPSHOT: 'telemetry.snapshot',

  // Runtime status (low frequency ~1Hz)
  RUNTIME_STATUS: 'runtime.status',

  // Commands
  COMMAND_REQUEST: 'command.request',
  COMMAND_ACCEPTED: 'command.accepted',
  COMMAND_REJECTED: 'command.rejected',

  // Safety events (discrete, first-class)
  SAFETY_LOW_BATTERY: 'safety.low_battery',
  SAFETY_ESTOP_ENGAGED: 'safety.estop_engaged',
  SAFETY_ESTOP_CLEARED: 'safety.estop_cleared',

  // Lifecycle
  LIFECYCLE_MODE_CHANGED: 'lifecycle.mode_changed',

  // Heartbeat
  HEARTBEAT_PING: 'heartbeat.ping',
  HEARTBEAT_PONG: 'heartbeat.pong',

  // Runtime state
  RUNTIME_READY: 'runtime.ready',
  RUNTIME_DEGRADED: 'runtime.degraded',
} as const

export type MsgTypeValue = (typeof MsgType)[keyof typeof MsgType]

// ═══════════════════════════════════════════════════════════════
// Reason codes (stable identifiers for command rejections)
// ═══════════════════════════════════════════════════════════════

export const RejectReason = {
  ESTOP_ACTIVE: 'ESTOP_ACTIVE',
  BATTERY_CRITICAL: 'BATTERY_CRITICAL',
  ALTITUDE_EXCEEDED: 'ALTITUDE_EXCEEDED',
  ALTITUDE_TOO_LOW: 'ALTITUDE_TOO_LOW',
  SPEED_EXCEEDED: 'SPEED_EXCEEDED',
  GEOFENCE_BREACH: 'GEOFENCE_BREACH',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  UNKNOWN_COMMAND: 'UNKNOWN_COMMAND',
  NOT_AIRBORNE: 'NOT_AIRBORNE',
  NOT_GROUNDED: 'NOT_GROUNDED',
  ALREADY_IN_MODE: 'ALREADY_IN_MODE',
} as const

// ═══════════════════════════════════════════════════════════════
// Safety codes (stable identifiers for safety events)
// ═══════════════════════════════════════════════════════════════

export const SafetyCode = {
  BATTERY_WARNING: 'BATTERY_WARNING',
  BATTERY_CRITICAL: 'BATTERY_CRITICAL',
  ESTOP_ENGAGED: 'ESTOP_ENGAGED',
  ESTOP_CLEARED: 'ESTOP_CLEARED',
  LINK_DEGRADED: 'LINK_DEGRADED',
  LINK_LOST: 'LINK_LOST',
  GEOFENCE_WARNING: 'GEOFENCE_WARNING',
  AUTO_LAND: 'AUTO_LAND',
} as const

// ═══════════════════════════════════════════════════════════════
// Envelope
// ═══════════════════════════════════════════════════════════════

export interface Envelope<T = unknown> {
  type: string
  id: string
  ts: number
  payload: T
}

// ═══════════════════════════════════════════════════════════════
// Payload types per message
// ═══════════════════════════════════════════════════════════════

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface TelemetryPayload {
  sim_time: number
  position: Vec3
  velocity: Vec3
  heading_deg: number
  altitude_m: number
  speed_ms: number
  battery_pct: number
  target_locked: boolean
  target_distance_m: number
  dock_distance_m: number
}

export interface RuntimeStatusPayload {
  mode: string
  flight_state: string
  safety_state: string
  estop_active: boolean
  companion_connected: boolean
  battery_pct: number
  explanation: string
}

export interface CommandRequestPayload {
  text: string
}

export interface CommandAcceptedPayload {
  request_id: string
  intent: string
  mode: string
  message: string
}

export interface CommandRejectedPayload {
  request_id: string
  reason: string
  code: string
  message: string
}

export interface SafetyLowBatteryPayload {
  battery_pct: number
  code: string
  message: string
}

export interface SafetyEstopPayload {
  code: string
  message: string
}

export interface ModeChangedPayload {
  from_mode: string
  to_mode: string
  reason: string
}

export interface RuntimeReadyPayload {
  version: string
  sim_mode: boolean
}

export interface RuntimeDegradedPayload {
  reason: string
  message: string
}

// ═══════════════════════════════════════════════════════════════
// Envelope builders (Companion → Runtime)
// ═══════════════════════════════════════════════════════════════

let _counter = 0

function makeId(): string {
  return `c${Date.now().toString(36)}${(++_counter).toString(36)}`
}

export function commandRequest(text: string): Envelope<CommandRequestPayload> {
  return {
    type: MsgType.COMMAND_REQUEST,
    id: makeId(),
    ts: Date.now() / 1000,
    payload: { text },
  }
}

export function heartbeatPing(): Envelope {
  return {
    type: MsgType.HEARTBEAT_PING,
    id: makeId(),
    ts: Date.now() / 1000,
    payload: {},
  }
}

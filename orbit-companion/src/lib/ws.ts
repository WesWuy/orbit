/**
 * Orbit Protocol v1 WebSocket client.
 *
 * Connects to Runtime at /ws/orbit. All messages are typed Envelopes.
 * Sends heartbeat.ping every 2s; expects heartbeat.pong back.
 * If no pong received for 4s, marks link as disconnected.
 * Auto-reconnects on WebSocket close.
 *
 * The Companion is NOT flight-critical. If this connection drops,
 * the Runtime continues operating safely.
 */

import type {
  Envelope,
  TelemetryPayload,
  RuntimeStatusPayload,
  CommandAcceptedPayload,
  CommandRejectedPayload,
  SafetyLowBatteryPayload,
  SafetyEstopPayload,
  ModeChangedPayload,
  RuntimeReadyPayload,
} from './protocol'
import { MsgType, commandRequest, heartbeatPing } from './protocol'

// ═══════════════════════════════════════════════════════════════
// Handler callbacks
// ═══════════════════════════════════════════════════════════════

export interface ProtocolHandlers {
  onTelemetry: (payload: TelemetryPayload) => void
  onRuntimeStatus: (payload: RuntimeStatusPayload) => void
  onCommandAccepted: (payload: CommandAcceptedPayload) => void
  onCommandRejected: (payload: CommandRejectedPayload) => void
  onSafetyEvent: (type: string, payload: SafetyLowBatteryPayload | SafetyEstopPayload) => void
  onModeChanged: (payload: ModeChangedPayload) => void
  onRuntimeReady: (payload: RuntimeReadyPayload) => void
  onConnectionChange: (connected: boolean) => void
}

// ═══════════════════════════════════════════════════════════════
// Client
// ═══════════════════════════════════════════════════════════════

const HEARTBEAT_INTERVAL = 2000
const HEARTBEAT_TIMEOUT = 4000
const RECONNECT_DELAY = 2000

export class OrbitProtocolClient {
  private ws: WebSocket | null = null
  private handlers: ProtocolHandlers
  private _destroyed = false

  // Heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastPongTime = 0

  // Reconnect
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  // Pending command acks
  private pendingCommands = new Map<string, {
    resolve: (result: { accepted: boolean; payload: CommandAcceptedPayload | CommandRejectedPayload }) => void
    timer: ReturnType<typeof setTimeout>
  }>()

  constructor(handlers: ProtocolHandlers) {
    this.handlers = handlers
  }

  connect(): void {
    if (this._destroyed) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.ws = new WebSocket(`${protocol}//${host}/ws/orbit`)

    this.ws.onopen = () => {
      this.lastPongTime = Date.now()
      this.handlers.onConnectionChange(true)
      this.startHeartbeat()
    }

    this.ws.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data) as Envelope
        this.dispatch(envelope)
      } catch {
        // ignore parse errors
      }
    }

    this.ws.onclose = () => {
      this.handlers.onConnectionChange(false)
      this.stopHeartbeat()
      this.rejectAllPending('Connection lost')
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onclose fires after this
    }
  }

  sendCommand(text: string): Promise<{ accepted: boolean; payload: CommandAcceptedPayload | CommandRejectedPayload }> {
    return new Promise((resolve) => {
      const envelope = commandRequest(text)
      const requestId = envelope.id

      // Timeout after 5s
      const timer = setTimeout(() => {
        this.pendingCommands.delete(requestId)
        resolve({
          accepted: false,
          payload: {
            request_id: requestId,
            reason: 'TIMEOUT',
            code: 'TIMEOUT',
            message: 'Command timed out — no response from Runtime',
          } as CommandRejectedPayload,
        })
      }, 5000)

      this.pendingCommands.set(requestId, { resolve, timer })

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(envelope))
      } else {
        clearTimeout(timer)
        this.pendingCommands.delete(requestId)
        resolve({
          accepted: false,
          payload: {
            request_id: requestId,
            reason: 'DISCONNECTED',
            code: 'DISCONNECTED',
            message: 'Not connected to Runtime',
          } as CommandRejectedPayload,
        })
      }
    })
  }

  destroy(): void {
    this._destroyed = true
    this.stopHeartbeat()
    this.rejectAllPending('Client destroyed')
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }

  // ── Message dispatch ──

  private dispatch(envelope: Envelope): void {
    const { type, payload } = envelope

    switch (type) {
      case MsgType.TELEMETRY_SNAPSHOT:
        this.handlers.onTelemetry(payload as TelemetryPayload)
        break

      case MsgType.RUNTIME_STATUS:
        this.handlers.onRuntimeStatus(payload as RuntimeStatusPayload)
        break

      case MsgType.COMMAND_ACCEPTED: {
        const accepted = payload as CommandAcceptedPayload
        const pending = this.pendingCommands.get(accepted.request_id)
        if (pending) {
          clearTimeout(pending.timer)
          this.pendingCommands.delete(accepted.request_id)
          pending.resolve({ accepted: true, payload: accepted })
        }
        this.handlers.onCommandAccepted(accepted)
        break
      }

      case MsgType.COMMAND_REJECTED: {
        const rejected = payload as CommandRejectedPayload
        const pendingCmd = this.pendingCommands.get(rejected.request_id)
        if (pendingCmd) {
          clearTimeout(pendingCmd.timer)
          this.pendingCommands.delete(rejected.request_id)
          pendingCmd.resolve({ accepted: false, payload: rejected })
        }
        this.handlers.onCommandRejected(rejected)
        break
      }

      case MsgType.SAFETY_LOW_BATTERY:
      case MsgType.SAFETY_ESTOP_ENGAGED:
      case MsgType.SAFETY_ESTOP_CLEARED:
        this.handlers.onSafetyEvent(type, payload as SafetyLowBatteryPayload | SafetyEstopPayload)
        break

      case MsgType.LIFECYCLE_MODE_CHANGED:
        this.handlers.onModeChanged(payload as ModeChangedPayload)
        break

      case MsgType.RUNTIME_READY:
        this.handlers.onRuntimeReady(payload as RuntimeReadyPayload)
        break

      case MsgType.HEARTBEAT_PONG:
        this.lastPongTime = Date.now()
        break
    }
  }

  // ── Heartbeat ──

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      // Send ping
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(heartbeatPing()))
      }

      // Check pong timeout
      if (Date.now() - this.lastPongTime > HEARTBEAT_TIMEOUT) {
        this.handlers.onConnectionChange(false)
      } else {
        this.handlers.onConnectionChange(true)
      }
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ── Reconnect ──

  private scheduleReconnect(): void {
    if (this._destroyed) return
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY)
  }

  // ── Cleanup ──

  private rejectAllPending(reason: string): void {
    for (const [id, { resolve, timer }] of this.pendingCommands) {
      clearTimeout(timer)
      resolve({
        accepted: false,
        payload: {
          request_id: id,
          reason: 'DISCONNECTED',
          code: 'DISCONNECTED',
          message: reason,
        } as CommandRejectedPayload,
      })
    }
    this.pendingCommands.clear()
  }
}

"""Orbit Protocol v1 — typed message envelope for Runtime ↔ Companion.

Every WebSocket message is a JSON-serialized Envelope:
{
  "type": "telemetry.snapshot",
  "id": "abc123",
  "ts": 1711234567.89,
  "payload": { ... }
}

Rules:
  1. Every message has the same envelope shape — no exceptions.
  2. Runtime is authoritative. Companion requests; Runtime decides.
  3. Safety events are first-class — never buried inside telemetry.
  4. Heartbeat keeps the link alive; missed pongs = disconnected.
  5. Reason codes are stable strings, not freeform text.

Phase 1 message types:
  telemetry.snapshot     Runtime → Companion  (high-frequency, ~20Hz)
  runtime.status         Runtime → Companion  (low-frequency state, ~1Hz)
  command.request        Companion → Runtime
  command.accepted       Runtime → Companion
  command.rejected       Runtime → Companion
  safety.low_battery     Runtime → Companion
  safety.estop_engaged   Runtime → Companion
  safety.estop_cleared   Runtime → Companion
  lifecycle.mode_changed Runtime → Companion
  heartbeat.ping         Companion → Runtime
  heartbeat.pong         Runtime → Companion
  runtime.ready          Runtime → Companion  (sent once on connect)
  runtime.degraded       Runtime → Companion
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


# ═══════════════════════════════════════════════════════════════
# Message types
# ═══════════════════════════════════════════════════════════════

class MsgType(str, Enum):
    # Telemetry (high frequency)
    TELEMETRY_SNAPSHOT = "telemetry.snapshot"

    # Runtime status (low frequency)
    RUNTIME_STATUS = "runtime.status"

    # Commands
    COMMAND_REQUEST = "command.request"
    COMMAND_ACCEPTED = "command.accepted"
    COMMAND_REJECTED = "command.rejected"

    # Safety events (discrete, first-class)
    SAFETY_LOW_BATTERY = "safety.low_battery"
    SAFETY_ESTOP_ENGAGED = "safety.estop_engaged"
    SAFETY_ESTOP_CLEARED = "safety.estop_cleared"

    # Lifecycle
    LIFECYCLE_MODE_CHANGED = "lifecycle.mode_changed"

    # Heartbeat
    HEARTBEAT_PING = "heartbeat.ping"
    HEARTBEAT_PONG = "heartbeat.pong"

    # Runtime state
    RUNTIME_READY = "runtime.ready"
    RUNTIME_DEGRADED = "runtime.degraded"


# ═══════════════════════════════════════════════════════════════
# Reason codes — stable identifiers for command rejections
# ═══════════════════════════════════════════════════════════════

class RejectReason(str, Enum):
    ESTOP_ACTIVE = "ESTOP_ACTIVE"
    BATTERY_CRITICAL = "BATTERY_CRITICAL"
    ALTITUDE_EXCEEDED = "ALTITUDE_EXCEEDED"
    ALTITUDE_TOO_LOW = "ALTITUDE_TOO_LOW"
    SPEED_EXCEEDED = "SPEED_EXCEEDED"
    GEOFENCE_BREACH = "GEOFENCE_BREACH"
    INVALID_TRANSITION = "INVALID_TRANSITION"
    UNKNOWN_COMMAND = "UNKNOWN_COMMAND"
    NOT_AIRBORNE = "NOT_AIRBORNE"
    NOT_GROUNDED = "NOT_GROUNDED"
    ALREADY_IN_MODE = "ALREADY_IN_MODE"


# ═══════════════════════════════════════════════════════════════
# Safety codes — stable identifiers for safety events
# ═══════════════════════════════════════════════════════════════

class SafetyCode(str, Enum):
    BATTERY_WARNING = "BATTERY_WARNING"
    BATTERY_CRITICAL = "BATTERY_CRITICAL"
    ESTOP_ENGAGED = "ESTOP_ENGAGED"
    ESTOP_CLEARED = "ESTOP_CLEARED"
    LINK_DEGRADED = "LINK_DEGRADED"
    LINK_LOST = "LINK_LOST"
    GEOFENCE_WARNING = "GEOFENCE_WARNING"
    AUTO_LAND = "AUTO_LAND"


# ═══════════════════════════════════════════════════════════════
# Envelope — every message on the wire has this shape
# ═══════════════════════════════════════════════════════════════

def _make_id() -> str:
    return uuid.uuid4().hex[:12]


@dataclass
class Envelope:
    """Universal message envelope. Every protocol message is wrapped in this."""
    type: str
    id: str = field(default_factory=_make_id)
    ts: float = field(default_factory=time.time)
    payload: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {"type": self.type, "id": self.id, "ts": self.ts, "payload": self.payload}

    @staticmethod
    def from_dict(data: dict) -> Envelope:
        return Envelope(
            type=data.get("type", ""),
            id=data.get("id", ""),
            ts=data.get("ts", 0.0),
            payload=data.get("payload", {}),
        )


# ═══════════════════════════════════════════════════════════════
# Payload builders — each returns an Envelope ready to serialize
# ═══════════════════════════════════════════════════════════════

def telemetry_snapshot(
    *,
    sim_time: float,
    position: dict,
    velocity: dict,
    heading_deg: float,
    altitude_m: float,
    speed_ms: float,
    battery_pct: float,
    target_locked: bool,
    target_distance_m: float,
    dock_distance_m: float,
) -> Envelope:
    """High-frequency telemetry (~20Hz). Position, velocity, battery."""
    return Envelope(
        type=MsgType.TELEMETRY_SNAPSHOT,
        payload={
            "sim_time": sim_time,
            "position": position,
            "velocity": velocity,
            "heading_deg": heading_deg,
            "altitude_m": altitude_m,
            "speed_ms": speed_ms,
            "battery_pct": battery_pct,
            "target_locked": target_locked,
            "target_distance_m": target_distance_m,
            "dock_distance_m": dock_distance_m,
        },
    )


def runtime_status(
    *,
    mode: str,
    flight_state: str,
    safety_state: str,
    estop_active: bool,
    companion_connected: bool,
    battery_pct: float,
    explanation: str,
) -> Envelope:
    """Low-frequency runtime status (~1Hz). Mode, safety, explanation."""
    return Envelope(
        type=MsgType.RUNTIME_STATUS,
        payload={
            "mode": mode,
            "flight_state": flight_state,
            "safety_state": safety_state,
            "estop_active": estop_active,
            "companion_connected": companion_connected,
            "battery_pct": battery_pct,
            "explanation": explanation,
        },
    )


def command_request(*, text: str, request_id: str = "") -> Envelope:
    """Companion → Runtime: request a command."""
    rid = request_id or _make_id()
    return Envelope(
        type=MsgType.COMMAND_REQUEST,
        id=rid,
        payload={"text": text},
    )


def command_accepted(*, request_id: str, intent: str, mode: str, message: str) -> Envelope:
    """Runtime → Companion: command was validated and executed."""
    return Envelope(
        type=MsgType.COMMAND_ACCEPTED,
        payload={
            "request_id": request_id,
            "intent": intent,
            "mode": mode,
            "message": message,
        },
    )


def command_rejected(*, request_id: str, reason: str, code: str, message: str) -> Envelope:
    """Runtime → Companion: command was rejected by safety supervisor or parser."""
    return Envelope(
        type=MsgType.COMMAND_REJECTED,
        payload={
            "request_id": request_id,
            "reason": reason,
            "code": code,
            "message": message,
        },
    )


def safety_low_battery(*, battery_pct: float, code: str, message: str) -> Envelope:
    """Discrete safety event: battery threshold crossed."""
    return Envelope(
        type=MsgType.SAFETY_LOW_BATTERY,
        payload={"battery_pct": battery_pct, "code": code, "message": message},
    )


def safety_estop_engaged(*, message: str = "Emergency stop engaged") -> Envelope:
    return Envelope(
        type=MsgType.SAFETY_ESTOP_ENGAGED,
        payload={"code": SafetyCode.ESTOP_ENGAGED, "message": message},
    )


def safety_estop_cleared(*, message: str = "Emergency stop cleared") -> Envelope:
    return Envelope(
        type=MsgType.SAFETY_ESTOP_CLEARED,
        payload={"code": SafetyCode.ESTOP_CLEARED, "message": message},
    )


def lifecycle_mode_changed(*, from_mode: str, to_mode: str, reason: str) -> Envelope:
    return Envelope(
        type=MsgType.LIFECYCLE_MODE_CHANGED,
        payload={"from_mode": from_mode, "to_mode": to_mode, "reason": reason},
    )


def heartbeat_ping() -> Envelope:
    return Envelope(type=MsgType.HEARTBEAT_PING, payload={})


def heartbeat_pong(*, ping_id: str) -> Envelope:
    return Envelope(type=MsgType.HEARTBEAT_PONG, payload={"ping_id": ping_id})


def runtime_ready(*, version: str = "0.1.0", sim_mode: bool = True) -> Envelope:
    return Envelope(
        type=MsgType.RUNTIME_READY,
        payload={"version": version, "sim_mode": sim_mode},
    )


def runtime_degraded(*, reason: str, message: str) -> Envelope:
    return Envelope(
        type=MsgType.RUNTIME_DEGRADED,
        payload={"reason": reason, "message": message},
    )

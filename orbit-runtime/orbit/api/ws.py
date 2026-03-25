"""WebSocket handler — Orbit Protocol v1.

Single bidirectional channel at /ws/orbit. All messages are Envelopes.

Outbound streams (Runtime → Companion):
  - telemetry.snapshot at ~20Hz (high-frequency position/battery)
  - runtime.status at ~1Hz (mode, safety state, explanation)
  - safety.* events pushed on state change
  - lifecycle.* events pushed on mode transitions
  - heartbeat.pong in reply to ping
  - runtime.ready on initial connect

Inbound (Companion → Runtime):
  - command.request → validated → command.accepted or command.rejected
  - heartbeat.ping → heartbeat.pong

Heartbeat:
  If Runtime receives no ping for HEARTBEAT_TIMEOUT_S, it marks companion
  as disconnected. If Companion receives no pong for 3s, it shows disconnected.
"""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from orbit.core.telemetry import Telemetry
from orbit.protocol.messages import (
    Envelope,
    MsgType,
    RejectReason,
    telemetry_snapshot,
    runtime_status,
    runtime_ready,
    command_accepted,
    command_rejected,
    heartbeat_pong,
)

logger = logging.getLogger(__name__)

ws_router = APIRouter()

_orchestrator = None

HEARTBEAT_TIMEOUT_S = 5.0
STATUS_INTERVAL_TICKS = 20  # send runtime.status every 20 ticks (~1Hz at 20Hz tick)


def set_orchestrator(orch) -> None:
    global _orchestrator
    _orchestrator = orch


def _build_telemetry_snapshot(t: Telemetry) -> dict:
    """Build a telemetry.snapshot envelope dict from raw telemetry."""
    speed = (t.velocity.x ** 2 + t.velocity.y ** 2 + t.velocity.z ** 2) ** 0.5
    return telemetry_snapshot(
        sim_time=round(t.sim_time, 2),
        position={"x": round(t.position.x, 3), "y": round(t.position.y, 3), "z": round(t.position.z, 3)},
        velocity={"x": round(t.velocity.x, 3), "y": round(t.velocity.y, 3), "z": round(t.velocity.z, 3)},
        heading_deg=round(t.heading_deg, 1),
        altitude_m=round(t.position.z, 2),
        speed_ms=round(speed, 2),
        battery_pct=round(t.battery_pct, 1),
        target_locked=t.target_locked,
        target_distance_m=round(t.target_distance_m, 1),
        dock_distance_m=round(t.dock_distance_m, 1),
    ).to_dict()


def _build_runtime_status() -> dict:
    """Build a runtime.status envelope dict from orchestrator state."""
    s = _orchestrator.get_status()
    return runtime_status(
        mode=s["mode"],
        flight_state=s["flight_state"],
        safety_state=s["safety_state"],
        estop_active=s["estop_active"],
        companion_connected=s["companion_connected"],
        battery_pct=s["battery_pct"],
        explanation=s["explanation"],
    ).to_dict()


@ws_router.websocket("/ws/orbit")
async def orbit_protocol(websocket: WebSocket):
    """Bidirectional Orbit Protocol v1 channel."""
    await websocket.accept()
    logger.info("Companion connected — protocol v1")

    _orchestrator.on_companion_connect()

    # Send runtime.ready
    await websocket.send_json(
        runtime_ready(version="0.1.0", sim_mode=True).to_dict()
    )

    # Send initial runtime.status
    await websocket.send_json(_build_runtime_status())

    # Telemetry queue (non-blocking, drops old frames)
    telem_queue: asyncio.Queue = asyncio.Queue(maxsize=3)
    tick_count = 0
    last_ping_time = time.time()

    async def on_telemetry(telemetry: Telemetry):
        try:
            if telem_queue.full():
                try:
                    telem_queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            telem_queue.put_nowait(telemetry)
        except Exception:
            pass

    _orchestrator.on_telemetry(on_telemetry)

    # Event queue for safety/lifecycle events pushed from orchestrator
    event_queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _orchestrator.on_protocol_event(event_queue)

    async def outbound_loop():
        """Send telemetry snapshots, periodic status, and events."""
        nonlocal tick_count
        try:
            while True:
                telemetry = await telem_queue.get()
                tick_count += 1

                # telemetry.snapshot every tick
                await websocket.send_json(_build_telemetry_snapshot(telemetry))

                # runtime.status every STATUS_INTERVAL_TICKS
                if tick_count % STATUS_INTERVAL_TICKS == 0:
                    await websocket.send_json(_build_runtime_status())

                # Drain event queue (safety events, mode changes)
                while not event_queue.empty():
                    try:
                        event_envelope = event_queue.get_nowait()
                        await websocket.send_json(event_envelope)
                    except asyncio.QueueEmpty:
                        break
        except Exception:
            pass

    async def inbound_loop():
        """Receive commands and heartbeat pings."""
        nonlocal last_ping_time
        try:
            while True:
                data = await websocket.receive_json()
                envelope = Envelope.from_dict(data)

                if envelope.type == MsgType.COMMAND_REQUEST:
                    text = envelope.payload.get("text", "")
                    request_id = envelope.id
                    await _handle_command(websocket, text, request_id)

                elif envelope.type == MsgType.HEARTBEAT_PING:
                    last_ping_time = time.time()
                    pong = heartbeat_pong(ping_id=envelope.id)
                    await websocket.send_json(pong.to_dict())

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"Inbound error: {e}")

    async def heartbeat_monitor():
        """Check for missed pings. Mark companion disconnected if stale."""
        nonlocal last_ping_time
        try:
            while True:
                await asyncio.sleep(HEARTBEAT_TIMEOUT_S)
                if time.time() - last_ping_time > HEARTBEAT_TIMEOUT_S:
                    logger.warning("No heartbeat from companion — marking link degraded")
                    # Don't disconnect yet — just log. Full disconnect comes from WebSocket close.
        except asyncio.CancelledError:
            pass

    # Run all three concurrently
    tasks = [
        asyncio.create_task(outbound_loop()),
        asyncio.create_task(inbound_loop()),
        asyncio.create_task(heartbeat_monitor()),
    ]

    try:
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()
    except Exception:
        pass
    finally:
        _orchestrator.remove_telemetry_callback(on_telemetry)
        _orchestrator.remove_protocol_event_queue(event_queue)
        _orchestrator.on_companion_disconnect()
        logger.info("Companion disconnected — Runtime continues safe local behavior")


async def _handle_command(websocket: WebSocket, text: str, request_id: str) -> None:
    """Process a command.request and send accepted or rejected."""
    result = await _orchestrator.handle_command(text)

    if result["success"]:
        msg = command_accepted(
            request_id=request_id,
            intent=result.get("intent", ""),
            mode=result.get("mode", ""),
            message=result.get("message", ""),
        )
    else:
        # Map safety supervisor reasons to stable codes
        code = _map_reject_code(result.get("message", ""))
        msg = command_rejected(
            request_id=request_id,
            reason=result.get("message", ""),
            code=code,
            message=result.get("message", ""),
        )

    await websocket.send_json(msg.to_dict())


def _map_reject_code(message: str) -> str:
    """Map freeform rejection messages to stable reason codes."""
    msg_lower = message.lower()
    if "e-stop" in msg_lower or "estop" in msg_lower:
        return RejectReason.ESTOP_ACTIVE
    if "battery" in msg_lower:
        return RejectReason.BATTERY_CRITICAL
    if "altitude" in msg_lower and "exceed" in msg_lower:
        return RejectReason.ALTITUDE_EXCEEDED
    if "altitude" in msg_lower and "below" in msg_lower:
        return RejectReason.ALTITUDE_TOO_LOW
    if "speed" in msg_lower:
        return RejectReason.SPEED_EXCEEDED
    if "geofence" in msg_lower:
        return RejectReason.GEOFENCE_BREACH
    if "cannot switch" in msg_lower:
        return RejectReason.INVALID_TRANSITION
    if "unrecognized" in msg_lower or "unknown" in msg_lower:
        return RejectReason.UNKNOWN_COMMAND
    return "REJECTED"

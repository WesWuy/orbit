"""Orchestrator — the beating heart of the Orbit Runtime.

This is the ONBOARD runtime loop. It runs independently of the Companion app.
If the Companion disconnects, this loop continues operating safely.

Tick loop:
  1. Advance simulation
  2. Get telemetry
  3. Update safety state (including companion link state)
  4. Check for safety overrides → emit safety events
  5. Run the active mode controller
  6. Broadcast telemetry to connected companions
  7. Emit lifecycle/safety events through the protocol event bus
"""

from __future__ import annotations

import asyncio
import logging
import time

from orbit.adapters.base import VehicleAdapter
from orbit.adapters.sim_adapter import SimAdapter
from orbit.brain.context import OrbitContext
from orbit.brain.explainer import explain_state
from orbit.brain.intent_parser import IntentType, parse_intent
from orbit.core.controllers.dock_controller import DockController
from orbit.core.controllers.orbit_controller import OrbitController
from orbit.core.controllers.position_controller import PositionController
from orbit.core.mode_manager import ModeManager, OrbitMode
from orbit.core.mission import Mission
from orbit.core.telemetry import FlightState, Telemetry, Vec3
from orbit.logging_.event_log import EventLogger
from orbit.protocol.messages import (
    SafetyCode,
    safety_low_battery,
    safety_estop_engaged,
    safety_estop_cleared,
    lifecycle_mode_changed,
)
from orbit.safety.rules import Command, CommandType
from orbit.safety.supervisor import SafetySupervisor

logger = logging.getLogger(__name__)


class Orchestrator:
    """Main Orbit orchestrator — runs the simulation/control loop."""

    def __init__(self, adapter: VehicleAdapter | None = None):
        # Subsystems
        self.adapter = adapter or SimAdapter()
        self.mode_manager = ModeManager()
        self.safety = SafetySupervisor()
        self.context = OrbitContext()
        self.mission = Mission()
        self.event_log = EventLogger()

        # Controllers
        self.orbit_ctrl = OrbitController()
        self.focus_ctrl = PositionController()
        self.capture_ctrl = PositionController(offset=Vec3(4.0, 0.0, 0.0), altitude_m=3.0)
        self.dock_ctrl = DockController()

        # State
        self.telemetry = Telemetry()
        self.running = False
        self.tick_rate_hz = 20.0
        self._telemetry_callbacks: list = []

        # Protocol event bus — queues subscribed by WebSocket handlers
        self._event_queues: list[asyncio.Queue] = []

        # Companion link state
        self.companion_connected = False
        self._companion_last_seen: float = 0.0
        self._companion_disconnect_time: float | None = None

        # Battery event dedup — only emit once per threshold crossing
        self._battery_warning_emitted = False
        self._battery_critical_emitted = False

    async def start(self) -> None:
        await self.adapter.connect()
        self.running = True
        logger.info("Orchestrator started")

    async def stop(self) -> None:
        self.running = False
        await self.adapter.disconnect()
        logger.info("Orchestrator stopped")

    # ── Telemetry callbacks (raw, for WebSocket outbound) ──

    def on_telemetry(self, callback) -> None:
        self._telemetry_callbacks.append(callback)

    def remove_telemetry_callback(self, callback) -> None:
        self._telemetry_callbacks = [cb for cb in self._telemetry_callbacks if cb is not callback]

    # ── Protocol event bus (for safety/lifecycle events) ──

    def on_protocol_event(self, queue: asyncio.Queue) -> None:
        self._event_queues.append(queue)

    def remove_protocol_event_queue(self, queue: asyncio.Queue) -> None:
        self._event_queues = [q for q in self._event_queues if q is not queue]

    def _emit_event(self, envelope_dict: dict) -> None:
        """Push a protocol event to all subscribed queues."""
        for q in self._event_queues:
            try:
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                q.put_nowait(envelope_dict)
            except Exception:
                pass

    # ── Companion link tracking ──

    def on_companion_connect(self) -> None:
        self.companion_connected = True
        self._companion_last_seen = time.time()
        self._companion_disconnect_time = None
        logger.info("Companion app connected")

    def on_companion_disconnect(self) -> None:
        self.companion_connected = False
        self._companion_disconnect_time = time.time()
        logger.warning("Companion disconnected — Runtime continues safe local behavior")

    # ── Main tick loop ──

    async def tick(self) -> Telemetry:
        dt = 1.0 / self.tick_rate_hz

        # 1. Advance simulation
        await self.adapter.tick(dt)

        # 2. Get telemetry
        self.telemetry = await self.adapter.get_telemetry()

        # 3. Update safety state
        prev_safety = self.safety.state
        safety_state = self.safety.update_state(self.telemetry)

        # 4. Companion link auto-land
        if not self.companion_connected and self._companion_disconnect_time:
            disconnect_duration = time.time() - self._companion_disconnect_time
            if disconnect_duration > 30.0 and self.telemetry.flight_state == FlightState.AIRBORNE:
                logger.warning("Companion lost for >30s — auto-landing")
                await self.adapter.land()
                self._transition_mode(OrbitMode.DOCK, "Companion link lost — auto-land")
                self._companion_disconnect_time = None

        self.telemetry.link_ok = self.companion_connected

        # 5. Emit battery safety events (deduplicated)
        self._check_battery_events()

        # 6. Safety overrides
        override = self.safety.get_override_command(self.telemetry)
        if override:
            await self._execute_command(override)
            if override.type == CommandType.LAND:
                self._transition_mode(OrbitMode.DOCK, "Safety auto-land")

        # 7. Run active mode controller
        elif self.telemetry.flight_state == FlightState.AIRBORNE:
            await self._run_mode_controller(dt)

        # 8. Update context
        self.context.update(
            task=self.mode_manager.current_mode.value,
            explanation=explain_state(
                self.mode_manager.current_mode, safety_state, self.telemetry.battery_pct,
            ),
        )

        # 9. Broadcast telemetry
        for callback in self._telemetry_callbacks:
            try:
                await callback(self.telemetry)
            except Exception:
                pass

        return self.telemetry

    async def run_loop(self) -> None:
        interval = 1.0 / self.tick_rate_hz
        while self.running:
            start = time.time()
            await self.tick()
            elapsed = time.time() - start
            await asyncio.sleep(max(0, interval - elapsed))

    # ── Command handling ──

    async def handle_command(self, text: str) -> dict:
        intent = parse_intent(text)
        self.event_log.log_command(text, intent.type.value, "")

        if intent.type == IntentType.UNKNOWN:
            return {
                "success": False,
                "message": intent.rejection_reason or "Unknown command",
                "mode": self.mode_manager.current_mode.value,
                "intent": intent.type.value,
            }

        result = await self._execute_intent(intent.type)
        self.event_log.log_command(text, intent.type.value, result["message"])
        return result

    async def _execute_intent(self, intent: IntentType) -> dict:
        mode = self.mode_manager.current_mode

        if intent == IntentType.ESTOP:
            cmd = Command(type=CommandType.EMERGENCY_STOP)
            allowed, reason = self.safety.validate(cmd, self.telemetry)
            if allowed:
                await self.adapter.emergency_stop()
                self._transition_mode(OrbitMode.EMERGENCY, "User e-stop")
                self._emit_event(safety_estop_engaged().to_dict())
            return {"success": allowed, "message": "Emergency stop activated", "mode": OrbitMode.EMERGENCY.value, "intent": intent.value}

        if intent == IntentType.RESET_ESTOP:
            self.safety.reset_estop()
            self._transition_mode(OrbitMode.IDLE, "E-stop cleared")
            self._emit_event(safety_estop_cleared().to_dict())
            return {"success": True, "message": "Emergency stop cleared", "mode": OrbitMode.IDLE.value, "intent": intent.value}

        if intent == IntentType.LAUNCH:
            cmd = Command(type=CommandType.ARM)
            allowed, reason = self.safety.validate(cmd, self.telemetry)
            if not allowed:
                return {"success": False, "message": reason, "mode": mode.value, "intent": intent.value}
            await self.adapter.arm()
            cmd = Command(type=CommandType.TAKEOFF, altitude_m=3.0)
            allowed, reason = self.safety.validate(cmd, self.telemetry)
            if allowed:
                await self.adapter.takeoff(3.0)
                self._transition_mode(OrbitMode.IDLE, "Launched")
            return {"success": allowed, "message": "Launching" if allowed else reason, "mode": self.mode_manager.current_mode.value, "intent": intent.value}

        if intent == IntentType.LAND:
            cmd = Command(type=CommandType.LAND)
            allowed, reason = self.safety.validate(cmd, self.telemetry)
            if allowed:
                await self.adapter.land()
                self._transition_mode(OrbitMode.IDLE, "Landing")
            return {"success": allowed, "message": "Landing" if allowed else reason, "mode": self.mode_manager.current_mode.value, "intent": intent.value}

        mode_map = {
            IntentType.ORBIT: OrbitMode.ORBIT,
            IntentType.FOCUS: OrbitMode.FOCUS,
            IntentType.GUIDE: OrbitMode.GUIDE,
            IntentType.CAPTURE: OrbitMode.CAPTURE,
            IntentType.DOCK: OrbitMode.DOCK,
        }

        target_mode = mode_map.get(intent)
        if target_mode:
            old_mode = self.mode_manager.current_mode
            success = self.mode_manager.transition(target_mode, f"User command: {intent.value}")
            if success:
                if target_mode == OrbitMode.DOCK:
                    self.dock_ctrl.reset()
                self._emit_event(lifecycle_mode_changed(
                    from_mode=old_mode.value, to_mode=target_mode.value, reason=f"User command: {intent.value}",
                ).to_dict())
            msg = f"Switched to {target_mode.value}" if success else f"Cannot switch to {target_mode.value} from {mode.value}"
            return {"success": success, "message": msg, "mode": self.mode_manager.current_mode.value, "intent": intent.value}

        if intent == IntentType.STATUS:
            return {
                "success": True,
                "message": explain_state(mode, self.safety.state, self.telemetry.battery_pct),
                "mode": mode.value,
                "intent": intent.value,
            }

        return {"success": False, "message": "Unhandled intent", "mode": mode.value, "intent": intent.value}

    # ── Helpers ──

    def _transition_mode(self, target: OrbitMode, reason: str) -> None:
        """Transition mode and emit lifecycle event."""
        old = self.mode_manager.current_mode
        self.mode_manager.force_transition(target, reason)
        self._emit_event(lifecycle_mode_changed(
            from_mode=old.value, to_mode=target.value, reason=reason,
        ).to_dict())

    def _check_battery_events(self) -> None:
        """Emit battery safety events on threshold crossings (deduplicated)."""
        pct = self.telemetry.battery_pct
        from orbit.config import config

        if pct <= config.battery_critical_pct and not self._battery_critical_emitted:
            self._battery_critical_emitted = True
            self._emit_event(safety_low_battery(
                battery_pct=pct,
                code=SafetyCode.BATTERY_CRITICAL,
                message=f"Battery critical: {pct:.0f}%",
            ).to_dict())
        elif pct <= config.battery_warn_pct and not self._battery_warning_emitted:
            self._battery_warning_emitted = True
            self._emit_event(safety_low_battery(
                battery_pct=pct,
                code=SafetyCode.BATTERY_WARNING,
                message=f"Battery low: {pct:.0f}%",
            ).to_dict())

        # Reset flags when battery recovers (e.g., after docking/charging)
        if pct > config.battery_warn_pct:
            self._battery_warning_emitted = False
            self._battery_critical_emitted = False

    async def _run_mode_controller(self, dt: float) -> None:
        mode = self.mode_manager.current_mode

        if mode == OrbitMode.ORBIT:
            target = self.orbit_ctrl.compute_target(self.telemetry, dt)
            if target:
                cmd = Command(type=CommandType.SET_POSITION, position=target)
                allowed, _ = self.safety.validate(cmd, self.telemetry)
                if allowed:
                    await self.adapter.set_position(target)

        elif mode == OrbitMode.FOCUS:
            target = self.focus_ctrl.compute_target(self.telemetry)
            if target:
                cmd = Command(type=CommandType.SET_POSITION, position=target)
                allowed, _ = self.safety.validate(cmd, self.telemetry)
                if allowed:
                    await self.adapter.set_position(target)

        elif mode == OrbitMode.CAPTURE:
            target = self.capture_ctrl.compute_target(self.telemetry)
            if target:
                cmd = Command(type=CommandType.SET_POSITION, position=target)
                allowed, _ = self.safety.validate(cmd, self.telemetry)
                if allowed:
                    await self.adapter.set_position(target)

        elif mode == OrbitMode.DOCK:
            target, should_land = self.dock_ctrl.compute_target(self.telemetry)
            if should_land:
                await self.adapter.land()
            elif target:
                cmd = Command(type=CommandType.SET_POSITION, position=target)
                allowed, _ = self.safety.validate(cmd, self.telemetry)
                if allowed:
                    await self.adapter.set_position(target)

        elif mode == OrbitMode.GUIDE:
            pass

    async def _execute_command(self, command: Command) -> None:
        if command.type == CommandType.LAND:
            await self.adapter.land()
        elif command.type == CommandType.EMERGENCY_STOP:
            await self.adapter.emergency_stop()
        elif command.type == CommandType.SET_VELOCITY and command.velocity:
            await self.adapter.set_velocity(command.velocity)
        elif command.type == CommandType.SET_POSITION and command.position:
            await self.adapter.set_position(command.position)

    def get_status(self) -> dict:
        t = self.telemetry
        return {
            "mode": self.mode_manager.current_mode.value,
            "flight_state": t.flight_state.value,
            "safety_state": self.safety.state.value,
            "battery_pct": round(t.battery_pct, 1),
            "target_locked": t.target_locked,
            "target_distance_m": round(t.target_distance_m, 1),
            "position": {"x": round(t.position.x, 2), "y": round(t.position.y, 2), "z": round(t.position.z, 2)},
            "velocity": {"x": round(t.velocity.x, 2), "y": round(t.velocity.y, 2), "z": round(t.velocity.z, 2)},
            "dock_distance_m": round(t.dock_distance_m, 1),
            "explanation": self.context.explanation,
            "estop_active": self.safety.estop_active,
            "sim_time": round(t.sim_time, 1),
            "companion_connected": self.companion_connected,
        }

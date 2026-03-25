"""Lightweight physics simulation engine for Orbit.

This replaces Gazebo/PX4 SITL for Phase 1. It models:
- 3D position and velocity with simple drag
- Battery drain proportional to thrust
- A mock target (person) that moves on a path
- A dock position (stationary)

Good enough for testing autonomy logic, UI, and safety rules.
Not a flight dynamics model — that comes with PX4 adapter later.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field

from orbit.core.telemetry import FlightState, Telemetry, Vec3


@dataclass
class SimConfig:
    """Tunable simulation parameters."""
    drag: float = 2.0              # velocity damping factor
    max_accel: float = 4.0         # m/s^2
    battery_drain_hover: float = 0.15   # %/sec while airborne
    battery_drain_moving: float = 0.25  # %/sec while moving
    battery_drain_idle: float = 0.01    # %/sec while grounded
    takeoff_speed: float = 1.5     # m/s vertical during takeoff
    land_speed: float = 1.0        # m/s vertical during landing


@dataclass
class MockTarget:
    """A mock person walking in a circle — the orbit target."""
    position: Vec3 = field(default_factory=lambda: Vec3(0.0, 0.0, 0.0))
    path_radius: float = 5.0
    path_speed: float = 0.3  # rad/s — slow walk
    path_center: Vec3 = field(default_factory=lambda: Vec3(0.0, 0.0, 0.0))

    def update(self, sim_time: float) -> None:
        angle = self.path_speed * sim_time
        self.position.x = self.path_center.x + self.path_radius * math.cos(angle)
        self.position.y = self.path_center.y + self.path_radius * math.sin(angle)
        self.position.z = 0.0


@dataclass
class MockDock:
    """Stationary backpack dock position."""
    position: Vec3 = field(default_factory=lambda: Vec3(0.0, -8.0, 0.0))


class SimEngine:
    """Lightweight 3D physics simulation for Orbit."""

    def __init__(self, config: SimConfig | None = None):
        self.config = config or SimConfig()

        # Vehicle state
        self.position = Vec3(0.0, -8.0, 0.0)  # start at dock
        self.velocity = Vec3(0.0, 0.0, 0.0)
        self.heading_deg: float = 0.0
        self.battery_pct: float = 100.0
        self.flight_state = FlightState.DOCKED
        self.is_armed: bool = False

        # Command targets
        self._target_velocity: Vec3 | None = None
        self._target_position: Vec3 | None = None
        self._takeoff_altitude: float | None = None
        self._landing: bool = False
        self._emergency: bool = False

        # World
        self.target = MockTarget()
        self.dock = MockDock()

        # Time
        self.sim_time: float = 0.0

    def arm(self) -> bool:
        if self.flight_state in (FlightState.GROUNDED, FlightState.DOCKED):
            self.is_armed = True
            self.flight_state = FlightState.GROUNDED
            return True
        return False

    def disarm(self) -> bool:
        if self.flight_state in (FlightState.GROUNDED, FlightState.DOCKED):
            self.is_armed = False
            return True
        return False

    def command_takeoff(self, altitude_m: float) -> bool:
        if not self.is_armed or self.flight_state not in (FlightState.GROUNDED, FlightState.DOCKED):
            return False
        self._takeoff_altitude = max(1.0, min(altitude_m, 30.0))
        self.flight_state = FlightState.TAKING_OFF
        self._landing = False
        self._target_position = None
        self._target_velocity = None
        return True

    def command_land(self) -> bool:
        if self.flight_state != FlightState.AIRBORNE:
            return False
        self._landing = True
        self.flight_state = FlightState.LANDING
        self._target_position = None
        self._target_velocity = None
        self._takeoff_altitude = None
        return True

    def command_velocity(self, vel: Vec3) -> None:
        self._target_velocity = vel
        self._target_position = None

    def command_position(self, pos: Vec3) -> None:
        self._target_position = pos
        self._target_velocity = None

    def command_emergency_stop(self) -> None:
        self._emergency = True
        self._target_velocity = None
        self._target_position = None
        self._takeoff_altitude = None
        self._landing = False

    def tick(self, dt: float) -> Telemetry:
        """Advance simulation by dt seconds. Returns telemetry snapshot."""
        self.sim_time += dt
        cfg = self.config

        # Update mock world
        self.target.update(self.sim_time)

        # Emergency — kill all motion
        if self._emergency:
            self.velocity = Vec3(0.0, 0.0, -2.0)  # descend
            if self.position.z <= 0.05:
                self.position.z = 0.0
                self.velocity = Vec3()
                self.flight_state = FlightState.EMERGENCY
                self.is_armed = False
            else:
                self.flight_state = FlightState.EMERGENCY

        # Takeoff
        elif self.flight_state == FlightState.TAKING_OFF:
            self.velocity = Vec3(0.0, 0.0, cfg.takeoff_speed)
            if self._takeoff_altitude and self.position.z >= self._takeoff_altitude:
                self.position.z = self._takeoff_altitude
                self.velocity = Vec3()
                self.flight_state = FlightState.AIRBORNE
                self._takeoff_altitude = None

        # Landing
        elif self.flight_state == FlightState.LANDING:
            self.velocity = Vec3(0.0, 0.0, -cfg.land_speed)
            if self.position.z <= 0.05:
                self.position.z = 0.0
                self.velocity = Vec3()
                self.flight_state = FlightState.GROUNDED
                self._landing = False
                # Check if near dock
                if self.position.distance_to(self.dock.position) < 1.0:
                    self.flight_state = FlightState.DOCKED

        # Airborne — respond to velocity or position commands
        elif self.flight_state == FlightState.AIRBORNE:
            if self._target_position:
                # Simple proportional control toward target position
                dx = self._target_position.x - self.position.x
                dy = self._target_position.y - self.position.y
                dz = self._target_position.z - self.position.z
                dist = max((dx**2 + dy**2 + dz**2) ** 0.5, 0.01)
                # Scale speed based on distance (slow approach)
                speed = min(cfg.max_accel, dist * 1.5)
                self.velocity.x = (dx / dist) * speed
                self.velocity.y = (dy / dist) * speed
                self.velocity.z = (dz / dist) * speed
            elif self._target_velocity:
                # Apply commanded velocity with acceleration limit
                self.velocity.x += _clamp_accel(self._target_velocity.x - self.velocity.x, cfg.max_accel, dt)
                self.velocity.y += _clamp_accel(self._target_velocity.y - self.velocity.y, cfg.max_accel, dt)
                self.velocity.z += _clamp_accel(self._target_velocity.z - self.velocity.z, cfg.max_accel, dt)
            else:
                # No command — apply drag to hover in place
                self.velocity.x *= max(0, 1.0 - cfg.drag * dt)
                self.velocity.y *= max(0, 1.0 - cfg.drag * dt)
                self.velocity.z *= max(0, 1.0 - cfg.drag * dt)

        # Integrate position
        self.position.x += self.velocity.x * dt
        self.position.y += self.velocity.y * dt
        self.position.z += self.velocity.z * dt

        # Clamp altitude
        if self.position.z < 0:
            self.position.z = 0.0

        # Update heading based on velocity
        speed_xy = (self.velocity.x ** 2 + self.velocity.y ** 2) ** 0.5
        if speed_xy > 0.1:
            self.heading_deg = math.degrees(math.atan2(self.velocity.y, self.velocity.x))

        # Battery drain
        if self.flight_state == FlightState.AIRBORNE:
            drain = cfg.battery_drain_moving if self.velocity.speed() > 0.5 else cfg.battery_drain_hover
        elif self.flight_state in (FlightState.TAKING_OFF, FlightState.LANDING):
            drain = cfg.battery_drain_hover
        else:
            drain = cfg.battery_drain_idle
        self.battery_pct = max(0.0, self.battery_pct - drain * dt)

        # Build telemetry
        target_dist = self.position.distance_to(self.target.position) if self.target else 0.0
        dock_dist = self.position.distance_to(self.dock.position) if self.dock else 0.0

        return Telemetry(
            timestamp=time.time(),
            sim_time=self.sim_time,
            position=Vec3(self.position.x, self.position.y, self.position.z),
            velocity=Vec3(self.velocity.x, self.velocity.y, self.velocity.z),
            heading_deg=self.heading_deg,
            flight_state=self.flight_state,
            battery_pct=self.battery_pct,
            target_position=Vec3(self.target.position.x, self.target.position.y, self.target.position.z),
            target_locked=target_dist < 15.0 and self.flight_state == FlightState.AIRBORNE,
            target_distance_m=target_dist,
            dock_position=Vec3(self.dock.position.x, self.dock.position.y, self.dock.position.z),
            dock_distance_m=dock_dist,
            is_emergency=self._emergency,
            geofence_ok=True,  # checked by safety supervisor
            link_ok=True,
        )

    def reset(self) -> None:
        """Reset simulation to initial state."""
        self.__init__(self.config)


def _clamp_accel(delta: float, max_accel: float, dt: float) -> float:
    max_change = max_accel * dt
    return max(-max_change, min(max_change, delta))

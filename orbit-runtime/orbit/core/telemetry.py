"""Normalized telemetry model — the single source of truth for Orbit's state.

Every adapter (sim, PX4, real hardware) must produce this same model.
The UI, safety supervisor, and autonomy logic all consume this model.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum


class FlightState(str, Enum):
    """Low-level flight state from the vehicle."""
    GROUNDED = "grounded"
    TAKING_OFF = "taking_off"
    AIRBORNE = "airborne"
    LANDING = "landing"
    DOCKED = "docked"
    EMERGENCY = "emergency"


@dataclass
class Vec3:
    """3D vector for position/velocity."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def distance_to(self, other: Vec3) -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2 + (self.z - other.z) ** 2) ** 0.5

    def speed(self) -> float:
        return (self.x ** 2 + self.y ** 2 + self.z ** 2) ** 0.5


@dataclass
class Telemetry:
    """Complete telemetry snapshot from the vehicle."""

    # Timing
    timestamp: float = field(default_factory=time.time)
    sim_time: float = 0.0

    # Position and motion (meters, m/s)
    position: Vec3 = field(default_factory=Vec3)
    velocity: Vec3 = field(default_factory=Vec3)
    heading_deg: float = 0.0

    # Flight state
    flight_state: FlightState = FlightState.GROUNDED

    # Battery (0-100%)
    battery_pct: float = 100.0

    # Target tracking (mock)
    target_position: Vec3 | None = None
    target_locked: bool = False
    target_distance_m: float = 0.0

    # Dock
    dock_position: Vec3 | None = None
    dock_distance_m: float = 0.0

    # Safety
    is_emergency: bool = False
    geofence_ok: bool = True
    link_ok: bool = True

    def to_dict(self) -> dict:
        """Serialize for WebSocket transmission."""
        return {
            "timestamp": self.timestamp,
            "sim_time": self.sim_time,
            "position": {"x": self.position.x, "y": self.position.y, "z": self.position.z},
            "velocity": {"x": self.velocity.x, "y": self.velocity.y, "z": self.velocity.z},
            "heading_deg": self.heading_deg,
            "flight_state": self.flight_state.value,
            "battery_pct": round(self.battery_pct, 1),
            "target_locked": self.target_locked,
            "target_distance_m": round(self.target_distance_m, 1),
            "target_position": (
                {"x": self.target_position.x, "y": self.target_position.y, "z": self.target_position.z}
                if self.target_position else None
            ),
            "dock_position": (
                {"x": self.dock_position.x, "y": self.dock_position.y, "z": self.dock_position.z}
                if self.dock_position else None
            ),
            "dock_distance_m": round(self.dock_distance_m, 1),
            "is_emergency": self.is_emergency,
            "geofence_ok": self.geofence_ok,
            "link_ok": self.link_ok,
        }

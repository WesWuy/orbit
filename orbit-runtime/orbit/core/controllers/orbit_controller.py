"""Orbit Controller — computes position targets to circle around the target.

The drone orbits the target at a configurable radius and altitude,
maintaining a constant angular velocity. The orbit plane is horizontal.
"""

from __future__ import annotations

import math

from orbit.core.telemetry import Telemetry, Vec3


class OrbitController:
    """Generates position commands to orbit around a target."""

    def __init__(
        self,
        radius_m: float = 5.0,
        altitude_m: float = 3.0,
        angular_speed: float = 0.5,  # rad/s — one full orbit in ~12.5 seconds
    ):
        self.radius_m = radius_m
        self.altitude_m = altitude_m
        self.angular_speed = angular_speed
        self._angle: float = 0.0

    def compute_target(self, telemetry: Telemetry, dt: float) -> Vec3 | None:
        """Compute the next orbit position. Returns None if no target locked."""
        if telemetry.target_position is None:
            return None

        self._angle += self.angular_speed * dt

        target = telemetry.target_position
        x = target.x + self.radius_m * math.cos(self._angle)
        y = target.y + self.radius_m * math.sin(self._angle)
        z = self.altitude_m

        return Vec3(x, y, z)

    def reset(self) -> None:
        self._angle = 0.0

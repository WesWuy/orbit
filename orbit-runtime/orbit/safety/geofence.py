"""Geofence definitions and utilities."""

from __future__ import annotations

from dataclasses import dataclass, field

from orbit.core.telemetry import Vec3
from orbit.config import config


@dataclass
class CircularGeofence:
    """A horizontal circular geofence with altitude ceiling."""
    center: Vec3 = field(default_factory=lambda: Vec3(0.0, 0.0, 0.0))
    radius_m: float = config.geofence_radius_m
    max_altitude_m: float = config.max_altitude_m

    def contains(self, pos: Vec3) -> bool:
        horizontal_dist = ((pos.x - self.center.x) ** 2 + (pos.y - self.center.y) ** 2) ** 0.5
        return horizontal_dist <= self.radius_m and pos.z <= self.max_altitude_m

    def distance_to_boundary(self, pos: Vec3) -> float:
        horizontal_dist = ((pos.x - self.center.x) ** 2 + (pos.y - self.center.y) ** 2) ** 0.5
        return self.radius_m - horizontal_dist

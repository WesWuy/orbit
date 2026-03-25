"""Mock world objects for simulation.

These provide synthetic targets, obstacles, and dock positions
for testing autonomy behaviors without real sensor data.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from orbit.core.telemetry import Vec3


@dataclass
class MockPerson:
    """A simulated person the drone should follow/orbit."""
    position: Vec3 = field(default_factory=lambda: Vec3(0.0, 0.0, 0.0))
    walking: bool = True
    name: str = "user"


@dataclass
class MockBackpackDock:
    """A simulated backpack dock."""
    position: Vec3 = field(default_factory=lambda: Vec3(0.0, -8.0, 0.0))
    is_open: bool = True
    charging: bool = False

    def is_within_landing_zone(self, drone_pos: Vec3, threshold_m: float = 0.5) -> bool:
        return drone_pos.distance_to(self.position) < threshold_m


@dataclass
class MockGeofence:
    """A circular geofence centered on a point."""
    center: Vec3 = field(default_factory=lambda: Vec3(0.0, 0.0, 0.0))
    radius_m: float = 100.0

    def contains(self, pos: Vec3) -> bool:
        horizontal_dist = ((pos.x - self.center.x) ** 2 + (pos.y - self.center.y) ** 2) ** 0.5
        return horizontal_dist <= self.radius_m

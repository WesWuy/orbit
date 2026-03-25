"""Dock Controller — guides the drone back to the backpack dock.

Three-phase approach:
  1. Fly to a point above the dock (approach altitude)
  2. Descend vertically to dock height
  3. Land

This is intentionally simple. A real implementation would use
precision landing with fiducial markers.
"""

from __future__ import annotations

from enum import Enum

from orbit.core.telemetry import Telemetry, Vec3


class DockPhase(str, Enum):
    APPROACH = "approach"       # fly to above dock
    DESCEND = "descend"         # descend vertically
    LAND = "land"               # final landing
    COMPLETE = "complete"


class DockController:
    """Guides the drone to land on the backpack dock."""

    def __init__(self, approach_altitude_m: float = 4.0, landing_threshold_m: float = 0.5):
        self.approach_altitude_m = approach_altitude_m
        self.landing_threshold_m = landing_threshold_m
        self.phase = DockPhase.APPROACH

    def compute_target(self, telemetry: Telemetry) -> tuple[Vec3 | None, bool]:
        """Compute next position target for docking.

        Returns (target_position, should_land).
        should_land=True means the autonomy loop should issue a land command.
        """
        if telemetry.dock_position is None:
            return None, False

        dock = telemetry.dock_position
        pos = telemetry.position

        if self.phase == DockPhase.APPROACH:
            # Fly to above the dock
            target = Vec3(dock.x, dock.y, self.approach_altitude_m)
            horiz_dist = ((pos.x - dock.x) ** 2 + (pos.y - dock.y) ** 2) ** 0.5
            if horiz_dist < self.landing_threshold_m:
                self.phase = DockPhase.DESCEND
            return target, False

        elif self.phase == DockPhase.DESCEND:
            # Descend vertically above dock
            target = Vec3(dock.x, dock.y, 0.5)  # just above ground
            if pos.z < 0.8:
                self.phase = DockPhase.LAND
            return target, False

        elif self.phase == DockPhase.LAND:
            self.phase = DockPhase.COMPLETE
            return None, True  # signal to land

        return None, False

    def reset(self) -> None:
        self.phase = DockPhase.APPROACH

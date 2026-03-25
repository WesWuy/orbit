"""Position Controller — holds a fixed position relative to the target.

Used by Focus and Capture modes. The drone maintains a position offset
from the target (e.g., 3m in front, 2m up).
"""

from __future__ import annotations

from orbit.core.telemetry import Telemetry, Vec3


class PositionController:
    """Holds position at a fixed offset from the target."""

    def __init__(
        self,
        offset: Vec3 | None = None,
        altitude_m: float = 2.5,
    ):
        # Default: 3m in front of target, at altitude
        self.offset = offset or Vec3(3.0, 0.0, 0.0)
        self.altitude_m = altitude_m

    def compute_target(self, telemetry: Telemetry) -> Vec3 | None:
        """Compute the hold position. Returns None if no target locked."""
        if telemetry.target_position is None:
            return None

        target = telemetry.target_position
        return Vec3(
            target.x + self.offset.x,
            target.y + self.offset.y,
            self.altitude_m,
        )

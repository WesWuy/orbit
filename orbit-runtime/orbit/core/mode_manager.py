"""Mode Manager — explicit finite state machine for Orbit behaviors.

Modes:
  IDLE     → armed but grounded, waiting for command
  ORBIT    → circling around the target
  FOCUS    → holding position near target, facing it
  GUIDE    → following a waypoint sequence or navigation path
  CAPTURE  → stable hover for camera/recording
  DOCK     → returning to backpack dock and landing

Transitions are validated — not every mode can transition to every other.
The safety supervisor can force transitions (e.g., to DOCK on low battery).
"""

from __future__ import annotations

import logging
import time
from enum import Enum

logger = logging.getLogger(__name__)


class OrbitMode(str, Enum):
    IDLE = "idle"
    ORBIT = "orbit"
    FOCUS = "focus"
    GUIDE = "guide"
    CAPTURE = "capture"
    DOCK = "dock"
    EMERGENCY = "emergency"


# Valid transitions: from_mode → set of allowed to_modes
TRANSITIONS: dict[OrbitMode, set[OrbitMode]] = {
    OrbitMode.IDLE: {OrbitMode.ORBIT, OrbitMode.FOCUS, OrbitMode.GUIDE, OrbitMode.CAPTURE, OrbitMode.DOCK, OrbitMode.EMERGENCY},
    OrbitMode.ORBIT: {OrbitMode.FOCUS, OrbitMode.GUIDE, OrbitMode.CAPTURE, OrbitMode.DOCK, OrbitMode.IDLE, OrbitMode.EMERGENCY},
    OrbitMode.FOCUS: {OrbitMode.ORBIT, OrbitMode.GUIDE, OrbitMode.CAPTURE, OrbitMode.DOCK, OrbitMode.IDLE, OrbitMode.EMERGENCY},
    OrbitMode.GUIDE: {OrbitMode.ORBIT, OrbitMode.FOCUS, OrbitMode.CAPTURE, OrbitMode.DOCK, OrbitMode.IDLE, OrbitMode.EMERGENCY},
    OrbitMode.CAPTURE: {OrbitMode.ORBIT, OrbitMode.FOCUS, OrbitMode.GUIDE, OrbitMode.DOCK, OrbitMode.IDLE, OrbitMode.EMERGENCY},
    OrbitMode.DOCK: {OrbitMode.IDLE, OrbitMode.EMERGENCY},  # dock can only go to idle (after docked) or emergency
    OrbitMode.EMERGENCY: {OrbitMode.IDLE},  # emergency can only be cleared to idle
}


class ModeTransition:
    """Record of a mode transition."""
    def __init__(self, from_mode: OrbitMode, to_mode: OrbitMode, reason: str):
        self.from_mode = from_mode
        self.to_mode = to_mode
        self.reason = reason
        self.timestamp = time.time()


class ModeManager:
    """Manages Orbit's behavioral mode FSM."""

    def __init__(self):
        self.current_mode = OrbitMode.IDLE
        self.history: list[ModeTransition] = []

    def transition(self, target_mode: OrbitMode, reason: str = "") -> bool:
        """Attempt a mode transition. Returns True if successful."""
        if target_mode == self.current_mode:
            return True  # already there

        allowed = TRANSITIONS.get(self.current_mode, set())
        if target_mode not in allowed:
            logger.warning(
                f"Invalid transition {self.current_mode} → {target_mode}: not allowed"
            )
            return False

        transition = ModeTransition(self.current_mode, target_mode, reason)
        self.history.append(transition)

        logger.info(f"Mode: {self.current_mode} → {target_mode} ({reason})")
        self.current_mode = target_mode
        return True

    def force_transition(self, target_mode: OrbitMode, reason: str = "") -> None:
        """Safety supervisor forced transition — bypasses validation."""
        transition = ModeTransition(self.current_mode, target_mode, reason)
        self.history.append(transition)
        logger.warning(f"FORCED Mode: {self.current_mode} → {target_mode} ({reason})")
        self.current_mode = target_mode

    def get_recent_transitions(self, count: int = 10) -> list[dict]:
        return [
            {
                "from": t.from_mode.value,
                "to": t.to_mode.value,
                "reason": t.reason,
                "timestamp": t.timestamp,
            }
            for t in self.history[-count:]
        ]

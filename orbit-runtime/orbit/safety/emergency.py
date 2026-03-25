"""Emergency handling — loss-of-link, loss-of-target, and failsafe behaviors.

These are the fallback behaviors when things go wrong.
They are not autonomy modes — they are safety overrides.
"""

from __future__ import annotations

from enum import Enum

from orbit.core.telemetry import Telemetry
from orbit.safety.rules import Command, CommandType


class FailsafeAction(str, Enum):
    HOLD = "hold"         # hover in place
    LAND = "land"         # land at current position
    RETURN_DOCK = "return_dock"  # return to dock and land


def loss_of_link_action(telemetry: Telemetry, seconds_lost: float) -> Command:
    """Determine action when communication is lost.

    Policy:
      < 5 seconds: hold position
      5-30 seconds: land in place
      > 30 seconds: would return to dock (future — for now, land)
    """
    if seconds_lost < 5.0:
        return Command(type=CommandType.SET_VELOCITY)  # zero velocity = hover
    return Command(type=CommandType.LAND)


def loss_of_target_action(telemetry: Telemetry, seconds_lost: float) -> Command | None:
    """Determine action when the tracking target is lost.

    Policy:
      < 10 seconds: hold position, wait for reacquisition
      > 10 seconds: return None (let mode manager decide)
    """
    if seconds_lost < 10.0:
        return Command(type=CommandType.SET_VELOCITY)  # hover
    return None  # hand back to mode manager

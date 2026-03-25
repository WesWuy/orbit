"""Safety rules — hard limits that cannot be overridden by autonomy logic.

Each rule is a pure function: (telemetry, command) → (allowed, reason).
Rules are evaluated in order. First rejection wins.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Protocol

from orbit.config import config
from orbit.core.telemetry import Telemetry, Vec3


class CommandType(str, Enum):
    TAKEOFF = "takeoff"
    LAND = "land"
    SET_VELOCITY = "set_velocity"
    SET_POSITION = "set_position"
    EMERGENCY_STOP = "emergency_stop"
    ARM = "arm"
    DISARM = "disarm"
    CHANGE_MODE = "change_mode"


@dataclass
class Command:
    """A command destined for the vehicle adapter."""
    type: CommandType
    velocity: Vec3 | None = None
    position: Vec3 | None = None
    altitude_m: float | None = None
    mode: str | None = None


@dataclass
class RuleResult:
    """Result of a safety rule check."""
    allowed: bool
    rule_name: str
    reason: str = ""


class SafetyRule(Protocol):
    """Protocol for a safety rule."""
    name: str
    def check(self, telemetry: Telemetry, command: Command) -> RuleResult: ...


class MaxSpeedRule:
    """Clamp velocity commands to max speed."""
    name = "max_speed"

    def check(self, telemetry: Telemetry, command: Command) -> RuleResult:
        if command.type != CommandType.SET_VELOCITY or command.velocity is None:
            return RuleResult(allowed=True, rule_name=self.name)

        speed = command.velocity.speed()
        if speed > config.max_speed_ms:
            return RuleResult(
                allowed=False,
                rule_name=self.name,
                reason=f"Speed {speed:.1f} m/s exceeds max {config.max_speed_ms} m/s",
            )
        return RuleResult(allowed=True, rule_name=self.name)


class MaxAltitudeRule:
    """Reject position/takeoff commands above max altitude."""
    name = "max_altitude"

    def check(self, telemetry: Telemetry, command: Command) -> RuleResult:
        alt = None
        if command.type == CommandType.TAKEOFF:
            alt = command.altitude_m
        elif command.type == CommandType.SET_POSITION and command.position:
            alt = command.position.z

        if alt is not None and alt > config.max_altitude_m:
            return RuleResult(
                allowed=False,
                rule_name=self.name,
                reason=f"Altitude {alt:.1f}m exceeds max {config.max_altitude_m}m",
            )
        return RuleResult(allowed=True, rule_name=self.name)


class MinAltitudeRule:
    """Prevent position commands below min altitude while airborne."""
    name = "min_altitude"

    def check(self, telemetry: Telemetry, command: Command) -> RuleResult:
        if command.type == CommandType.SET_POSITION and command.position:
            if command.position.z < config.min_altitude_m:
                return RuleResult(
                    allowed=False,
                    rule_name=self.name,
                    reason=f"Altitude {command.position.z:.1f}m below min {config.min_altitude_m}m",
                )
        return RuleResult(allowed=True, rule_name=self.name)


class BatteryCriticalRule:
    """Block non-landing commands when battery is critical."""
    name = "battery_critical"

    def check(self, telemetry: Telemetry, command: Command) -> RuleResult:
        if telemetry.battery_pct <= config.battery_critical_pct:
            if command.type not in (CommandType.LAND, CommandType.EMERGENCY_STOP):
                return RuleResult(
                    allowed=False,
                    rule_name=self.name,
                    reason=f"Battery critical at {telemetry.battery_pct:.0f}% — only landing/e-stop allowed",
                )
        return RuleResult(allowed=True, rule_name=self.name)


class GeofenceRule:
    """Reject position commands outside the geofence."""
    name = "geofence"

    def check(self, telemetry: Telemetry, command: Command) -> RuleResult:
        if command.type == CommandType.SET_POSITION and command.position:
            dist = ((command.position.x ** 2) + (command.position.y ** 2)) ** 0.5
            if dist > config.geofence_radius_m:
                return RuleResult(
                    allowed=False,
                    rule_name=self.name,
                    reason=f"Position {dist:.0f}m from origin exceeds geofence {config.geofence_radius_m}m",
                )
        return RuleResult(allowed=True, rule_name=self.name)


class EmergencyAlwaysAllowedRule:
    """Emergency stop is always allowed — this rule runs first."""
    name = "emergency_always_allowed"

    def check(self, telemetry: Telemetry, command: Command) -> RuleResult:
        # This is handled specially in the supervisor — always passes
        return RuleResult(allowed=True, rule_name=self.name)


# Default rule set — order matters
DEFAULT_RULES: list[SafetyRule] = [
    EmergencyAlwaysAllowedRule(),
    BatteryCriticalRule(),
    MaxSpeedRule(),
    MaxAltitudeRule(),
    MinAltitudeRule(),
    GeofenceRule(),
]

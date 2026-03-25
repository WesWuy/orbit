"""Safety Supervisor — the mandatory gateway for all vehicle commands.

Every command from autonomy/brain passes through here before reaching
the vehicle adapter. The supervisor can:
  - Allow a command
  - Reject a command (with reason)
  - Override autonomy (force land, e-stop)
  - Emit safety events for logging

This is NOT optional. It is the pipeline.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from enum import Enum

from orbit.core.telemetry import Telemetry
from orbit.safety.rules import (
    Command,
    CommandType,
    RuleResult,
    SafetyRule,
    DEFAULT_RULES,
)
from orbit.config import config

logger = logging.getLogger(__name__)


class SafetyState(str, Enum):
    NOMINAL = "nominal"
    WARNING = "warning"        # battery low, near geofence
    CRITICAL = "critical"      # battery critical, link lost
    EMERGENCY = "emergency"    # e-stop active


@dataclass
class SafetyEvent:
    """A logged safety event."""
    timestamp: float
    event_type: str
    rule_name: str
    message: str
    command: Command | None = None


class SafetySupervisor:
    """Validates all commands against safety rules before they reach the vehicle."""

    def __init__(self, rules: list[SafetyRule] | None = None):
        self.rules = rules or list(DEFAULT_RULES)
        self.state = SafetyState.NOMINAL
        self.events: list[SafetyEvent] = []
        self.estop_active: bool = False
        self._last_telemetry: Telemetry | None = None

    def validate(self, command: Command, telemetry: Telemetry) -> tuple[bool, str]:
        """Validate a command against all safety rules.

        Returns (allowed, reason). If allowed is False, reason explains why.
        Emergency stop is ALWAYS allowed — no rule can block it.
        """
        # Emergency stop bypasses all rules
        if command.type == CommandType.EMERGENCY_STOP:
            self.estop_active = True
            self.state = SafetyState.EMERGENCY
            self._log_event("emergency_stop", "estop", "Emergency stop activated")
            return True, "Emergency stop always allowed"

        # If e-stop is active, only allow disarm
        if self.estop_active:
            if command.type == CommandType.DISARM:
                return True, "Disarm allowed during e-stop"
            return False, "E-stop active — only disarm allowed. Reset e-stop first."

        # Run all rules
        for rule in self.rules:
            result = rule.check(telemetry, command)
            if not result.allowed:
                self._log_event("rejected", result.rule_name, result.reason, command)
                logger.warning(f"Command {command.type} rejected by {result.rule_name}: {result.reason}")
                return False, result.reason

        return True, "OK"

    def update_state(self, telemetry: Telemetry) -> SafetyState:
        """Update safety state based on current telemetry. Called every tick."""
        self._last_telemetry = telemetry

        if self.estop_active:
            self.state = SafetyState.EMERGENCY
            return self.state

        if telemetry.is_emergency:
            self.state = SafetyState.EMERGENCY
            return self.state

        # Check for critical conditions
        if telemetry.battery_pct <= config.battery_critical_pct:
            self.state = SafetyState.CRITICAL
            self._log_event("battery_critical", "battery", f"Battery at {telemetry.battery_pct:.0f}%")
            return self.state

        if not telemetry.link_ok:
            self.state = SafetyState.CRITICAL
            self._log_event("link_lost", "link", "Communication link lost")
            return self.state

        # Check for warnings
        if telemetry.battery_pct <= config.battery_warn_pct:
            self.state = SafetyState.WARNING
            return self.state

        if not telemetry.geofence_ok:
            self.state = SafetyState.WARNING
            return self.state

        self.state = SafetyState.NOMINAL
        return self.state

    def get_override_command(self, telemetry: Telemetry) -> Command | None:
        """If the safety state demands an autonomous override, return it.

        This handles scenarios where the supervisor must take control
        away from the autonomy logic (e.g., auto-land on critical battery).
        """
        if telemetry.battery_pct <= config.battery_critical_pct:
            self._log_event("auto_land", "battery", "Forcing landing — battery critical")
            return Command(type=CommandType.LAND)

        if not telemetry.link_ok:
            self._log_event("auto_land", "link", "Forcing landing — link lost")
            return Command(type=CommandType.LAND)

        return None

    def reset_estop(self) -> None:
        """Clear e-stop state. Requires explicit user action."""
        self.estop_active = False
        self.state = SafetyState.NOMINAL
        self._log_event("estop_reset", "estop", "E-stop cleared by user")

    def get_recent_events(self, count: int = 20) -> list[SafetyEvent]:
        return self.events[-count:]

    def _log_event(
        self, event_type: str, rule_name: str, message: str, command: Command | None = None
    ) -> None:
        event = SafetyEvent(
            timestamp=time.time(),
            event_type=event_type,
            rule_name=rule_name,
            message=message,
            command=command,
        )
        self.events.append(event)
        # Keep event list bounded
        if len(self.events) > 1000:
            self.events = self.events[-500:]

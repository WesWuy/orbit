"""Event logging — structured log of all Orbit events.

Captures commands, mode transitions, safety events, and telemetry
snapshots for debugging and replay.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path


class EventType(str, Enum):
    COMMAND = "command"
    MODE_TRANSITION = "mode_transition"
    SAFETY = "safety"
    TELEMETRY_SNAPSHOT = "telemetry_snapshot"
    SYSTEM = "system"


@dataclass
class LogEvent:
    """A single log event."""
    timestamp: float = field(default_factory=time.time)
    event_type: EventType = EventType.SYSTEM
    data: dict = field(default_factory=dict)


class EventLogger:
    """In-memory event logger with optional file persistence."""

    def __init__(self, max_events: int = 5000, log_dir: str | None = None):
        self.events: list[LogEvent] = []
        self.max_events = max_events
        self.log_dir = Path(log_dir) if log_dir else None
        if self.log_dir:
            self.log_dir.mkdir(parents=True, exist_ok=True)

    def log(self, event_type: EventType, data: dict) -> None:
        event = LogEvent(event_type=event_type, data=data)
        self.events.append(event)
        if len(self.events) > self.max_events:
            self.events = self.events[-self.max_events // 2:]

    def log_command(self, text: str, intent: str, result: str) -> None:
        self.log(EventType.COMMAND, {"text": text, "intent": intent, "result": result})

    def log_mode_transition(self, from_mode: str, to_mode: str, reason: str) -> None:
        self.log(EventType.MODE_TRANSITION, {"from": from_mode, "to": to_mode, "reason": reason})

    def log_safety_event(self, rule: str, message: str) -> None:
        self.log(EventType.SAFETY, {"rule": rule, "message": message})

    def get_recent(self, count: int = 50, event_type: EventType | None = None) -> list[dict]:
        filtered = self.events
        if event_type:
            filtered = [e for e in filtered if e.event_type == event_type]
        return [
            {"timestamp": e.timestamp, "type": e.event_type.value, "data": e.data}
            for e in filtered[-count:]
        ]

    def save_session(self, filename: str | None = None) -> str | None:
        """Save current session to a JSON file."""
        if not self.log_dir:
            return None
        fname = filename or f"session_{int(time.time())}.json"
        path = self.log_dir / fname
        with open(path, "w") as f:
            json.dump(self.get_recent(count=len(self.events)), f, indent=2)
        return str(path)

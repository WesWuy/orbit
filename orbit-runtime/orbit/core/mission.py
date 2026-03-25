"""Mission/Task manager — stub for Phase 1.

Future: manages sequences of waypoints, task queues, and multi-step missions.
For now, holds simple state about what Orbit is "doing" and why.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Mission:
    """Current mission/task state."""
    name: str = "idle"
    description: str = "Waiting for commands"
    active: bool = False
    waypoints: list[dict] = field(default_factory=list)

    def set(self, name: str, description: str) -> None:
        self.name = name
        self.description = description
        self.active = True

    def clear(self) -> None:
        self.name = "idle"
        self.description = "Waiting for commands"
        self.active = False
        self.waypoints.clear()

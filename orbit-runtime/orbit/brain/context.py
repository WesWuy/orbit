"""Context engine — stub for Phase 1.

Future: integrates task context, calendar, location, weather, etc.
For now: holds a description of what Orbit is doing and why.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class OrbitContext:
    """Current context state."""
    task: str = "none"
    explanation: str = "Orbit is idle."
    suggestions: list[str] | None = None

    def update(self, task: str, explanation: str, suggestions: list[str] | None = None) -> None:
        self.task = task
        self.explanation = explanation
        self.suggestions = suggestions or []

    def to_dict(self) -> dict:
        return {
            "task": self.task,
            "explanation": self.explanation,
            "suggestions": self.suggestions or [],
        }

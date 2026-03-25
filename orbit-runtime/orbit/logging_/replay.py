"""Replay engine — stub for Phase 1.

Future: replays telemetry snapshots for debugging and visualization.
"""

from __future__ import annotations


class ReplayEngine:
    """Replays recorded telemetry sessions. Stub for Phase 1."""

    def __init__(self):
        self.snapshots: list[dict] = []
        self.index: int = 0
        self.playing: bool = False

    def load(self, snapshots: list[dict]) -> None:
        self.snapshots = snapshots
        self.index = 0

    def step(self) -> dict | None:
        if self.index >= len(self.snapshots):
            self.playing = False
            return None
        snap = self.snapshots[self.index]
        self.index += 1
        return snap

    def reset(self) -> None:
        self.index = 0
        self.playing = False

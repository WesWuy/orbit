"""Telemetry snapshot logger — captures periodic telemetry for replay."""

from __future__ import annotations

from orbit.core.telemetry import Telemetry


class TelemetryLogger:
    """Captures telemetry snapshots at a configurable interval."""

    def __init__(self, interval_ticks: int = 10, max_snapshots: int = 10000):
        self.interval_ticks = interval_ticks
        self.max_snapshots = max_snapshots
        self.snapshots: list[dict] = []
        self._tick_count = 0

    def record(self, telemetry: Telemetry) -> None:
        self._tick_count += 1
        if self._tick_count % self.interval_ticks == 0:
            self.snapshots.append(telemetry.to_dict())
            if len(self.snapshots) > self.max_snapshots:
                self.snapshots = self.snapshots[-self.max_snapshots // 2:]

    def get_snapshots(self, count: int = 100) -> list[dict]:
        return self.snapshots[-count:]

    def clear(self) -> None:
        self.snapshots.clear()
        self._tick_count = 0

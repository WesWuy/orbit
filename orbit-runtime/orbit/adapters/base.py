"""VehicleAdapter — the most important abstraction in Orbit.

This ABC defines the boundary between Orbit's autonomy logic and any
vehicle implementation (simulator, PX4 SITL, real hardware).

Rules:
  - Autonomy logic NEVER talks to hardware/sim directly. Only through this interface.
  - Every adapter must produce normalized Telemetry on every tick.
  - Every adapter must respect the commanded velocity/position targets.
  - The safety supervisor sits ABOVE this adapter and filters commands
    before they reach it.
  - Real hardware adapters are a LATER PHASE and require explicit safety review.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from orbit.core.telemetry import Telemetry, Vec3


class VehicleAdapter(ABC):
    """Abstract interface for any vehicle backend (sim or real)."""

    @abstractmethod
    async def connect(self) -> None:
        """Initialize the vehicle connection."""

    @abstractmethod
    async def disconnect(self) -> None:
        """Clean shutdown."""

    @abstractmethod
    async def arm(self) -> bool:
        """Arm the vehicle. Returns True if successful."""

    @abstractmethod
    async def disarm(self) -> bool:
        """Disarm the vehicle. Returns True if successful."""

    @abstractmethod
    async def takeoff(self, altitude_m: float) -> bool:
        """Command takeoff to the given altitude."""

    @abstractmethod
    async def land(self) -> bool:
        """Command landing at current position."""

    @abstractmethod
    async def set_velocity(self, velocity: Vec3) -> None:
        """Set target velocity vector (m/s). Safety supervisor has already clamped this."""

    @abstractmethod
    async def set_position(self, position: Vec3) -> None:
        """Set target position (meters). Vehicle should fly toward this point."""

    @abstractmethod
    async def emergency_stop(self) -> None:
        """Immediate stop. Kill motors if necessary. This is the last resort."""

    @abstractmethod
    async def get_telemetry(self) -> Telemetry:
        """Return current telemetry snapshot."""

    @abstractmethod
    async def tick(self, dt: float) -> None:
        """Advance the vehicle by dt seconds. For sim, this runs physics.
        For real hardware, this is a no-op or polls state."""

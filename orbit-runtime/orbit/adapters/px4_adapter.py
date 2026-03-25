"""PX4 Adapter — stub for future PX4 SITL integration.

This is a placeholder that implements VehicleAdapter but raises
NotImplementedError for all methods. It exists to demonstrate that
the adapter pattern works and to serve as a starting point when
PX4 SITL integration is ready.

SAFETY NOTE: This adapter will require a dedicated safety review
before any real-world or SITL testing. It must not be used without
completing the hardware-readiness checklist in docs/.
"""

from __future__ import annotations

from orbit.adapters.base import VehicleAdapter
from orbit.core.telemetry import Telemetry, Vec3


class Px4Adapter(VehicleAdapter):
    """Future PX4 SITL / MAVLink adapter. NOT IMPLEMENTED."""

    async def connect(self) -> None:
        raise NotImplementedError("PX4 adapter is not yet implemented. Use SimAdapter for Phase 1.")

    async def disconnect(self) -> None:
        raise NotImplementedError

    async def arm(self) -> bool:
        raise NotImplementedError

    async def disarm(self) -> bool:
        raise NotImplementedError

    async def takeoff(self, altitude_m: float) -> bool:
        raise NotImplementedError

    async def land(self) -> bool:
        raise NotImplementedError

    async def set_velocity(self, velocity: Vec3) -> None:
        raise NotImplementedError

    async def set_position(self, position: Vec3) -> None:
        raise NotImplementedError

    async def emergency_stop(self) -> None:
        raise NotImplementedError

    async def get_telemetry(self) -> Telemetry:
        raise NotImplementedError

    async def tick(self, dt: float) -> None:
        raise NotImplementedError

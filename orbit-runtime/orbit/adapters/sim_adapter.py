"""SimAdapter — implements VehicleAdapter using the lightweight SimEngine.

This is the default adapter for Phase 1. It wraps the physics sim
behind the standard VehicleAdapter interface so autonomy logic doesn't
know it's talking to a simulation.
"""

from __future__ import annotations

from orbit.adapters.base import VehicleAdapter
from orbit.adapters.sim_engine import SimEngine
from orbit.core.telemetry import Telemetry, Vec3


class SimAdapter(VehicleAdapter):
    """Vehicle adapter backed by the lightweight physics simulation."""

    def __init__(self) -> None:
        self.engine = SimEngine()

    async def connect(self) -> None:
        self.engine.reset()

    async def disconnect(self) -> None:
        pass

    async def arm(self) -> bool:
        return self.engine.arm()

    async def disarm(self) -> bool:
        return self.engine.disarm()

    async def takeoff(self, altitude_m: float) -> bool:
        return self.engine.command_takeoff(altitude_m)

    async def land(self) -> bool:
        return self.engine.command_land()

    async def set_velocity(self, velocity: Vec3) -> None:
        self.engine.command_velocity(velocity)

    async def set_position(self, position: Vec3) -> None:
        self.engine.command_position(position)

    async def emergency_stop(self) -> None:
        self.engine.command_emergency_stop()

    async def get_telemetry(self) -> Telemetry:
        return self.engine.tick(0)  # zero-dt read

    async def tick(self, dt: float) -> None:
        self.engine.tick(dt)

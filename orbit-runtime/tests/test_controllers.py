"""Tests for mode controllers."""

from orbit.core.controllers.orbit_controller import OrbitController
from orbit.core.controllers.position_controller import PositionController
from orbit.core.controllers.dock_controller import DockController, DockPhase
from orbit.core.telemetry import Telemetry, Vec3


def test_orbit_controller_computes_position():
    ctrl = OrbitController(radius_m=5.0, altitude_m=3.0)
    t = Telemetry(target_position=Vec3(0, 0, 0))
    pos = ctrl.compute_target(t, 0.1)
    assert pos is not None
    assert abs(pos.z - 3.0) < 0.01
    # Should be roughly 5m from target in XY
    dist = ((pos.x ** 2) + (pos.y ** 2)) ** 0.5
    assert abs(dist - 5.0) < 0.5


def test_orbit_controller_no_target():
    ctrl = OrbitController()
    t = Telemetry(target_position=None)
    assert ctrl.compute_target(t, 0.1) is None


def test_position_controller():
    ctrl = PositionController(offset=Vec3(3, 0, 0), altitude_m=2.5)
    t = Telemetry(target_position=Vec3(10, 5, 0))
    pos = ctrl.compute_target(t)
    assert pos is not None
    assert abs(pos.x - 13.0) < 0.01
    assert abs(pos.y - 5.0) < 0.01
    assert abs(pos.z - 2.5) < 0.01


def test_dock_controller_phases():
    ctrl = DockController()
    t = Telemetry(
        position=Vec3(10, 10, 5),
        dock_position=Vec3(0, 0, 0),
    )
    assert ctrl.phase == DockPhase.APPROACH

    # First call should return position above dock
    pos, should_land = ctrl.compute_target(t)
    assert pos is not None
    assert not should_land
    assert abs(pos.x) < 0.01  # above dock X
    assert abs(pos.y) < 0.01  # above dock Y

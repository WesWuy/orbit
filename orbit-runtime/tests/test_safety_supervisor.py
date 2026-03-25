"""Tests for the safety supervisor."""

from orbit.core.telemetry import FlightState, Telemetry, Vec3
from orbit.safety.rules import Command, CommandType
from orbit.safety.supervisor import SafetySupervisor, SafetyState


def _make_telemetry(**kwargs) -> Telemetry:
    return Telemetry(**kwargs)


def test_emergency_stop_always_allowed():
    supervisor = SafetySupervisor()
    t = _make_telemetry(battery_pct=5.0)  # critical battery
    cmd = Command(type=CommandType.EMERGENCY_STOP)
    allowed, _ = supervisor.validate(cmd, t)
    assert allowed
    assert supervisor.estop_active


def test_estop_blocks_other_commands():
    supervisor = SafetySupervisor()
    t = _make_telemetry()
    supervisor.validate(Command(type=CommandType.EMERGENCY_STOP), t)

    # Now try a takeoff — should be blocked
    cmd = Command(type=CommandType.TAKEOFF, altitude_m=3.0)
    allowed, reason = supervisor.validate(cmd, t)
    assert not allowed
    assert "E-stop" in reason


def test_estop_reset():
    supervisor = SafetySupervisor()
    t = _make_telemetry()
    supervisor.validate(Command(type=CommandType.EMERGENCY_STOP), t)
    supervisor.reset_estop()
    assert not supervisor.estop_active


def test_battery_critical_blocks_non_landing():
    supervisor = SafetySupervisor()
    t = _make_telemetry(battery_pct=5.0)
    cmd = Command(type=CommandType.TAKEOFF, altitude_m=3.0)
    allowed, reason = supervisor.validate(cmd, t)
    assert not allowed
    assert "battery" in reason.lower()


def test_battery_critical_allows_landing():
    supervisor = SafetySupervisor()
    t = _make_telemetry(battery_pct=5.0)
    cmd = Command(type=CommandType.LAND)
    allowed, _ = supervisor.validate(cmd, t)
    assert allowed


def test_max_altitude_rejected():
    supervisor = SafetySupervisor()
    t = _make_telemetry()
    cmd = Command(type=CommandType.TAKEOFF, altitude_m=100.0)
    allowed, reason = supervisor.validate(cmd, t)
    assert not allowed
    assert "altitude" in reason.lower()


def test_geofence_rejected():
    supervisor = SafetySupervisor()
    t = _make_telemetry()
    cmd = Command(type=CommandType.SET_POSITION, position=Vec3(500.0, 0.0, 5.0))
    allowed, reason = supervisor.validate(cmd, t)
    assert not allowed
    assert "geofence" in reason.lower()


def test_nominal_command_allowed():
    supervisor = SafetySupervisor()
    t = _make_telemetry(battery_pct=80.0)
    cmd = Command(type=CommandType.SET_POSITION, position=Vec3(5.0, 5.0, 3.0))
    allowed, _ = supervisor.validate(cmd, t)
    assert allowed


def test_safety_state_updates():
    supervisor = SafetySupervisor()

    t = _make_telemetry(battery_pct=80.0)
    assert supervisor.update_state(t) == SafetyState.NOMINAL

    t = _make_telemetry(battery_pct=15.0)
    assert supervisor.update_state(t) == SafetyState.WARNING

    t = _make_telemetry(battery_pct=5.0)
    assert supervisor.update_state(t) == SafetyState.CRITICAL


def test_auto_land_on_critical_battery():
    supervisor = SafetySupervisor()
    t = _make_telemetry(battery_pct=5.0)
    override = supervisor.get_override_command(t)
    assert override is not None
    assert override.type == CommandType.LAND


def test_auto_land_on_link_loss():
    supervisor = SafetySupervisor()
    t = _make_telemetry(link_ok=False)
    override = supervisor.get_override_command(t)
    assert override is not None
    assert override.type == CommandType.LAND

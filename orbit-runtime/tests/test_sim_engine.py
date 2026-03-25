"""Tests for the lightweight simulation engine."""

from orbit.adapters.sim_engine import SimEngine
from orbit.core.telemetry import FlightState


def test_initial_state():
    engine = SimEngine()
    assert engine.flight_state == FlightState.DOCKED
    assert engine.battery_pct == 100.0
    assert not engine.is_armed


def test_arm_disarm():
    engine = SimEngine()
    assert engine.arm()
    assert engine.is_armed
    assert engine.disarm()
    assert not engine.is_armed


def test_takeoff():
    engine = SimEngine()
    engine.arm()
    assert engine.command_takeoff(3.0)

    # Tick until airborne
    for _ in range(200):
        t = engine.tick(0.05)
    assert t.flight_state == FlightState.AIRBORNE
    assert t.position.z >= 2.5  # should be near 3.0


def test_land():
    engine = SimEngine()
    engine.arm()
    engine.command_takeoff(3.0)
    for _ in range(200):
        engine.tick(0.05)

    assert engine.command_land()
    for _ in range(200):
        t = engine.tick(0.05)
    assert t.flight_state in (FlightState.GROUNDED, FlightState.DOCKED)
    assert t.position.z < 0.1


def test_emergency_stop():
    engine = SimEngine()
    engine.arm()
    engine.command_takeoff(3.0)
    for _ in range(100):
        engine.tick(0.05)

    engine.command_emergency_stop()
    for _ in range(200):
        t = engine.tick(0.05)
    assert t.flight_state == FlightState.EMERGENCY
    assert t.position.z < 0.1


def test_battery_drains():
    engine = SimEngine()
    engine.arm()
    engine.command_takeoff(3.0)
    for _ in range(200):
        engine.tick(0.05)

    initial_battery = engine.battery_pct
    for _ in range(200):
        engine.tick(0.05)
    assert engine.battery_pct < initial_battery


def test_mock_target_moves():
    engine = SimEngine()
    initial_x = engine.target.position.x
    for _ in range(100):
        engine.tick(0.1)
    assert engine.target.position.x != initial_x

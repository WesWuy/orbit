"""Tests for the intent parser."""

from orbit.brain.intent_parser import IntentType, parse_intent


def test_orbit_intent():
    assert parse_intent("orbit me").type == IntentType.ORBIT
    assert parse_intent("circle around").type == IntentType.ORBIT


def test_dock_intent():
    assert parse_intent("dock").type == IntentType.DOCK
    assert parse_intent("return").type == IntentType.DOCK
    assert parse_intent("go home").type == IntentType.DOCK


def test_estop_intent():
    assert parse_intent("emergency stop").type == IntentType.ESTOP
    assert parse_intent("stop").type == IntentType.ESTOP


def test_launch_intent():
    assert parse_intent("launch").type == IntentType.LAUNCH
    assert parse_intent("takeoff").type == IntentType.LAUNCH


def test_focus_intent():
    assert parse_intent("focus").type == IntentType.FOCUS
    assert parse_intent("hold").type == IntentType.FOCUS


def test_unknown_intent():
    result = parse_intent("make me a sandwich")
    assert result.type == IntentType.UNKNOWN
    assert result.rejection_reason is not None


def test_empty_intent():
    result = parse_intent("")
    assert result.type == IntentType.UNKNOWN


def test_status_intent():
    assert parse_intent("status").type == IntentType.STATUS
    assert parse_intent("battery").type == IntentType.STATUS

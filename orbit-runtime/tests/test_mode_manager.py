"""Tests for the mode manager FSM."""

from orbit.core.mode_manager import ModeManager, OrbitMode


def test_initial_state():
    mm = ModeManager()
    assert mm.current_mode == OrbitMode.IDLE


def test_valid_transition():
    mm = ModeManager()
    assert mm.transition(OrbitMode.ORBIT, "test")
    assert mm.current_mode == OrbitMode.ORBIT


def test_invalid_transition():
    mm = ModeManager()
    mm.transition(OrbitMode.DOCK, "test")
    # DOCK can only go to IDLE or EMERGENCY
    assert not mm.transition(OrbitMode.ORBIT, "should fail")
    assert mm.current_mode == OrbitMode.DOCK


def test_force_transition():
    mm = ModeManager()
    mm.transition(OrbitMode.DOCK, "test")
    mm.force_transition(OrbitMode.ORBIT, "safety override")
    assert mm.current_mode == OrbitMode.ORBIT


def test_same_mode_transition():
    mm = ModeManager()
    mm.transition(OrbitMode.ORBIT, "test")
    assert mm.transition(OrbitMode.ORBIT, "same mode")
    assert mm.current_mode == OrbitMode.ORBIT


def test_emergency_always_allowed():
    mm = ModeManager()
    for mode in OrbitMode:
        mm.current_mode = mode
        if mode != OrbitMode.EMERGENCY:
            assert mm.transition(OrbitMode.EMERGENCY, "test")


def test_transition_history():
    mm = ModeManager()
    mm.transition(OrbitMode.ORBIT, "r1")
    mm.transition(OrbitMode.FOCUS, "r2")
    history = mm.get_recent_transitions()
    assert len(history) == 2
    assert history[0]["to"] == "orbit"
    assert history[1]["to"] == "focus"

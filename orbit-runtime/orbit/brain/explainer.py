"""Explainer — generates human-readable explanations of what Orbit is doing.

This feeds the UI's status display. Users should always understand
what Orbit is doing and why.
"""

from __future__ import annotations

from orbit.core.mode_manager import OrbitMode
from orbit.safety.supervisor import SafetyState


_MODE_EXPLANATIONS: dict[OrbitMode, str] = {
    OrbitMode.IDLE: "Orbit is idle and ready for commands.",
    OrbitMode.ORBIT: "Orbit is circling around you at a safe distance.",
    OrbitMode.FOCUS: "Orbit is holding position nearby and facing you.",
    OrbitMode.GUIDE: "Orbit is guiding you along a path.",
    OrbitMode.CAPTURE: "Orbit is in capture mode — stable hover for recording.",
    OrbitMode.DOCK: "Orbit is returning to the backpack dock.",
    OrbitMode.EMERGENCY: "EMERGENCY — Orbit has stopped. Awaiting manual reset.",
}

_SAFETY_EXPLANATIONS: dict[SafetyState, str] = {
    SafetyState.NOMINAL: "",
    SafetyState.WARNING: "Battery is getting low.",
    SafetyState.CRITICAL: "Critical condition — Orbit is auto-landing for safety.",
    SafetyState.EMERGENCY: "Emergency stop is active. Use 'reset estop' when safe.",
}


def explain_state(mode: OrbitMode, safety_state: SafetyState, battery_pct: float) -> str:
    """Generate a human-readable explanation of Orbit's current state."""
    parts = [_MODE_EXPLANATIONS.get(mode, f"Orbit is in {mode.value} mode.")]

    safety_note = _SAFETY_EXPLANATIONS.get(safety_state, "")
    if safety_note:
        parts.append(safety_note)

    if battery_pct < 20:
        parts.append(f"Battery: {battery_pct:.0f}%")

    return " ".join(parts)

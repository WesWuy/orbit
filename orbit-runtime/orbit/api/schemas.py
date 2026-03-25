"""Pydantic schemas for the Orbit API."""

from __future__ import annotations

from pydantic import BaseModel


class CommandRequest(BaseModel):
    """A text or structured command from the user."""
    text: str = ""
    command_type: str | None = None  # direct command type override
    params: dict | None = None


class CommandResponse(BaseModel):
    """Response to a command."""
    success: bool
    message: str
    mode: str | None = None
    intent: str | None = None


class StatusResponse(BaseModel):
    """Full Orbit status snapshot."""
    mode: str
    flight_state: str
    safety_state: str
    battery_pct: float
    target_locked: bool
    target_distance_m: float
    position: dict
    velocity: dict
    dock_distance_m: float
    explanation: str
    estop_active: bool


class SafetyEventResponse(BaseModel):
    """A safety event."""
    timestamp: float
    event_type: str
    rule_name: str
    message: str


class ModeTransitionResponse(BaseModel):
    """A mode transition record."""
    from_mode: str
    to_mode: str
    reason: str
    timestamp: float

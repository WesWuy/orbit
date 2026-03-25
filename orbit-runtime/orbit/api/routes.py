"""REST API routes for Orbit."""

from __future__ import annotations

from fastapi import APIRouter

from orbit.api.schemas import CommandRequest, CommandResponse

router = APIRouter(prefix="/api")


# The orchestrator is injected at app startup (see main.py)
_orchestrator = None


def set_orchestrator(orch) -> None:
    global _orchestrator
    _orchestrator = orch


@router.get("/status")
async def get_status():
    """Get current Orbit status."""
    return _orchestrator.get_status()


@router.post("/command", response_model=CommandResponse)
async def send_command(req: CommandRequest):
    """Send a text command to Orbit."""
    result = await _orchestrator.handle_command(req.text)
    return CommandResponse(**result)


@router.get("/events")
async def get_events(count: int = 50, event_type: str | None = None):
    """Get recent events from the event log."""
    return _orchestrator.event_log.get_recent(count=count)


@router.get("/transitions")
async def get_transitions(count: int = 10):
    """Get recent mode transitions."""
    return _orchestrator.mode_manager.get_recent_transitions(count=count)


@router.post("/estop")
async def emergency_stop():
    """Emergency stop."""
    result = await _orchestrator.handle_command("emergency stop")
    return result


@router.post("/reset-estop")
async def reset_estop():
    """Reset emergency stop."""
    result = await _orchestrator.handle_command("reset estop")
    return result


@router.post("/launch")
async def launch():
    """Launch Orbit."""
    result = await _orchestrator.handle_command("launch")
    return result


@router.post("/land")
async def land():
    """Land Orbit."""
    result = await _orchestrator.handle_command("land")
    return result


@router.post("/dock")
async def dock():
    """Return to dock."""
    result = await _orchestrator.handle_command("dock")
    return result

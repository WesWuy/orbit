"""Intent Parser — maps text commands to structured intents.

Phase 1: keyword matching. No NLP needed yet.
Phase 2+: could integrate an LLM for natural language understanding.

Design principle: reject ambiguous commands rather than guessing.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class IntentType(str, Enum):
    ORBIT = "orbit"
    FOCUS = "focus"
    GUIDE = "guide"
    CAPTURE = "capture"
    DOCK = "dock"
    LAUNCH = "launch"
    LAND = "land"
    ESTOP = "emergency_stop"
    RESET_ESTOP = "reset_estop"
    STATUS = "status"
    SET_PARAM = "set_param"
    UNKNOWN = "unknown"


@dataclass
class Intent:
    """Parsed user intent."""
    type: IntentType
    raw_text: str
    confidence: float = 1.0
    params: dict | None = None
    rejection_reason: str | None = None


# Keyword → intent mappings (order matters — first match wins)
_KEYWORD_MAP: list[tuple[list[str], IntentType]] = [
    (["emergency", "stop", "estop", "e-stop", "kill"], IntentType.ESTOP),
    (["reset estop", "clear emergency", "reset emergency"], IntentType.RESET_ESTOP),
    (["orbit", "circle", "orbit me", "circle around"], IntentType.ORBIT),
    (["focus", "hold", "stay", "face me", "look at me"], IntentType.FOCUS),
    (["guide", "navigate", "lead", "show me"], IntentType.GUIDE),
    (["capture", "record", "film", "camera", "photo"], IntentType.CAPTURE),
    (["dock", "return", "come back", "go home", "perch"], IntentType.DOCK),
    (["launch", "takeoff", "take off", "deploy", "go"], IntentType.LAUNCH),
    (["land", "land now", "come down"], IntentType.LAND),
    (["status", "state", "how are you", "battery", "where are you"], IntentType.STATUS),
]


def parse_intent(text: str) -> Intent:
    """Parse a text command into a structured intent.

    Returns UNKNOWN with a rejection reason if the command is ambiguous.
    """
    normalized = text.strip().lower()

    if not normalized:
        return Intent(
            type=IntentType.UNKNOWN,
            raw_text=text,
            confidence=0.0,
            rejection_reason="Empty command",
        )

    # Check for multi-word matches first (longer phrases take priority)
    for keywords, intent_type in _KEYWORD_MAP:
        for keyword in keywords:
            if keyword in normalized:
                return Intent(
                    type=intent_type,
                    raw_text=text,
                    confidence=1.0,
                )

    return Intent(
        type=IntentType.UNKNOWN,
        raw_text=text,
        confidence=0.0,
        rejection_reason=f"Unrecognized command: '{text}'. Try: orbit, focus, dock, launch, land, stop",
    )

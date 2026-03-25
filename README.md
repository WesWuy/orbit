# Orbit

**Personal aerial AI companion — simulation-first prototype**

Orbit is a small, intelligent hovering companion that stays near the user, surfaces real-time contextual information, and autonomously returns to a backpack charging dock when idle or low on power.

> **This is a simulation-only project.** No real-world autonomous flight code is included. Real hardware integration requires explicit safety review.

## Quick Start

### Backend (Python)

```bash
cd orbit-server
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"
python -m orbit.main
```

Server runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend (React)

```bash
cd orbit-ui
npm install
npm run dev
```

UI runs at `http://localhost:3000` and proxies API/WebSocket to the backend.

### Run Tests

```bash
cd orbit-server
pytest
```

## Architecture

Orbit is two runtimes connected by a comms protocol:

```
┌──────────────────────┐         ┌──────────────────────┐
│   ORBIT RUNTIME      │  WiFi/  │  ORBIT COMPANION     │
│   (onboard drone)    │◄──WS───►│  (phone app)         │
│                       │         │                       │
│  - Safety supervisor  │         │  - Dashboard UI       │
│  - Mode manager FSM   │         │  - Command input      │
│  - Flight controllers │         │  - Telemetry display  │
│  - Local fallbacks    │         │  - AI brain (future)  │
│  - Vehicle adapter    │         │  - Session logging    │
└──────────────────────┘         └──────────────────────┘
```

**The drone flies safely without the phone.** The phone is a companion UI, not the flight-critical brain.

- **Safety Supervisor** is a mandatory gateway — every command passes through it
- **Vehicle Adapter** is abstract — today it's a lightweight physics sim, tomorrow it's PX4 SITL
- **Mode Manager** is an explicit FSM: idle → orbit → focus → guide → capture → dock
- **Phone disconnect:** Hold → cautious descent → auto-land. Safety never depends on the phone.

## Modes

| Mode | Behavior |
|------|----------|
| Idle | Armed, hovering, waiting for commands |
| Orbit | Circling around the target at configurable radius |
| Focus | Holding position near target, facing it |
| Guide | Following waypoints / navigation (stub) |
| Capture | Stable hover for camera/recording |
| Dock | Returning to backpack dock and landing |

## Safety

- Emergency stop is always allowed and cannot be blocked
- Battery critical → automatic landing
- Link loss → automatic landing
- Speed and altitude hard limits
- Geofence enforcement
- All commands validated before execution

# Orbit Architecture

## Core Design Principle

**The drone flies safely without the phone.** The phone is a companion interface, not the flight-critical brain.

## Two Runtimes

### Orbit Runtime (onboard / simulated)
Runs on the drone's onboard compute. In Phase 1, this is the Python backend (`orbit-server`).

Responsible for:
- Safety supervisor (mandatory command gateway)
- Flight control and stabilization
- Mode manager (FSM)
- Local fallback behaviors (land on disconnect, battery critical, link loss)
- Sensor processing (future)
- Telemetry broadcasting

**This runtime must operate safely even if the phone disconnects.**

### Orbit Companion (phone app)
Runs on the user's phone (pocket, hand, or backpack). In Phase 1, this is the React web app (`orbit-ui`).

Responsible for:
- Dashboard UI and telemetry display
- Command input (text, future voice)
- AI brain / context engine (optional compute offload)
- Session logging and replay
- Navigation and task guidance

**The companion is a UI and optional compute partner — never the flight-critical brain.**

### Communications Protocol
The two runtimes communicate over a shared protocol:
- Phase 1: WebSocket over local network (WiFi)
- Future: WiFi Direct, BLE for low-bandwidth control, or custom radio link

The protocol is abstracted behind a `CommsAdapter` interface so the transport can change without affecting either runtime.

## Three Subsystem Layers

### 1. Orbit Core (orbit/core/)
Flight logic, mode management, controllers, telemetry normalization.
**Lives in Orbit Runtime (onboard).**

### 2. Orbit Brain (orbit/brain/)
Intent parsing, context engine, explainer. Currently keyword-based.
**Split:** Simple intent parsing runs onboard. Complex AI reasoning runs on companion.
Future: LLM-powered natural language understanding on the phone, with simple command forwarding to the drone.

### 3. Orbit Interface (orbit/api/ + orbit-ui/)
FastAPI REST + WebSocket backend, React mobile-first frontend.
**The API layer is the boundary between runtime and companion.**

## Key Abstractions

### VehicleAdapter (orbit/adapters/base.py)
The most important interface. All autonomy logic talks through this ABC.
- `SimAdapter` — lightweight physics sim (Phase 1)
- `Px4Adapter` — PX4 SITL stub (future)
- Real hardware adapters — require safety review

### SafetySupervisor (orbit/safety/supervisor.py)
Mandatory command gateway. Validates every command against rules.
Can override autonomy (force landing on critical battery/link loss).
E-stop bypasses all rules.
**Always runs onboard — never depends on phone connection.**

### ModeManager (orbit/core/mode_manager.py)
Explicit FSM with validated transitions. Safety supervisor can force
transitions that bypass normal validation.

### CommsAdapter (future: orbit/comms/base.py)
Abstraction for runtime↔companion communication.
Phase 1: WebSocket. Future: WiFi Direct, BLE, custom radio.

## Data Flow

```
User Command (phone)
  → Companion App
  → Comms Protocol (WebSocket)
  → Orbit Runtime
  → Intent Parser (onboard, simple)
  → Safety Supervisor (validate)
  → Mode Manager (transition)
  → Controller (compute target)
  → Safety Supervisor (validate position)
  → Vehicle Adapter (execute)
  → Telemetry (broadcast via comms)
  → Companion App (display)
```

## Phone Disconnect Behavior

When the phone disconnects, Orbit Runtime:
1. **< 5 seconds:** Hold position, wait for reconnection
2. **5-30 seconds:** Continue current mode if safe, begin cautious descent
3. **> 30 seconds:** Auto-land at current position
4. **Battery critical (anytime):** Auto-land immediately regardless of connection

The drone NEVER depends on the phone for safety-critical decisions.

## Legacy: Phone-Dock Concept

The old "flying phone holder" concept (Option A) is preserved ONLY as an
optional demo/prototype path. The software architecture does not depend on it.
If someone mounts a phone on the drone running the companion app, it works
because the companion app is just a browser client — but this is not the
primary product direction.

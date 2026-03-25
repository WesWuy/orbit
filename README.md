# Orbit

**Your AI buddy that sees the world with you.**

Orbit is an AI companion app that lives on your phone. Point it at stuff and it tells you what it is. Ask it to remember places. Get guided anywhere with a magic compass. Talk to it like a friend.

It's like having a curious, helpful sidekick in your pocket.

## What Can Orbit Do?

| Mode | What It Does | How You Use It |
|------|-------------|----------------|
| **Focus** | "What am I looking at?" — point your camera at anything and Orbit explains it | Tap the Focus button, aim your phone |
| **Guide** | "Take me there" — a compass arrow and audio pings guide you to any destination | Say "guide me to the park" |
| **Capture** | "Remember this" — saves a photo + location + AI description to your memory | Tap Capture when you see something cool |
| **Converse** | "Let's chat" — talk to Orbit about anything, it knows where you are and what you've seen | Open Converse and start typing or talking |
| **Ambient** | Orbit hangs out in the background, ready when you need it | The default — just vibing |
| **Sleep** | Low power mode — Orbit rests until you wake it up | Say "sleep" or "goodnight" |

## Try It Out

### Phone App (Gen 1 MVP)

```bash
cd orbit-app
npm install
npx expo start --web    # runs in your browser
# or
npx expo start          # scan QR with Expo Go on your phone
```

### Drone Simulation (Gen 0 — the backstory)

Orbit started as a drone simulation. The full flight sim still works:

```bash
# Backend
cd orbit-runtime
pip install -e ".[dev]"
python -m orbit.main        # API at http://localhost:8000

# Dashboard
cd orbit-companion
npm install
npm run dev                  # UI at http://localhost:3000
```

## The Big Idea

**Gen 1:** Your phone IS Orbit. It uses the phone's own camera, GPS, and compass to be your AI companion. No special hardware needed.

**Gen 2:** Orbit gets a body — a small drone that flies around you, sees the world from above, and docks on your backpack when it's done. The same brain, just with wings.

The cool part: the exact same AI that works in your hand today will power the drone tomorrow. We built it that way on purpose.

## How It Works (Under the Hood)

```
orbit-app/              The phone app (React Native + Expo)
├── engine/             The brain — modes, intent parsing, context, personality
├── sensors/            SensorAdapter — wraps phone GPS/compass/camera
├── services/           AI vision, memory store, spatial audio, voice
├── hooks/              React hooks connecting brain to UI
└── app/                Screens — home, focus, guide, capture, converse

orbit-runtime/          The drone brain (Python + FastAPI) — Gen 0/Gen 2
├── core/               Flight controllers, mode FSM, orchestrator
├── safety/             Safety supervisor — mandatory command gateway
├── adapters/           Vehicle abstraction (sim today, real drone later)
├── protocol/           Typed WebSocket messages between drone and phone
└── brain/              Intent parser, context engine, explainer

orbit-companion/        The drone dashboard (React + TypeScript) — Gen 0
```

**The key trick:** `SensorAdapter` is an interface. Today it reads your phone's GPS. Tomorrow it reads a drone's telemetry. The app doesn't care which one — it just works.

## Modes (Phone App)

Orbit has a brain that thinks in **modes** — like switching between different superpowers:

```
SLEEP → AMBIENT → FOCUS / GUIDE / CAPTURE / CONVERSE → SLEEP
```

Each mode changes what Orbit pays attention to and how it helps you. The mode manager makes sure transitions are valid (you can't jump from Sleep straight to Guide without waking up first).

## Safety (Drone Mode)

When Orbit has a drone body (Gen 2), safety is serious:

- Emergency stop always works — nothing can block it
- Low battery = automatic landing, no exceptions
- Phone disconnects? Drone lands itself safely
- Speed limits, altitude limits, geofence — all enforced
- Every single command goes through the Safety Supervisor first

**The drone flies safely even if the phone dies.** The phone is a companion, not the pilot.

## Tech Stack

- **Phone App:** React Native, Expo, TypeScript
- **Drone Backend:** Python, FastAPI, WebSocket
- **AI:** Claude/GPT vision APIs (mock mode for offline dev)
- **Database:** SQLite on device (in-memory for web)
- **Tests:** 37 passing (drone backend)

## Project Status

- [x] Gen 0 — Full drone simulation with safety supervisor, 7 flight modes, 37 tests
- [x] Gen 1 Phase 1 — Phone app skeleton with sensor pipeline and mode FSM
- [x] Gen 1 Phase 2 — Focus mode (camera + AI vision)
- [x] Gen 1 Phase 3 — Capture mode (memory store + location)
- [x] Gen 1 Phase 4 — Guide mode (compass navigation)
- [x] Gen 1 Phase 5 — Converse mode (AI chat)
- [ ] Voice input (speech-to-text)
- [ ] Real camera integration (expo-camera on device)
- [ ] Cloud AI backend (orbit-cloud)
- [ ] Gen 2 — Pair with a real drone

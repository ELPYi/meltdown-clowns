# Meltdown Clowns

A real-time cooperative multiplayer game where 2-4+ players work together to prevent a Dyson sphere reactor from exploding. Each player takes on a distinct role with unique controls, communicating externally via voice chat to keep the reactor from melting down across 10 minutes of escalating chaos.

No accounts, no progression — pure arcade-style sessions.

## Gameplay

**Objective:** Survive 10 minutes of escalating reactor failures across 5 phases.

| Phase | Time | What Happens |
|-------|------|--------------|
| Stable Operations | 0:00–2:00 | Minor fluctuations, learn your controls |
| Anomalies Detected | 2:00–4:00 | Single system failures start appearing |
| Cascade Warning | 4:00–6:30 | Multiple simultaneous failures, cascades begin |
| Critical Meltdown | 6:30–9:00 | Everything at once, klaxons blaring |
| Final Countdown | 9:00–10:00 | Stabilize or explode |

**Win:** Survive all 5 phases.
**Lose:** Core temperature critical for 10s, containment breach, or stability hits zero.

### Roles

| Role | Responsibilities |
|------|-----------------|
| **Reactor Operator** | Control rods, power output, emergency SCRAM |
| **Engineer** | Coolant management, subsystem repairs, fire suppression |
| **Technician** | Sensor monitoring, calibration, diagnostics, failure prediction |
| **Safety Officer** | Shields, radiation, pressure vents, emergency protocols |

With fewer than 4 players, roles are automatically combined (e.g., 2 players each get 2 roles with tabbed panels).

## Tech Stack

| Layer | Tech |
|-------|------|
| Monorepo | npm workspaces + Turborepo |
| Frontend | React 18 + TypeScript + Vite |
| Reactor Viz | Canvas 2D (animated core, particles, containment ring) |
| State | Zustand |
| Audio | Web Audio API (all sounds procedurally synthesized) |
| Backend | Node.js + Fastify |
| WebSocket | `ws` via `@fastify/websocket` |
| Deploy | Docker |

## Quick Start

```bash
# Install dependencies
npm install

# Build shared package first
npm run build -w @meltdown/shared

# Start server (terminal 1)
npm run dev -w @meltdown/server

# Start client (terminal 2)
npm run dev -w @meltdown/client
```

Server runs on `http://localhost:3001`, client on `http://localhost:5173`.

Open two browser tabs, create a room in one, join from the other, and start the reactor.

## Docker

```bash
docker build -t meltdown-clowns .
docker run -p 3001:3001 meltdown-clowns
```

Then open `http://localhost:3001` — the server serves the built client.

## Project Structure

```
meltdown-clowns/
├── packages/
│   ├── shared/           # Types, simulation engine, action validators, constants
│   │   └── src/
│   │       ├── types/        # GameState, Messages, Roles, Lobby
│   │       ├── simulation/   # reactor-core, phase-manager, cascade-engine
│   │       ├── roles/        # Action validation & application
│   │       └── util/         # Constants, seeded RNG
│   ├── server/           # Fastify server with WebSocket game loop
│   │   └── src/
│   │       ├── lobby/        # Room management (create/join/leave)
│   │       ├── game/         # GameSession (authoritative 20Hz tick)
│   │       └── ws/           # WebSocket handler, message router
│   └── client/           # React UI
│       └── src/
│           ├── screens/      # LobbyBrowser, RoomWaiting, GameScreen, GameOver
│           ├── components/
│           │   ├── reactor-display/  # Canvas 2D reactor visualization
│           │   ├── controls/         # Gauge, Slider, EventQueue
│           │   └── panels/           # 4 role panels + CombinedPanel
│           ├── stores/       # Zustand (connection, lobby, game)
│           ├── network/      # WebSocket client with auto-reconnect
│           └── audio/        # Procedural sound manager + reactive audio hook
├── Dockerfile
├── turbo.json
└── tsconfig.base.json
```

## Architecture

- **Authoritative server** — All game logic runs on the server at 20Hz. Clients are render terminals. No cheating possible.
- **Shared simulation** — Reactor physics live in `@meltdown/shared`, testable in isolation.
- **Cascade engine** — Directed graph of inter-role event dependencies. Unresolved events trigger cascading failures across roles.
- **Role-filtered state** — Server broadcasts full state; clients filter by assigned roles.
- **Procedural audio** — All sound effects synthesized via Web Audio API (no audio files). Ambient drone, Geiger crackle, klaxons, and interaction sounds all react dynamically to game state.
- **No persistence** — All state is in-memory. Sessions are ephemeral.

## Sound Design

Every sound is procedurally generated — no audio files needed:

- **UI:** Click, thunk, switch toggle, slider ticks
- **Actions:** Pressure vent hiss, coolant rush, metallic repair clanks, fire extinguisher whoosh, diagnostic scan sweep, shield charge hum, containment restore power-up
- **Reactive:** Severity-scaled alarms on new events, resolve chimes, phase transition stingers with impact noise
- **Ambient:** Bass drone that intensifies with danger, Geiger counter crackle scaled to radiation, looping klaxon at critical thresholds
- **Game over:** Victory fanfare (ascending major chord) or meltdown explosion (deep boom + filtered noise decay)

## License

MIT

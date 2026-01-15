# Server Spawn, Port Discovery & Connection

> Neovate Desktop - Electron Implementation Spec

## 1. Summary

Neovate Desktop spawns a backend server process, discovers an available port, and waits for the server to be ready before rendering the main UI. This spec defines the IPC contract, state management, and error handling for Electron developers.

**Problem Statement:**
- The `@neovate/code` package must be installed and bundled with Electron app
- The server must be spawned as a separate process from the bundled `@neovate/code` package
- An available network port must be discovered dynamically
- The client must wait until the server is ready before attempting to use it
- The port information must be communicated between processes

---

## 2. User Experience

### 2.1 Startup Flow

```
┌─────────────────┐
│   App Launch    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Splash Screen  │◀─────────────────────────────────┐
│   "Neovate" │                                      │
└────────┬────────┘                                  │
         │                                           │
         ▼                                           │
┌─────────────────┐     ┌─────────────────┐          │
│  Port Discovery │────▶│  Spawn Server   │          │
└────────┬────────┘     └────────┬────────┘          │
         │                       │                   │
         │              ┌────────▼────────┐          │
         │              │  Wait for Ready │          │
         │              │   (poll 250ms)  │          │
         │              └────────┬────────┘          │
         │                       │                   │
         │         ┌─────────────┴─────────────┐     │
         │         │                           │     │
         │    Success (≤7s)              Timeout (>7s)
         │         │                           │     │
         │         ▼                           ▼     │
         │  ┌─────────────┐           ┌─────────────┐│
         │  │   Main UI   │           │Error Dialog ││
         │  └─────────────┘           └──────┬──────┘│
         │                                   │       │
         │                          ┌────────┴───────┴───────┐
         │                          │                        │
         │                       [Retry]                  [Exit]
         │                          │
         └──────────────────────────┘
```

### 2.2 Splash Screen

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│                                                     │
│                      N▌                             │
│                      Ne▌                            │
│                      Neo▌                           │
│                      Neov▌                          │
│                      Neova▌                         │
│                      Neovat▌                        │
│                      Neovate▌  ← typing effect      │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Logo text types out letter by letter
- Cursor blinks at end after complete
- Timeout: 7 seconds → show error state
- Animation stops when main UI loads or error appears

### 2.3 Error States

#### Startup Timeout (CONNECTION_TIMEOUT)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    ╭───────╮                        │
│                    │  ◠◡◠  │  ← Logo (stopped)      │
│                    ╰───────╯                        │
│                                                     │
│            ❌ Neovate couldn't start                │
│                                                     │
│         Something went wrong. Please try again.     │
│                                                     │
│         ┌────────┐           ┌──────────────┐       │
│         │ Retry  │           │              │       │
│         └────────┘           └──────────────┘       │
│                                                     │
│                      [Exit]                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Button Actions:**
- **Retry** - Re-run full startup cycle
- **Exit** - Close application

---

## 3. Behavior Specification

### 3.1 Happy Path

```gherkin
Given the app is launched
When the main process starts
Then it uses portfinder to get an available port from range 49152-65535
And spawns bundled `neovate server --port={port}` from node_modules
And attempts TCP connection to 127.0.0.1:{port} every 250ms
And the connection succeeds within 7 seconds
Then sends IPC `neovate-server:ready` with port to renderer
And renderer connects to WebSocket on the discovered port
And main UI is displayed
```

### 3.2 Startup Timeout

```gherkin
Given the server is spawned
When 7 seconds elapse without TCP connection success
Then the server process is killed (SIGTERM)
And IPC `neovate-server:error` is sent with code "CONNECTION_TIMEOUT"
And error state is shown with [Retry] [Exit]
When user clicks [Retry]
Then the spawn cycle restarts from IDLE state
```

### 3.3 Server Crash with Auto-Retry

```gherkin
Given the server is running in READY state
When the server process exits unexpectedly (exit code !== 0)
Then it automatically attempts one restart
When the restart also fails
Then IPC `neovate-server:error` is sent with code "SERVER_CRASHED"
And error dialog is shown
```

---

## 4. Architecture

### 4.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Neovate Desktop (Electron)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │          createNeovateServer(options)                    │   │
│   │                                                         │   │
│   │    1. portfinder.getPortPromise() → port 49152-65535    │   │
│   │       // IANA dynamic/private port range                │   │
│   │                                                         │   │
│   │    2. spawn(`neovate server --port`)                    │   │
│   │       - environment: NEOVATE_CLIENT=desktop             │   │
│   │                                                         │   │
│   │                                                         │   │
│   │    3. poll TCP connection every 250ms                   │   │
│   │       - timeout after 7000ms                            │   │
│   │       - return { url, port, close() }                   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ spawn + port arg
                               ▼
                    ┌─────────────────────┐
                    │   Server Process    │
                    │   (neovate server)  │
                    │                     │
                    │  - HTTP Server      │
                    │  - WebSocket        │
                    └──────────┬──────────┘
                               │
                               │ TCP connection
                               ▼
                         localhost:{port}
```

**Key Points:**
- Single function `createNeovateServer()` handles all server lifecycle
- Server readiness detected via TCP polling (not stdout parsing)
- Returns object with `{ url, port, close() }` for lifecycle management

### 4.2 Process Responsibilities

| Process | Responsibilities |
|---------|------------------|
| **Main** | Port discovery, spawn server, lifecycle management, connection polling, IPC handling |
| **Renderer** | Connection state UI, error dialogs |

### 4.3 Sequence Diagram (Success Path)

```
┌────────┐          ┌─────────────┐          ┌────────────┐          ┌────────┐          ┌──────────┐
│  Main  │          │PortDiscovery│          │ServerSpawn │          │ Server │          │Renderer  │
└───┬────┘          └──────┬──────┘          └─────┬──────┘          └───┬────┘          └────┬─────┘
    │                      │                       │                     │                   │
    │  1. getPort()        │                       │                     │                   │
    │─────────────────────▶│                       │                     │                   │
    │                      │                       │                     │                   │
    │                      │ portfinder.getPort()  │                     │                   │
    │                      │                       │                     │                   │
    │  2. port number      │                       │                     │                   │
    │◀─────────────────────│                       │                     │                   │
    │                      │                       │                     │                   │
    │  3. spawn(port)      │                       │                     │                   │
    │─────────────────────────────────────────────▶│                     │                   │
    │                      │                       │                     │                   │
    │                      │                       │  4. exec process    │                   │
    │                      │                       │────────────────────▶│                   │
    │                      │                       │     --port={port}   │                   │
    │                      │                       │                     │                   │
    │  5. process handle   │                       │                     │                   │
    │◀─────────────────────────────────────────────│                     │                   │
    │                      │                       │                     │                   │
    │  6. waitForConnection(port)                  │                     │                   │
    │───────────────────────────────────────────────────────────────────────────────────────▶│
    │                      │                       │  try TCP connection │                   │
    │                      │                       │     every 250ms     │                   │
    │  7. ready            │                       │                     │                   │
    │◀───────────────────────────────────────────────────────────────────────────────────────│
    │                      │                       │                     │                   │
    │  8. IPC: server:ready(port)                  │                     │                   │
    │───────────────────────────────────────────────────────────────────────────────────────▶│
    │                      │                       │                     │                   │
    │                      │                       │                     │                   │
    │                      │                       │                     │                   │ 9. Initialize Client
    │                      │                       │                     │                   │
    │                      │                       │                     │                   │
    │                      │                       │                     │                   ▼
    │                      │                       │                     │              ┌──────────┐
    │                      │                       │                     │              │ Main UI  │
    │                      │                       │                     │              │  Ready   │
    │                      │                       │                     │              └──────────┘
```

### 4.4 Sequence Diagram (Timeout Failure Path)

```
┌────────┐          ┌────────────┐          ┌────────┐          ┌──────────┐
│  Main  │          │ServerSpawn │          │ Server │          │ Renderer │
└───┬────┘          └─────┬──────┘          └───┬────┘          └────┬─────┘
    │                     │                     │                     │
    │  1. spawn(port)     │                     │                     │
    │────────────────────▶│                     │                     │
    │                     │  2. exec process    │                     │
    │                     │────────────────────▶│                     │
    │                     │                     │                     │
    │  3. waitForConnection(port)               │                     │
    │──────────────────────────────────────────▶│                     │
    │                     │ try TCP connection  │                     │
    │                     │    every 250ms      │                     │
    │                     │  for up to 7s       │                     │
    │                     │                     │                     │
    │         ╔═══════════════════════════════════╗                   │
    │         ║  TIMEOUT: 7 seconds exceeded      ║                   │
    │         ╚═══════════════════════════════════╝                   │
    │                     │                     │                     │
    │  4. kill server process                   │                     │
    │──────────────────────────────────────────▶│                     │
    │                     │                     │                     │
    │  5. IPC: server:error                     │                     │
    │────────────────────────────────────────────────────────────────▶│
    │     { code: "xxx", message: "..." }      │                     │
    │                     │                     │                     │
    │                     │                     │  6. Show error      │
    │                     │                     │     dialog          │
    │                     │                     │     [Retry]         │
    │                     │                     │     [Exit]          │
    │                     │                     │                     │
```

## 5. IPC Contract

### 5.1 Channels

| Channel | Direction | Payload | Description |
|---------|-----------|---------|-------------|
| `neovate-server:ready` | Main → Renderer | `{ port: number }` | Server is ready |
| `neovate-server:error` | Main → Renderer | `{ code: string, message: string }` | Startup failed |
| `neovate-server:retry` | Renderer → Main | `void` | Retry spawn cycle |

---

## 6. Error Codes

| Code | Description | Auto-Retry | User Action |
|------|-------------|------------|-------------|
| `NO_PORT_AVAILABLE` | portfinder failed | No | Close other apps |
| `SPAWN_FAILED` | Failed to start process | No | Close and retry |
| `CONNECTION_TIMEOUT` | Not ready within 7s | No | Retry |
| `SERVER_CRASHED` | Process exited unexpectedly | Yes (3x) | Retry |

**Error Recovery Matrix:**

| Error | Silent Retry | Show Dialog |
|-------|--------------|-------------|
| `NO_PORT_AVAILABLE` | ❌ | Immediately |
| `SPAWN_FAILED` | ❌ | Immediately |
| `CONNECTION_TIMEOUT` | ❌ | Immediately |
| `SERVER_CRASHED` | ✅ 3 attempts | After retry fails |

---

## 7. Constants

| Name | Value | Description |
|------|-------|-------------|
| `POLL_INTERVAL_MS` | 250 | TCP connection retry interval |
| `STARTUP_TIMEOUT_MS` | 7000 | Max wait for server ready |
| `PORT_RANGE_START` | 49152 | Start of dynamic/private port range |
| `PORT_RANGE_END` | 65535 | End of dynamic/private port range |

**Port Resolution:**
- Use `portfinder` library to find available port in range 49152-65535 (IANA dynamic/private ports)
- This range avoids conflicts with well-known services and common development ports

**Binary Resolution:**
- Development: Use `node_modules/.bin/neovate` from project root
- Production: Use `node_modules/.bin/neovate` from unpacked asar bundle (app.asar.unpacked)
- The `@neovate/code` package is bundled with the Electron app, not installed globally

---

## 8. Configuration

| Parameter | Type | Default | Source | Description |
|-----------|------|---------|--------|-------------|
| `port` | number | (auto) | portfinder | Available port from range 49152-65535 |
| `--port` | number | (auto) | CLI arg | Port argument to server |
| `neovatePath` | string | (computed) | Runtime | Path to bundled neovate binary |

**Binary Path Resolution:**
- **Development**: `{cwd}/node_modules/.bin/neovate`
- **Production**: `{app.asar.unpacked}/node_modules/.bin/neovate`
- The binary is verified to exist before spawning
- `@neovate/code` package is included in electron-builder's `asarUnpack` configuration

**Port Resolution:** portfinder automatically finds available port in range 49152-65535

---

## 9. Security Requirements

- Server MUST bind to `127.0.0.1` by default (no external access)
- Server MUST run as isolated child process

---

## 10. Test Cases

### 10.1 Future: E2E Tests (Playwright)

| Test | Expected | Status |
|------|----------|--------|
| Happy path | Splash → Main UI in <7s, WS connects | TODO |
| Timeout | Error dialog [Retry] [Exit] shown | TODO |
| Crash retry | Server crashes once → auto-retry succeeds | TODO |
| Crash exhausted | Server crashes 3x → SERVER_CRASHED dialog | TODO |
| Shutdown cleanup | App close → server killed | TODO |
| Retry button | Click → spawn cycle restarts | TODO |
| Boundary timeout | Server responds at 6999ms → success | TODO |
| Boundary timeout | Server responds at 7001ms → timeout error | TODO |
| Rapid retry | Click Retry 5x → no duplicate processes | TODO |

> **To implement:** `npm i -D @playwright/test` → add `test/electron.spec.ts`

### 10.2 Manual Verification

| Test | How |
|------|-----|
| Binary exists in dev | `ls node_modules/.bin/neovate` |
| Binary exists in prod | `ls Contents/Resources/app.asar.unpacked/node_modules/.bin/neovate` |
| Port argument passed | Check server logs for `--port=...` |
| Client env var set | Check server process env (`NEOVATE_CLIENT=desktop`) |
| Splash screen | Logo types, cursor blinks |
| Error dialog buttons | [Retry] and [Exit] visible and functional |

### 10.3 What NOT to Unit Test

- Path construction (dev vs prod) → verified manually
- `spawn()` arguments → runtime behavior, not testable in isolation
- `fs.access()` calls → binary existence verified manually
- TCP polling logic → E2E test covers this

---

## 11. Implementation Checklist

### Main Process

- [x] Port discovery module
  - [x] Use portfinder library with range 49152-65535
- [x] Server spawner module
  - [x] Resolve bundled binary path (dev vs production)
  - [x] Verify binary exists before spawn
  - [x] Process spawn with args (--port)
  - [x] Environment injection (NEOVATE_CLIENT, NODE_ENV)
  - [x] Shell wrapper (Windows only)
  - [x] Error handling
- [ ] Connection tester module
  - [ ] TCP connection attempts to server port
  - [ ] 250ms retry interval
  - [ ] 7s timeout
  - [ ] Kill process on timeout
- [ ] Server manager (lifecycle)
  - [ ] Process reference storage
  - [ ] Kill on shutdown
  - [ ] Kill on window close
  - [ ] Auto-retry logic
- [ ] IPC handlers
  - [ ] neovate-server:retry

### Renderer Process

- [ ] UI components
  - [ ] Splash screen (typing effect)
  - [ ] Error state (timeout)
- [ ] App initialization gate
  - [ ] Block render until URL
  - [ ] Handle IPC events

### Preload Script

- [ ] Expose IPC methods

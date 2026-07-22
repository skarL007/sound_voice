# Architecture

VoiceLaunch TTS is an Electron desktop app with a bundled Python backend. This
document is the map for contributors: the process model, the two audio routing
paths, the backend auth handshake, and the build pipeline.

## Process model

```
┌─────────────────────────────────────────────────────────────┐
│ Electron main process  (src/main)                            │
│  • app lifecycle, frameless window, global shortcuts         │
│  • Edge TTS client over WebSocket  (edge-tts-client.ts)      │
│  • spawns + supervises the Python backend (python-manager)   │
│  • download manager, VB-Cable install, auto-updater          │
└───────────────┬──────────────────────────┬──────────────────┘
                │ contextBridge (preload)   │ spawn + HTTP :9472
                ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────────┐
│ Renderer (src/renderer)   │   │ Python backend (src/python)  │
│  React + Tailwind + Zustand│   │  FastAPI, PyInstaller bundle │
│  • Speak / Shortcuts /    │   │  • local TTS inference       │
│    Settings, compact mode │   │  • Piper / Kokoro / XTTS     │
│  • cloud audio playback   │   │  • virtual mic (sounddevice) │
│    + setSinkId routing    │   │  • hardware probe, cloning   │
└───────────────────────────┘   └──────────────────────────────┘
```

- **Main** (`src/main`): Node/Electron. Owns the window, IPC handlers
  (`ipc-handlers.ts`), the Edge TTS WebSocket client, the Python backend
  supervisor (`python-manager.ts`), model/VB-Cable downloads, and the updater.
- **Preload** (`src/preload/index.ts`): the only bridge. Exposes a fixed, typed
  API to the renderer via `contextBridge`; the renderer has no Node access
  (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
- **Renderer** (`src/renderer`): React 19 + Tailwind + Zustand. Three routes
  (Speak `/`, Shortcuts `/shortcuts`, Settings `/settings`) plus a compact
  always-on-top mode. State and settings persist through the main process.
- **Backend** (`src/python`): FastAPI on `127.0.0.1:9472` (auto-increments if
  busy). Packaged as a standalone `voicelaunch-backend.exe` via PyInstaller;
  in dev it can run from source with a Python 3.12 interpreter.

## The two audio routing paths

This is the most important thing to understand. There are **two independent
playback paths**, chosen by which engine synthesized the audio.

### 1. Cloud path (Edge TTS) — renders in the renderer

The default. The main process fetches audio from Microsoft Edge TTS over a
WebSocket (`edge-tts-client.ts`) and returns it to the renderer as base64. The
renderer decodes it with the Web Audio API and fans it out to one or more output
devices using `MediaStreamDestination` + `<audio>.setSinkId()`
(`src/renderer/src/utils/cloudAudio.ts`):

- the **virtual-mic** sink (`CABLE Input`) so Discord/games hear it, and
- an optional **monitor** sink so you hear yourself.

The Python backend is not involved in cloud playback at all.

### 2. Local path (Piper/Kokoro/XTTS) — renders in the backend

When a local engine synthesizes, the renderer calls `tts:play`, the main process
POSTs to `/play`, and the backend plays the audio through `sounddevice` into the
VB-Cable device (`src/python/virtual_mic.py`). The backend returns routing
diagnostics (`routedToVirtualMic`, `fallbackReason`, `deviceName`) that the UI
surfaces when the voice didn't reach the cable.

### Why two paths

The cloud path never touches Python, so keeping it in the renderer avoids forcing
the backend into the hot path of the online-first default. The local path needs
native audio I/O, which lives naturally in Python. They are kept separate on
purpose; the `engineRouter` decides which engine runs, and each engine owns its
own playback.

### Engine routing (Auto mode)

`src/renderer/src/utils/engineRouter.ts` is a pure function that picks the engine
per utterance: online + Edge healthy → Edge; offline or Edge in its failure
cooldown → Kokoro or Piper by hardware tier and text length; nothing installed →
an actionable prompt. An explicit `cloud`/`local` choice always wins over Auto.

## Backend auth handshake

The backend binds to localhost, but localhost is not private — any local process
or drive-by web page could POST to `:9472`. To close that surface:

1. On launch, `python-manager.ts` generates a random per-session token and
   injects it into the backend via the `VOICELAUNCH_BACKEND_TOKEN` env var.
2. A FastAPI middleware rejects any request without a matching
   `X-VoiceLaunch-Token` header (401), except `GET /health`. The WebSocket
   `/ws/tts-stream` checks the token too.
3. The renderer never sees the token. All backend calls go through the main
   process (`backendFetch` in `ipc-handlers.ts`), which attaches the header.

When the env var is absent (standalone dev runs, pytest, smoke scripts) the
backend runs open on localhost for convenience.

## Build & packaging

- **Renderer/main/preload**: `electron-vite` builds to `out/`.
- **Python backend**: `scripts/build-python-venv.bat` produces a self-contained
  PyInstaller bundle (`python_dist/voicelaunch-backend/voicelaunch-backend.exe`,
  Python 3.12). The packaged build includes only Piper and Kokoro.
- **VB-Cable**: `scripts/fetch-vbcable.ps1` downloads the driver pack, verifies
  its SHA-256, and extracts it into `assets/vbcable/`. `scripts/before-pack.cjs`
  guarantees this before packaging; `electron-builder.yml` bundles it into
  `resources/vbcable/` and `build/installer.nsh` installs it silently (elevated).
- **Installer**: `npm run dist:win` runs electron-builder (NSIS). See the
  `dist-win-release` skill and [RELEASE_VALIDATION.md](RELEASE_VALIDATION.md).

## Security posture (summary)

- Electron: context isolation, sandbox, no node integration, a restrictive CSP
  (`src/renderer/index.html`), validated `openExternal`, no arbitrary channel
  invocation.
- Backend: per-session token auth, `modelId` validation on `install-deps`, audio
  path sanitization, generic error bodies (no exception leakage), 5000-char TTS
  cap.
- Downloads: HTTPS-only with redirect caps; model downloads require a pinned
  SHA-256 in `assets/model-registry.json` or they are blocked; VB-Cable is
  checksum-verified.

See [SECURITY.md](../SECURITY.md) for the reporting process and supported
versions.

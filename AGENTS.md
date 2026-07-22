# Agent Instructions — VoiceLaunch TTS

## Project

VoiceLaunch TTS is a desktop Electron launcher for running open-source TTS models locally, focused on accessibility for people with speech impairments and non-speaking users.

## Stack

- **Shell**: Electron 35 + Vite
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Python 3.10+ + FastAPI + Uvicorn
- **TTS Engines**: Piper, Kokoro, MeloTTS, XTTS v2, Fish Speech, Bark
- **Audio**: sounddevice + soundfile + VB-Audio Virtual Cable

## Directory Structure

```
src/
  main/         # Electron main process (Node.js)
  preload/      # Preload script (secure API)
  renderer/     # React application
  python/       # FastAPI backend
  shared/       # Shared TypeScript types
```

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Distribution
npm run dist:win
```

## Conventions

- Use TypeScript strict in all new code
- React components: arrow functions with export default
- IPC: always type payloads in `src/shared/types.ts`
- Python: docstrings on public functions, PEP 8
- TTS models: lazy imports inside the wrappers to avoid mandatory dependencies

## Python Dependencies

Install via: `pip install -r src/python/requirements.txt`

For a standalone build: `scripts/build-python.bat`

## Notes

- The Python backend runs on localhost:9472
- The launcher manages the lifecycle of the Python process
- Cloned voices are stored in `%APPDATA%\voicelaunch-tts\voices\`
- Models are stored in `%APPDATA%\voicelaunch-tts\models\`

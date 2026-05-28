---
name: beta-validation
description: Use when validating a VoiceLaunch TTS beta build or planning clean-machine testing — the beta-core trail (Piper + Kokoro + VB-Cable + Discord/Zoom) and the open beta gates. Trigger on "beta", "clean machine", "VB-Cable", "Discord test".
---

# Beta Core Validation — VoiceLaunch TTS

Reference: `docs/BETA_PROGRAM.md`, `codex.md`.

## Beta-core trail (mandatory path)
- **Piper** is the lightest entry engine; **Kokoro** is the second mandatory engine.
- XTTS v2 is advanced-only (NVIDIA/CUDA), NOT part of the first required experience.
- MeloTTS / Fish Speech / Bark are experimental and hidden by default.

## Open gates (not machine-blocking, but ship-blocking for wider beta)
1. **Clean Windows install** — install the NSIS package on a fresh machine; verify first run, backend boot, and model install.
2. **Virtual mic end-to-end** — install VB-Cable (embedded installer, fallback to official site), route into **Discord/Zoom**, and speak through the pipeline (use the DiscordReadyBanner "Testar agora").
3. **Beta support channel** — a direct channel for non-technical testers must exist before wider invites.

## Smoke (packaged)
- `.\scripts\smoke-packaged-backend.ps1 -Port 9482` → backend answers `/health` + `/models`, port fallback OK.

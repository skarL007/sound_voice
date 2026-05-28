---
name: dist-win-release
description: Use when cutting a VoiceLaunch TTS release or building the Windows installer — npm run dist:win, latest.yml, SHA-256, packaged-backend smoke, changelog/release notes. Trigger on "release", "dist:win", "installer", or a version bump.
---

# Windows Release Ritual — VoiceLaunch TTS

Operational source of truth: `codex.md`. Follow this order; do not skip the smoke.

## Pre-flight (must be green)
1. `npx tsc --noEmit` → 0 errors
2. `npx vitest run` → all pass
3. `npm run build` → exit 0

## Build the installer
4. `npm run dist:win` → NSIS installer in `dist/` with the canonical hyphenated name (e.g. `VoiceLaunch-TTS-Setup-X.Y.Z.exe`)
5. Confirm `dist/latest.yml` points at the canonical artifact name (auto-update metadata must match).

## Verify the packaged backend (do NOT skip)
6. `.\scripts\smoke-packaged-backend.ps1 -Port 9482`
7. Launch `dist/win-unpacked/VoiceLaunch TTS.exe`; confirm `/health` and `/models` respond and port fallback works when 9472 is busy.

## Integrity & notes
8. Record SHA-256 (and SHA-512) of the installer in the release notes.
9. Update `CHANGELOG.md` + release notes (Conventional-Commit style; explain the *why*).
10. `dist/` may still contain a legacy spaced-name installer from older builds — the canonical artifact is the hyphenated one.

## Known constraints
- Installer is unsigned (SmartScreen warning) — acceptable for closed beta only.
- Auto-update stays OFF until a real release channel exists.
- Stop before any `git push` or publish and confirm with the user.

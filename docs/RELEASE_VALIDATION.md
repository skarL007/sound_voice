# Release Validation Protocol — Virtual Mic (Discord + Games)

This is the final manual gate before tagging a public release. It validates the
core product promise: **the generated voice works as a microphone in Discord
and in any game**, on a machine that has never seen the project.

Run it against the release-candidate NSIS installer (`dist/*.exe`), not a dev
build.

## Environment

- [ ] Clean Windows 11 machine or VM (no VB-Cable, no Python, no Node installed)
- [ ] **Standard (non-admin) Windows account** — UAC elevation must be prompted,
      not implicit
- [ ] Discord installed, logged into a test account, plus a second account on
      another device to listen
- [ ] One game with voice chat installed (e.g. CS2, Valorant, or Fortnite)

## 1. Installation

- [ ] Run the installer from a standard account; UAC prompt appears and, after
      accepting, installation completes without errors
- [ ] VB-Cable driver is installed silently by the installer (check
      Sound settings → `CABLE Input (VB-Audio Virtual Cable)` exists);
      reboot if Windows asks
- [ ] SmartScreen note: "More info → Run anyway" flow works and matches the
      README instructions
- [ ] SHA-256 of the downloaded installer matches the value published in the
      GitHub Release (`Get-FileHash -Algorithm SHA256 <file>`)

## 2. First run / onboarding

- [ ] App opens on the Speak screen; onboarding tutorial appears
- [ ] Backend health indicator reaches ready (or the app remains fully usable
      on the cloud path if the backend is still warming up)
- [ ] Onboarding mic step detects the VB-Cable (live check turns green)
- [ ] Enabling the virtual mic auto-selects `CABLE Input` without manual
      device picking

## 3. Discord — all three speak paths

In Discord: Settings → Voice → Input Device = `CABLE Output (VB-Audio Virtual
Cable)`, join a voice channel with the second account listening.

- [ ] **Main speak button**: type a phrase, press Speak → second account hears it
- [ ] **Global shortcut with the app minimized**: trigger a voice shortcut
      hotkey → second account hears it (this is the regression test for the
      null-cable silent failure)
- [ ] **Compact view quick-fire**: switch to compact mode, fire a quick
      phrase → second account hears it
- [ ] Monitor: with monitoring enabled, the local user also hears the voice on
      their speakers

## 4. Game voice chat

- [ ] In the game's audio settings, set input device to `CABLE Output`
- [ ] Trigger a voice shortcut while the game has focus (app in background) →
      teammates hear the TTS voice
- [ ] Game audio (output) is unaffected

## 5. Failure modes (must never be silent)

- [ ] Deny microphone permission when asked → app shows an explicit warning
      (not silence) and explains how to fix it
- [ ] Uninstall/disable VB-Cable, restart the app → mic status shows "not
      detected" with guidance; speaking still plays on the default speaker
- [ ] Turn the virtual mic ON with no cable available → warning toast appears
      when speaking ("voice will play on speakers, not Discord")

## 6. Offline fallback (auto engine routing)

- [ ] With voice source on Auto and Piper installed: disconnect Wi-Fi →
      the next speak comes out of the local engine and still reaches Discord
- [ ] Status line shows the routing decision (e.g. "Auto → Piper (offline)")
- [ ] Reconnect → next speak returns to the Edge (online) voice

## 7. Packaged backend smoke

From the install directory:

- [ ] `scripts/smoke-packaged-backend.ps1` passes, including the `/mic/status`
      endpoint (packaged backend is not stale)

## Sign-off

| Check | Machine | Windows | Result | Date |
|-------|---------|---------|--------|------|
| Full protocol | | | | |

A release only ships when every box above is checked on at least one clean
machine.

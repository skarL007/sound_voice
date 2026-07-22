## VoiceLaunch TTS v1.3.0

The first public open-source release. Turn your typing into a real microphone for
Discord and any game — hundreds of natural voices work instantly, and a local
voice takes over automatically when you go offline.

### What's new

- **Smart voice routing (Auto mode)** — the app uses online Edge TTS when you
  have internet and automatically falls back to a local voice (Kokoro/Piper)
  when you're offline or the connection drops. The routing decision is shown in
  the UI ("Auto → Edge (online)" / "Auto → Piper (offline)").
- **Virtual mic that just works** — the generated voice reaches Discord and any
  game reliably from every speak path (main button, global shortcut, compact
  quick-fire). Failures are never silent: if the voice can't reach the cable,
  the app tells you why.
- **Fully English UI and documentation** — the whole app and docs are now in
  English.
- **Hardened local backend** — the Python backend requires a per-session token,
  validates model downloads against pinned SHA-256 checksums, and no longer
  leaks internal error details.
- **Bundled virtual microphone** — VB-Audio Virtual Cable ships inside the
  installer and sets itself up. In Discord/Zoom/games, select **CABLE Output**
  as the microphone.

### Install

1. Download **`VoiceLaunch-TTS-Setup-1.3.0.exe`** below.
2. Run it. On the **Windows SmartScreen** prompt (this is an unsigned build),
   click **More info → Run anyway**.
3. During install, the **virtual microphone (VB-Cable)** is set up automatically.
   Restart Windows if prompted.
4. Open the app, type, and Speak. To use it in Discord/games, enable the virtual
   mic in the app and select **CABLE Output** as the microphone in the other app.

### Verify the download (recommended)

```powershell
Get-FileHash -Algorithm SHA256 .\VoiceLaunch-TTS-Setup-1.3.0.exe
```

<!-- Paste the SHA-256 of the published installer here before publishing the release. -->
**SHA-256:** `<fill in from the built installer>`

### Known limitations

- Windows 10/11 x64 only.
- The installer is unsigned — the SmartScreen prompt is expected. The SHA-256
  above lets you verify authenticity.
- If the virtual microphone doesn't appear right after installing, restart Windows.

### Full changelog

See [CHANGELOG.md](https://github.com/skarL007/sound_voice/blob/main/CHANGELOG.md).

# Virtual Microphone - Technical Guide

## How It Works

VoiceLaunch TTS uses **VB-Audio Virtual Cable** to route the generated audio as if it were a real microphone. This lets you send the synthesized voice to any application that accepts a microphone input, such as Discord, Zoom, and games.

## Architecture

```text
[VoiceLaunch TTS] --audio--> [CABLE Input (VB-Audio)]
                                     |
                                     v
                           [CABLE Output (Virtual Mic)]
                                     |
                                     v
                         [Discord / Zoom / Games]
```

## Installation

### Through the app (recommended)
1. Open the **Speak** screen (or **Settings > Virtual Microphone**).
2. If VB-Cable is not detected, click **Install virtual microphone**.
3. The installer ships inside VoiceLaunch TTS and installs itself. If the bundled setup is unavailable, the launcher downloads the official VB-Audio installer with a progress bar, extracts the package, and opens the installer.
4. In the VB-Cable installer, click **Install Driver**. If it asks, restart Windows.
5. Return to VoiceLaunch TTS and click **Check installation** (re-detects without restarting the app).
6. Once **VB-Cable detected** appears, click **Enable virtual microphone**.

If the automatic download fails (network or URL unavailable), the launcher opens the official site for a manual download.

> Source: **VB-Cable by VB-Audio** (donationware) — https://vb-audio.com/Cable/. Downloading/redistributing is permitted as long as the source stays visible to the user.

### Manual
1. Download from: https://vb-audio.com/Cable/
2. Extract the ZIP and run `VBCABLE_Setup_x64.exe` (or `VBCABLE_Setup.exe` on 32-bit)
3. Restart the computer

## Configuring the Applications

### Discord
1. User Settings > Voice & Video
2. Input Device: **CABLE Output**
3. Turn off "Noise Suppression" and "Echo Cancellation" for better quality

### Zoom
1. Settings > Audio
2. Microphone: **CABLE Output**
3. Uncheck "Suppress background noise"

### Games
1. Audio or Voice settings
2. Microphone: **CABLE Output**

## Operating Modes

### Push to Talk (PTT)
- TTS is only sent to the virtual microphone while you hold a configured key
- Useful to avoid accidental transmission

### Always On
- All generated audio goes straight to the virtual microphone
- Recommended for continuous conversation

## Merging with a Real Microphone

To use TTS and real speech at the same time, install **VoiceMeeter Banana**:
1. Set your real microphone on input 1
2. Set CABLE Output on input 2
3. Select VoiceMeeter Output as the microphone in the application

## Troubleshooting

| Problem | Solution |
|----------|---------|
| No sound in the app | Check that CABLE Output is selected as the microphone |
| I only hear an echo | Turn off "Listen to this device" in the Sound Control Panel |
| Poor quality | Increase the VB-Cable sample rate to 48000 Hz |
| High latency | Use lightweight models like Piper and Kokoro in CPU mode |

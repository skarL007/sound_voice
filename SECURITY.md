# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.3.x   | Yes       |
| < 1.3   | No        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately through GitHub's advisory system:
https://github.com/skarL007/sound_voice/security/advisories/new

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- A suggested fix (optional)

You can expect an acknowledgement within 72 hours and a remediation or
mitigation plan within 14 days for critical issues.

---

## Security Design

VoiceLaunch TTS is built with the following security properties.

### Electron

- **Sandboxed renderer**: runs with `sandbox: true`, `contextIsolation: true`,
  and `nodeIntegration: false`. The renderer has no Node.js access and reaches
  the main process only through a fixed, typed `contextBridge` API.
- **Content Security Policy**: `src/renderer/index.html` restricts script,
  media, and connection targets to the app and the Edge TTS endpoint.
- **Safe external navigation**: `openExternal` is validated as an HTTP(S) URL;
  new-window requests are denied.

### Local backend authentication

- The FastAPI backend binds to `127.0.0.1:9472`, but localhost is not a trust
  boundary. On launch the main process generates a **random per-session token**
  and injects it into the backend via an environment variable.
- Every HTTP request (except `GET /health`) and the WebSocket must present a
  matching `X-VoiceLaunch-Token` header, or the backend returns `401`. This
  closes the localhost drive-by surface (a web page POSTing to `:9472`)
  regardless of CORS. The renderer never sees the token — all calls are proxied
  through the main process.

### Input validation

- Model IDs are validated (including on `/models/install-deps`, which runs
  `pip`), audio paths are sanitized against traversal, and audio file extensions
  are checked against an allowlist that rejects `.exe`, `.bat`, `.cmd`, `.ps1`,
  `.js`, `.sh`.
- TTS input is capped at 5000 characters. Error responses are generic — internal
  exception text is logged server-side, never returned to the client.

### Downloads

- The download manager is **HTTPS-only** (anti-SSRF) and caps redirect chains at
  5 hops.
- **Model downloads require a pinned SHA-256** in `assets/model-registry.json`;
  a model without a checksum is blocked, not silently trusted.
- The bundled VB-Cable driver is SHA-256 verified both at build time and at
  runtime.

### Privacy

- No telemetry, no analytics. Local TTS synthesis sends nothing off the machine.
  Cloud voices (Edge TTS) send only the text to be synthesized to Microsoft's
  public Read-Aloud endpoint.
- The `Sec-MS-GEC` token used for Edge TTS is derived locally and is not a
  persistent credential.

### Code signing

The installer is currently **unsigned** (see [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md)).
Each release publishes the installer's SHA-256 so you can verify authenticity;
an OSS code-signing track is being pursued.

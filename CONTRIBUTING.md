# Contributing to VoiceLaunch TTS

Thanks for your interest! VoiceLaunch TTS is an assistive communication
tool — contributions that improve accessibility, reliability, and
first-run success are especially welcome.

## Platform

This project is **Windows 10/11 only**. The build system, the Python backend,
and the NSIS installer require Windows. Mac and Linux support is planned
for a future release.

---

## Ways to contribute

- **Bug reports** — open an Issue using the bug template
- **Feature requests** — open an Issue using the feature template
- **Documentation** — README, docs/, inline comments
- **Tests** — vitest unit tests in `src/**/*.test.ts`
- **Renderer UI** — React/TypeScript in `src/renderer/`
- **Electron main process** — `src/main/`
- **Python backend** — `src/python/` (requires Python 3.12)
- **Design** — the `.claude/agents/launcher-designer.md` and `app-flow-designer.md` agents help audit the UI/flow (design v2: sober, no neon)

---

## Development setup

### Prerequisites

- Windows 10 or 11 (x64)
- Node.js 20 or higher
- npm 10 or higher
- Python 3.12 (only needed to work on the backend or build the installer)
- Git

### Install and run

```sh
git clone https://github.com/skarL007/sound_voice.git
cd sound_voice
npm install
npm run dev
```

The `npm run dev` command starts the Electron app. The Python backend does
**not** start automatically in dev mode unless the `python_dist/` directory is
present. Without it, the app uses Edge TTS cloud voices, which works for
most UI development.

### Build the Python backend (optional)

This step requires Python 3.12 and takes 5–15 minutes:

```bat
scripts\build-python.bat
```

This creates `python_dist\voicelaunch-backend\voicelaunch-backend.exe`.
The directory is excluded from git (~200 MB).

### Run the tests

```sh
npm test
```

All tests must pass before a PR can be merged. You can also run the
TypeScript type check:

```sh
npm run type-check
```

### Build the installer

```sh
npm run dist:win
```

This produces `dist/VoiceLaunch-TTS-Setup-<version>.exe`. It requires the
`python_dist/` directory to be present.

---

## Pull Request checklist

- [ ] `npm test` passes
- [ ] `npm run type-check` succeeds with no TypeScript errors
- [ ] `npm run build` succeeds with no errors
- [ ] Changes are scoped to a single responsibility per PR
- [ ] New behavior has test coverage where practical
- [ ] Accessibility preserved (keyboard navigation, visible focus,
      WCAG AA contrast)

---

## Code style

- TypeScript strict mode (`tsconfig.json`)
- Tailwind CSS for styling — no inline `style` where possible
- Zustand for state — subscribe only to the fields the component uses
  (see the existing selectors for reference)
- Electron IPC — validate all inputs in the main-process handler
  before use

---

## Commit messages

Use conventional commits:

```
feat: add audio output selector to the settings page
fix: prevent SSRF in the download manager redirect chain
docs: update virtual microphone guide for VRChat PTT
test: add coverage for the cloudAudio playback sequence
```

---

## Security issues

Do **not** open public Issues for security vulnerabilities. See
[SECURITY.md](SECURITY.md) for the responsible disclosure process.

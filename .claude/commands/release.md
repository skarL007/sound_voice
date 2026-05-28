---
description: Release guiado do VoiceLaunch TTS (delega à skill dist-win-release). Uso opcional: /release 1.2.0
---
Conduza um release do VoiceLaunch TTS seguindo a skill `dist-win-release`. Versão alvo (opcional): $1

Passos:
1. Aplique a skill `dist-win-release`.
2. Pré-flight verde: tsc, vitest, build.
3. `npm run dist:win`; confira `dist/latest.yml` × nome canônico do artefato (hifenizado).
4. Smoke do backend empacotado (`scripts/smoke-packaged-backend.ps1 -Port 9482`) + app em `dist/win-unpacked`.
5. Registre SHA-256/512 nas release notes; atualize `CHANGELOG.md` (Conventional Commits, explique o porquê).
6. PARE antes de qualquer `git push` ou publicação e confirme com o usuário.

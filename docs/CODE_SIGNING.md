# Code Signing Guide - VoiceLaunch TTS

> Windows executables and installers must be signed before any public release.

## Why Code Signing Matters

Without code signing, Windows users will see:
- **"Windows protected your PC"** (SmartScreen block)
- **"Unknown publisher"** in UAC prompts
- Antivirus false positives

This blocks ~80% of non-technical users from installing.

---

## Options

### Option 1: Standard Code Signing Certificate (~$200/year)

**Best for:** Indie developers, small teams

**Providers:** Sectigo, DigiCert, GoDaddy, SSL.com

**Steps:**
1. Purchase a **Standard Code Signing Certificate** (not EV)
2. Validate your identity/organization (1-3 business days)
3. Download the `.pfx` file
4. Build with signing:
   ```powershell
   $env:WIN_CSC_LINK = "C:\certs\voicelaunch.pfx"
   $env:WIN_CSC_KEY_PASSWORD = "your-password"
   npm run dist:win
   ```

**Result:** SmartScreen warning disappears after ~2 weeks of reputation building.

---

### Option 2: EV Code Signing Certificate (~$400-700/year)

**Best for:** Immediate SmartScreen bypass

**Providers:** DigiCert, Sectigo

**Steps:**
1. Purchase an **EV Code Signing Certificate**
2. Receive a hardware USB token or cloud HSM
3. Install token drivers
4. Build with signing:
   ```powershell
   $env:WIN_CSC_LINK = "C:\certs\token-config.json"
   $env:CSC_KEY_PASSWORD = "token-PIN"
   npm run dist:win
   ```

**Result:** Immediate SmartScreen bypass. No reputation waiting period.

---

### Option 3: Microsoft Store (Free)

**Best for:** Maximum reach, no certificate cost

**Steps:**
1. Create a Microsoft Partner Center account
2. Submit the `.msix` package (use `electron-builder --win msix`)
3. Pass Microsoft validation

**Result:** No SmartScreen, automatic updates via Store, wider distribution.

**Trade-off:** Microsoft takes 15% revenue (if monetized).

---

## GitHub Actions CI/CD Signing

Add these secrets to your GitHub repository:

- `WIN_CSC_LINK` - Base64-encoded PFX file contents
- `WIN_CSC_KEY_PASSWORD` - Certificate password

Create `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run dist:win
        env:
          WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/*.exe
```

---

## Current Status

| Build | Signed | SmartScreen |
|-------|--------|-------------|
| `npm run dist:win` sem credenciais de assinatura | No | Will warn |
| Build assinado com `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` | Yes | Reduced warning risk |

---

## Release Policy - 2026-05-15

1. **Beta interno/controlado:** build nao assinado ainda pode circular internamente, desde que SmartScreen e suporte manual sejam tratados como risco conhecido.
2. **Release publica:** assinatura continua obrigatoria. Nao publicar installer publicamente sem certificado configurado no pipeline ou no ambiente oficial de release.
3. **Auto-update:** deve continuar desligado. Nao religar antes de validar, no minimo, estes tres gates:
   - pipeline oficial de release reproduzivel;
   - `publish`/release target alinhado ao repo real;
   - instalacao e trilha core em maquina limpa.
4. **Sequencia correta:** primeiro validar build empacotado real de `Piper + Kokoro`, depois maquina limpa e suporte beta, e so entao religar distribuicao automatica.

## Operational Notes

- Em `2026-05-15`, `cmd /c npm run test` e `cmd /c npm run build` seguem verdes no repo.
- Em `2026-05-15`, a revalidacao ponta a ponta do backend empacotado apos o closeout ficou bloqueada nesta maquina ao tentar rerodar `scripts/build-python.bat` / `scripts/build-python-venv.bat`, porque o Python local falhou na criacao do venv limpo (`ensurepip`) e em temporarios necessarios para um artefato novo auditavel.
- Isso significa que assinatura e auto-update continuam sendo gates de release, nao sinais de que o pacote atual ja esta pronto para abrir publico.

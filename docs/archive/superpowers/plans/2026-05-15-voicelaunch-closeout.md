# VoiceLaunch TTS Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar o launcher-only beta core com build reproduzivel, release config correto, hardening final e gates operacionais realmente executados.

**Architecture:** congelar a superficie do produto no launcher Electron + backend FastAPI empacotado para o fluxo principal `Piper + Kokoro + VB-Cable`. Tratar `XTTS v2`, `Fish Speech`, `Bark` e `MeloTTS` como trilha avancada fora do pacote beta principal ate existir uma estrategia separada e verificavel de dependencia/download. Unificar contratos de path e release pelo processo principal do Electron, e validar tudo por smoke do backend empacotado e checklist de maquina limpa.

**Tech Stack:** Electron 35, React 19, TypeScript, FastAPI, PyInstaller, electron-builder, Vitest, PowerShell

---

## Assumptions

- O alvo deste fechamento e **beta controlado**, nao release publica irrestrita.
- O caminho obrigatorio do produto continua `Piper -> Kokoro -> comunicacao assistiva -> microfone virtual`.
- O pacote distribuido nao deve depender de `pip install` rodando de dentro do `.exe` empacotado.

## File Map

- Modify: `electron-builder.yml`
- Modify: `src/main/app-config.ts`
- Modify: `src/main/python-manager.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/main/security-utils.ts`
- Create: `src/main/__tests__/config.test.ts`
- Modify: `src/main/__tests__/security.test.ts`
- Create: `src/python/requirements-packaged.txt`
- Modify: `scripts/build-python-venv.bat`
- Modify: `scripts/build-python.bat`
- Create: `scripts/smoke-packaged-backend.ps1`
- Modify: `src/python/main.py`
- Modify: `src/python/model_manager.py`
- Modify: `docs/BETA_PROGRAM.md`
- Modify: `docs/CODE_SIGNING.md`
- Modify: `codex.md`

### Task 1: Fixar release metadata e contrato unico de runtime path

**Files:**
- Create: `src/main/__tests__/config.test.ts`
- Modify: `electron-builder.yml`
- Modify: `src/main/app-config.ts`
- Modify: `src/main/python-manager.ts`
- Modify: `src/python/main.py`
- Modify: `src/python/model_manager.py`

- [ ] **Step 1: Escrever o teste que prova o drift atual de release**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('release metadata', () => {
  it('keeps electron-builder publish target aligned with package repository', () => {
    const root = join(__dirname, '../../..')
    const builder = readFileSync(join(root, 'electron-builder.yml'), 'utf-8')
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))

    expect(pkg.repository.url).toContain('skarL007/sound_voice')
    expect(builder).toMatch(/owner:\s*skarL007/)
    expect(builder).toMatch(/repo:\s*sound_voice/)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que ele falha antes da correcao**

Run: `cmd /c npx vitest run src/main/__tests__/config.test.ts`
Expected: FAIL porque `electron-builder.yml` ainda aponta para `voicelaunch/voicelaunch-tts`.

- [ ] **Step 3: Corrigir o publish target e criar chaves unicas de runtime**

```yml
publish:
  provider: github
  owner: skarL007
  repo: sound_voice
  channel: latest
  releaseType: release
```

```ts
export const RUNTIME_ENV_KEYS = {
  modelRegistryPath: 'VOICELAUNCH_MODEL_REGISTRY_PATH',
  userDataPath: 'VOICELAUNCH_USER_DATA',
} as const
```

```ts
env[RUNTIME_ENV_KEYS.modelRegistryPath] = join(process.resourcesPath, 'assets', 'model-registry.json')
env[RUNTIME_ENV_KEYS.userDataPath] = APP_CONFIG.userDataPath
```

```py
USER_DATA = Path(
    os.environ.get("VOICELAUNCH_USER_DATA")
    or (Path(os.environ.get("APPDATA", Path.home() / "AppData/Roaming")) / "voicelaunch-tts")
)
```

- [ ] **Step 4: Rodar os testes e confirmar o contrato**

Run: `cmd /c npx vitest run src/main/__tests__/config.test.ts src/main/__tests__/security.test.ts`
Expected: PASS.

- [ ] **Step 5: Verificar o builder e o backend com os paths novos**

Run: `cmd /c npm run build`
Expected: PASS.

Run: `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-packaged-backend.ps1 -Port 9481`
Expected: `/health` e `/models` respondendo com `status=ok`.

- [ ] **Step 6: Commit**

```bash
git add electron-builder.yml src/main/app-config.ts src/main/python-manager.ts src/python/main.py src/python/model_manager.py src/main/__tests__/config.test.ts
git commit -m "fix: align release target and runtime path contract"
```

### Task 2: Tornar o build Python deterministico para o beta core

**Files:**
- Create: `src/python/requirements-packaged.txt`
- Modify: `scripts/build-python-venv.bat`
- Modify: `scripts/build-python.bat`
- Create: `scripts/smoke-packaged-backend.ps1`
- Modify: `src/python/model_manager.py`

- [ ] **Step 1: Congelar o conjunto empacotado do beta core**

```txt
-r requirements-core.txt
-r requirements-piper.txt
-r requirements-kokoro.txt
```

- [ ] **Step 2: Fazer o build oficial usar sempre venv limpo, sem pausa interativa**

```bat
set REQUIREMENTS_FILE=%SRC_DIR%\requirements-packaged.txt
"%VENV_DIR%\Scripts\pip.exe" install -r "%REQUIREMENTS_FILE%" --quiet
```

```bat
call "%~dp0build-python-venv.bat"
if errorlevel 1 exit /b %errorlevel%
```

Remove:

```bat
pause
```

- [ ] **Step 3: Bloquear `pip install` em runtime empacotado e devolver erro honesto**

```py
if getattr(sys, "frozen", False):
    return {
        "success": False,
        "error": "Este build beta inclui apenas Piper e Kokoro. Engines avancados ficam fora do pacote principal."
    }
```

- [ ] **Step 4: Adicionar smoke oficial do backend empacotado**

```powershell
param([int]$Port = 9481)
$exe = Resolve-Path 'python_dist\voicelaunch-backend\voicelaunch-backend.exe'
$proc = Start-Process -FilePath $exe -ArgumentList '--port',"$Port" -PassThru -WindowStyle Hidden
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5
  $models = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/models" -TimeoutSec 5
  if ($health.status -ne 'ok') { throw 'health failed' }
  if (-not $models) { throw 'models failed' }
  $health | ConvertTo-Json -Compress
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
}
```

- [ ] **Step 5: Rodar o build e provar que o pacote saiu limpo**

Run: `powershell -ExecutionPolicy Bypass -File .\scripts\build-python.bat`
Expected: `python_dist\voicelaunch-backend\voicelaunch-backend.exe` gerado sem prompt travando a automacao.

Run: `Get-ChildItem python_dist\voicelaunch-backend\_internal | Where-Object { $_.Name -match 'asyncpg|faiss|coverage|hypothesis|flask' }`
Expected: sem resultados.

Run: `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-packaged-backend.ps1 -Port 9482`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/python/requirements-packaged.txt scripts/build-python-venv.bat scripts/build-python.bat scripts/smoke-packaged-backend.ps1 src/python/model_manager.py
git commit -m "build: make packaged backend deterministic for beta core"
```

### Task 3: Fechar hardening residual de seguranca e confiabilidade

**Files:**
- Modify: `src/python/main.py`
- Modify: `src/main/index.ts`
- Modify: `src/main/security-utils.ts`
- Modify: `src/main/__tests__/security.test.ts`

- [ ] **Step 1: Escrever os testes de seguranca faltantes**

```ts
it('accepts only http/https external urls', () => {
  expect(isHttpUrl('https://example.com')).toBe(true)
  expect(isHttpUrl('javascript:alert(1)')).toBe(false)
  expect(isHttpUrl('file:///C:/Windows/System32/calc.exe')).toBe(false)
})
```

```ts
it('keeps renderer sandbox enabled', () => {
  const source = readFileSync(join(root, 'src/main/index.ts'), 'utf-8')
  expect(source).toMatch(/sandbox:\s*true/)
})
```

- [ ] **Step 2: Rodar os testes e registrar a base atual**

Run: `cmd /c npx vitest run src/main/__tests__/security.test.ts`
Expected: PASS para o que ja existe; novos casos de URL podem falhar antes do patch.

- [ ] **Step 3: Sanitizar exclusao de voz e blindar `window.open` externo**

```py
class DeleteVoiceRequest(BaseModel):
    voiceId: str

    @field_validator("voiceId")
    @classmethod
    def validate_voice_id(cls, value: str) -> str:
        if not value.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Invalid voiceId")
        return value
```

```ts
mainWindow.webContents.setWindowOpenHandler((details) => {
  if (!isHttpUrl(details.url)) {
    return { action: 'deny' }
  }
  shell.openExternal(details.url)
  return { action: 'deny' }
})
```

- [ ] **Step 4: Provar que o backend rejeita input malicioso**

Run: `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-packaged-backend.ps1 -Port 9483`
Expected: PASS.

Run:

```powershell
$body = @{ voiceId = '..\..\Windows\System32' } | ConvertTo-Json
Invoke-WebRequest -Uri 'http://127.0.0.1:9483/voice/delete' -Method Post -ContentType 'application/json' -Body $body
```

Expected: `400` ou `422`, nunca `success: true`.

- [ ] **Step 5: Rodar a regressao curta**

Run: `cmd /c npm run test`
Expected: `21/21` ou mais testes passando.

Run: `cmd /c npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/python/main.py src/main/index.ts src/main/security-utils.ts src/main/__tests__/security.test.ts
git commit -m "fix: close remaining closeout security gaps"
```

### Task 4: Executar os gates reais do beta core e fechar checkpoint

**Files:**
- Modify: `docs/BETA_PROGRAM.md`
- Modify: `docs/CODE_SIGNING.md`
- Modify: `codex.md`

- [ ] **Step 1: Atualizar o checklist para o estado real do produto**

```md
- [ ] Validar instalador canonico em maquina Windows limpa
- [ ] Validar Piper e Kokoro de ponta a ponta
- [ ] Validar VB-Cable + Discord/Zoom
- [ ] Registrar friccao de SmartScreen
- [ ] Definir canal direto de suporte ao beta
```

- [ ] **Step 2: Executar a rodada de validacao manual em maquina limpa**

Run:

```text
1. Instalar `dist/VoiceLaunch-TTS-Setup-1.0.0.exe`
2. Confirmar abertura da UI
3. Confirmar `/health`
4. Instalar Piper
5. Falar com Enter
6. Instalar Kokoro
7. Alternar Piper/Kokoro
8. Ativar VB-Cable
9. Validar audio no Discord/Zoom
```

Expected: todos os itens da trilha core marcados como concluidos ou com bug reproduzivel anexado.

- [ ] **Step 3: Registrar assinatura e politica de release**

```md
## Estado atual
- SmartScreen ainda avisa sem assinatura
- auto-update permanece desligado ate release pipeline validado
- release publica so depois de assinatura e trilha core limpa
```

- [ ] **Step 4: Atualizar `codex.md` com o veredito final**

```md
- build reproduzivel validado
- publish target alinhado ao repo real
- smoke do backend empacotado documentado
- beta core em maquina limpa: [PASS/FAIL]
- suporte ao beta definido: [canal real]
```

- [ ] **Step 5: Rodar a verificacao final antes de encerrar**

Run: `cmd /c npm run test`
Expected: PASS.

Run: `cmd /c npm run build`
Expected: PASS.

Run: `cmd /c npm run dist:win`
Expected: PASS com `dist/latest.yml` coerente.

- [ ] **Step 6: Commit**

```bash
git add docs/BETA_PROGRAM.md docs/CODE_SIGNING.md codex.md
git commit -m "docs: record beta closeout gates and release policy"
```

## Exit Criteria

- `electron-builder.yml` alinhado com `https://github.com/skarL007/sound_voice.git`
- `python_dist` gerado por venv limpo e sem lixo fora do escopo do beta core
- build empacotado nao depende de `pip install` dentro do backend congelado
- `/voice/delete` rejeita `voiceId` invalido
- `window.open` externo aceita apenas `http/https`
- `npm test`, `npm run build`, `npm run dist:win` e smoke do backend empacotado passam
- trilha Core de `docs/BETA_PROGRAM.md` executada em maquina limpa
- canal de suporte ao beta definido

Plan complete and saved to `docs/superpowers/plans/2026-05-15-voicelaunch-closeout.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

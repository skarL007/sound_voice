# Auditoria Completa — VoiceLaunch TTS

> Data: 2026-05-11
> Escopo: Segurança, Performance, Bugs, Arquitetura, Acessibilidade, Build/Distribuição
>
> **Addendum 2026-05-11 — estado pós-correções:** este documento preserva o snapshot da auditoria bruta. Depois dele, os itens críticos de segurança e os principais bugs listados abaixo foram corrigidos no checkout atual, e houve verificação fresca com `npm test` (**15 testes passando**) e `npm run build` (**OK**). O status atual do projeto é **MVP local estabilizado**, mas **ainda não pronto para release pública irrestrita**, porque seguem pendentes a execução do beta real, a validação final do instalador, a assinatura de código e a decisão final sobre isolamento/degradação de engines avançados.

---

## 1. RESUMO EXECUTIVO

| Categoria | CRÍTICO | ALTO | MÉDIO | BAIXO |
|-----------|---------|------|-------|-------|
| Segurança | 3 | 4 | 3 | 2 |
| Bugs | 2 | 3 | 5 | 4 |
| Performance | 0 | 2 | 3 | 2 |
| Arquitetura | 0 | 1 | 4 | 3 |
| Acessibilidade | 0 | 0 | 3 | 2 |
| Build/Dist | 0 | 1 | 2 | 1 |

**Status geral: NÃO está pronto para release pública.**
Os 3 itens CRÍTICOS de segurança devem ser corrigidos antes de qualquer distribuição.

---

## 2. SEGURANÇA 🔒

### 🔴 CRÍTICO — CORS não configurado no backend Python
**Arquivo:** `src/python/main.py`  
**Linha:** 31  
**Descrição:** FastAPI está sem configuração CORS. Qualquer site que o usuário visite pode fazer requisições para `localhost:9472`, incluindo síntese de voz, leitura de arquivos (`/play`), download de modelos e clonagem de voz.  
**Impacto:** Um site malicioso pode usar o backend do usuário sem consentimento. SSRF, exfiltração de dados, enchimento de disco.  
**Fix:**
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*", "file://"],  # ou melhor: origin do Electron
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
```

### 🔴 CRÍTICO — Path traversal em `/play` e `/voice/clone`
**Arquivo:** `src/python/main.py`  
**Linhas:** 159-167, 222-233  
**Descrição:** `PlayRequest.audioPath` e `CloneRequest.audioPath` são usados diretamente em `sf.read()` e `_validate_audio()` sem sanitização. Um renderer comprometido (ou site malicioso via CORS) pode passar `C:/Windows/System32/config/SAM` ou `../../../etc/passwd`.  
**Impacto:** Leitura arbitrária de arquivos no sistema.  
**Fix:**
```python
from pathlib import Path
USER_DATA = Path(os.environ.get("APPDATA", Path.home() / "AppData/Roaming")) / "VoiceLaunch"

def _sanitize_audio_path(audio_path: str) -> Path:
    p = Path(audio_path).resolve()
    # Apenas permitir arquivos dentro de diretórios controlados
    allowed_roots = [USER_DATA / "voices", USER_DATA / "temp", Path(tempfile.gettempdir())]
    for root in allowed_roots:
        try:
            p.relative_to(root.resolve())
            return p
        except ValueError:
            continue
    raise ValueError(f"Audio path outside allowed directories: {audio_path}")
```

### 🔴 CRÍTICO — Sandbox desabilitado no Electron
**Arquivo:** `src/main/index.ts`  
**Linha:** 24  
**Descrição:** `sandbox: false` remove a proteção de process sandboxing do Chromium. Combinado com `contextIsolation: true` mitiga parcialmente, mas qualquer vulnerabilidade no renderer (XSS, RCE via imagem maliciosa) tem acesso direto ao processo do Electron sem sandbox.  
**Impacto:** Comprometimento completo da máquina via renderer.  
**Fix:**
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: true,        // HABILITAR
  contextIsolation: true,
  nodeIntegration: false,
}
```
Nota: Se `sandbox: true` quebrar funcionalidades, use `sandbox: true` e mova todo acesso ao sistema para IPC no main process (já está assim em grande parte).

### 🟠 ALTO — Path traversal em `model:uninstall` (IPC)
**Arquivo:** `src/main/ipc-handlers.ts`  
**Linha:** 130-141  
**Descrição:** `modelId` vindo do renderer é concatenado diretamente em `join(MODELS_DIR, modelId)` sem validação. `modelId = "../../Documents"` deleta a pasta Documents do usuário.  
**Impacto:** Deleção arbitrária de arquivos.  
**Fix:**
```typescript
const SAFE_ID_RE = /^[a-z0-9_]+$/i
if (!SAFE_ID_RE.test(modelId)) return false
```

### 🟠 ALTO — Arbitrary file write em `voice:save-audio` (IPC)
**Arquivo:** `src/main/ipc-handlers.ts`  
**Linha:** 292-299  
**Descrição:** `ext` parameter não é sanitizado. Um renderer comprometido pode passar `../../AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup/malware.bat` como extensão. O `arrayBuffer` é escrito sem validação.  
**Impacto:** Escrita de arquivos arbitrários, persistência de malware.  
**Fix:**
```typescript
const SAFE_EXT_RE = /^[a-z0-9]+$/i
if (!SAFE_EXT_RE.test(ext)) throw new Error('Invalid extension')
const fileName = `clone_${Date.now()}.${ext}`
const filePath = join(tempDir, fileName)
// Garantir que resolve() está dentro de tempDir
if (!filePath.startsWith(tempDir)) throw new Error('Path escape detected')
```

### 🟠 ALTO — `shell.openExternal` sem validação de URL
**Arquivo:** `src/main/ipc-handlers.ts`  
**Linha:** 53-55  
**Descrição:** Qualquer URL vinda do renderer é aberta diretamente. Pode abrir `file://`, `javascript:`, ou protocolos customizados maliciosos.  
**Impacto:** Execução de aplicativos arbitrários via protocol handlers.  
**Fix:**
```typescript
ipcMain.on('shell:open-external', (_, url: string) => {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return
    shell.openExternal(url)
  } catch { /* ignore invalid URLs */ }
})
```

### 🟠 ALTO — Arquivos temporários WAV nunca são deletados
**Arquivo:** `src/python/main.py`  
**Linha:** 142  
**Descrição:** `tempfile.mktemp(suffix=".wav")` cria arquivos em `%TEMP%` que nunca são removidos. Após uso intenso, o disco pode encher.  
**Impacto:** DoS via enchimento de disco. Vazamento de dados (áudios ficam no temp).  
**Fix:** Usar `tempfile.NamedTemporaryFile` com `delete=False` e garantir cleanup em `finally`, ou criar um diretório temporário dedicado com TTL.

### 🟡 MÉDIO — Notificações com conteúdo do renderer
**Arquivo:** `src/main/ipc-handlers.ts`  
**Linha:** 323-331  
**Descrição:** `title` e `body` vêm do renderer sem sanitização. Possível spoofing de notificações do sistema.  
**Fix:** Limitar tamanho (max 200 chars) e sanitizar HTML.

### 🟡 MÉDIO — `wmic` quebrado em `hardware_probe.py`
**Arquivo:** `src/python/hardware_probe.py`  
**Linha:** 30  
**Descrição:** Ainda usa `wmic /format:csv` que retorna "Invalid XSL format" no Windows moderno. Foi corrigido no main process mas não no Python.  
**Impacto:** Hardware detection falha silenciosamente no backend.  
**Fix:** Usar `powershell Get-CimInstance` como no main process.

### 🟡 MÉDIO — `hardware_probe.py` expõe detalhes do sistema
**Arquivo:** `src/python/main.py`  
**Linha:** 85-88  
**Descrição:** `/hardware` retorna informações sensíveis (CPU, RAM, GPU, OS) sem autenticação. Combinado com CORS aberto, qualquer site pode fingerprintar o usuário.  
**Fix:** Restringir acesso via CORS ou adicionar autenticação local (token simples).

---

## 3. BUGS 🐛

### 🔴 CRÍTICO — Loop infinito em `ModelsPage.useEffect`
**Arquivo:** `src/renderer/src/pages/ModelsPage.tsx`  
**Linha:** 31-67  
**Descrição:** O `useEffect` depende de `[models]`, e dentro dele chama `loadModels()` que executa `setModels(registry)`. Como `getModelRegistry()` retorna uma nova array a cada chamada, o React detecta mudança de estado, re-renderiza, e o efeito roda novamente. **Loop infinito.**  
**Impacto:** Aba "Modelos" trava o app com requisições infinitas ao backend.  
**Fix:**
```typescript
useEffect(() => {
  loadModels() // sem depender de `models`
  // ... listeners ...
}, []) // <-- array vazio
```

### 🔴 CRÍTICO — `cpuThreads` incorreto em `hardware-detector.ts`
**Arquivo:** `src/main/hardware-detector.ts`  
**Linha:** 137  
**Descrição:** `cpuThreads: cpus().length` retorna o número de CPUs lógicas, o mesmo que `cpuCores`. O campo deveria refletir threads (hyperthreading).  
**Impacto:** Informação incorreta ao usuário.  
**Fix:**
```typescript
cpuCores: cpus().filter((c, i, arr) => arr.findIndex(x => x.model === c.model) === i).length, // aproximação
// ou use os.cpus() e agrupe por physicalId se disponível
cpuThreads: cpus().length,
```

### 🟠 ALTO — `models` dependency falsa em `ModelsPage`
**Arquivo:** `src/renderer/src/pages/ModelsPage.tsx`  
**Linha:** 52, 67  
**Descrição:** O callback `onDownloadComplete` usa `models.find((m) => m.id === data.modelId)`, mas `models` vem do closure do render anterior. Se o usuário mudar de página e voltar, `models` pode estar desatualizado.  
**Impacto:** Mensagens de notificação com nome incorreto ou undefined.  
**Fix:** Usar ref para `models` ou buscar nome do registry dinamicamente.

### 🟠 ALTO — Memory leak em `ClonePage` (audioUrl)
**Arquivo:** `src/renderer/src/pages/ClonePage.tsx`  
**Linhas:** 76, 108  
**Descrição:** `URL.createObjectURL(blob)` é chamado mas nunca revogado com `URL.revokeObjectURL()`. A cada gravação/upload, memória é alocada e nunca liberada.  
**Impacto:** Memory leak crescente.  
**Fix:**
```typescript
useEffect(() => {
  return () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }
}, [audioUrl])
```

### 🟠 ALTO — `app-config.ts` chama `app.getPath()` em tempo de módulo
**Arquivo:** `src/main/app-config.ts`  
**Linha:** 9-14  
**Descrição:** `app.getPath('userData')` é chamado no topo do módulo. Se importado antes de `app.whenReady()`, pode falhar ou retornar path incorreto.  
**Impacto:** Paths de dados incorretos, perda de configurações.  
**Fix:** Usar getter functions ou inicializar após `app.whenReady()`.

### 🟡 MÉDIO — Duplo import de `app` em `ipc-handlers.ts`
**Arquivo:** `src/main/ipc-handlers.ts`  
**Linhas:** 1, 9  
**Descrição:** `import { app } from 'electron'` aparece duas vezes.  
**Impacto:** Nenhum em runtime, mas gera warning no build.  
**Fix:** Remover linha 9.

### 🟡 MÉDIO — `OnboardingTutorial` usa `React.ReactNode` sem import
**Arquivo:** `src/renderer/src/components/OnboardingTutorial.tsx`  
**Linha:** 18  
**Descrição:** Tipo `React.ReactNode` usado mas `React` não é importado. Com novo JSX transform pode funcionar, mas é frágil.  
**Fix:** `import type { ReactNode } from 'react'` e usar `ReactNode`.

### 🟡 MÉDIO — `DashboardPage` importa `React` desnecessariamente
**Arquivo:** `src/renderer/src/pages/DashboardPage.tsx`  
**Linha:** 1  
**Descrição:** `import React from 'react'` é desnecessário com novo JSX transform.  
**Fix:** Remover import ou trocar para `import type { ReactNode } from 'react'`.

### 🟡 MÉDIO — `TTSPage` não cancela síntese em andamento
**Arquivo:** `src/renderer/src/pages/TTSPage.tsx`  
**Linha:** 75-113  
**Descrição:** Se o usuário clicar "Falar" várias vezes, múltiplas requisições são enviadas em paralelo. Não há AbortController ou flag de cancelamento.  
**Impacto:** Múltiplos áudios tocando simultaneamente, uso excessivo de CPU.  
**Fix:** Usar `AbortController` no fetch ou manter flag de cancelamento.

### 🟡 MÉDIO — `clearLogs` não limpa os arquivos
**Arquivo:** `src/main/logger.ts`  
**Linha:** 46-51  
**Descrição:** `clearLogs` apenas chama `appendFileSync(log, '')` que NÃO limpa o arquivo (apenas adiciona string vazia).  
**Impacto:** Botão "Limpar Logs" não funciona.  
**Fix:**
```typescript
export function clearLogs() {
  ensureDir()
  try {
    writeFileSync(MAIN_LOG, '', 'utf-8')
    writeFileSync(PYTHON_LOG, '', 'utf-8')
  } catch { /* ignore */ }
}
```

### 🟢 BAIXO — `LogsPage` contagem de linhas incorreta na tab "Python"
**Arquivo:** `src/renderer/src/pages/LogsPage.tsx`  
**Linha:** 96  
**Descrição:** `{lines.length} linhas` é calculado a partir de `currentLogs`, que muda com a tab ativa. O botão da tab "Python Backend" não mostra a contagem.  
**Fix:** Calcular separadamente para cada tab.

### 🟢 BAIXO — `VirtualMicController` não detecta reconexão de cable
**Arquivo:** `src/python/virtual_mic.py`  
**Descrição:** `_find_cable_device()` roda apenas no `__init__`. Se o usuário instalar o VB-Cable depois de iniciar o app, não será detectado sem reiniciar.  
**Fix:** Adicionar método `refresh_devices()` e chamá-lo periodicamente ou sob demanda.

### 🟢 BAIXO — `getFolderSize` não lida com erros de permissão
**Arquivo:** `src/main/ipc-handlers.ts`  
**Linha:** 354-367  
**Descrição:** `readdirSync`/`statSync` sem try/catch. Se houver arquivo sem permissão, crash.  
**Fix:** Adicionar try/catch em cada iteração.

---

## 4. PERFORMANCE ⚡

### 🟠 ALTO — Engines TTS não liberam memória GPU
**Arquivo:** `src/python/model_manager.py`  
**Linha:** 449-453  
**Descrição:** `unload_model()` apenas deleta a referência do dicionário. Modelos como XTTS v2 (~2GB) permanecem na VRAM até o GC rodar (e PyTorch pode não liberar VRAM mesmo assim).  
**Impacto:** VRAM esgotada, impossibilidade de trocar de modelo.  
**Fix:**
```python
def unload_model(self, model_id: str):
    engine = self._engines.pop(model_id, None)
    if hasattr(engine, '_tts'):
        import torch
        del engine._tts
        torch.cuda.empty_cache()
    # ...
```

### 🟠 ALTO — WebSocket streaming não é streaming real
**Arquivo:** `src/python/main.py`  
**Linhas:** 178-217  
**Descrição:** `/ws/tts-stream` gera o áudio COMPLETO antes de enviar os chunks. Isso invalida o propósito de streaming — latência é a mesma de síntese normal.  
**Impacto:** Alto tempo até primeira chunk, experiência ruim para textos longos.  
**Fix:** Usar sintesis real em chunks ou pelo menos enviar metadata imediatamente antes de sintetizar.

### 🟡 MÉDIO — `getFolderSize` recursivo síncrono
**Arquivo:** `src/main/ipc-handlers.ts`  
**Linha:** 354-367  
**Descrição:** Chamada síncrona recursiva para calcular tamanho de pasta. Se a pasta de modelos for grande (>10GB), bloqueia o main process.  
**Impacto:** UI congela temporariamente.  
**Fix:** Usar `fs.promises` assíncrono ou worker thread.

### 🟡 MÉDIO — `ModelsPage` recalcula `canRun` e `getGpuBadge` a cada render
**Arquivo:** `src/renderer/src/pages/ModelsPage.tsx`  
**Linhas:** 122-134  
**Descrição:** `canRun` e `getGpuBadge` são funções definidas dentro do componente e recalculadas a cada render.  
**Impacto:** Re-computação desnecessária (baixo impacto com poucos modelos).  
**Fix:** Usar `useMemo`.

### 🟡 MÉDIO — `hardware_probe.py` lê GPU a cada request
**Arquivo:** `src/python/hardware_probe.py`  
**Descrição:** `get_hardware_info()` executa subprocess a cada chamada. Não há cache.  
**Impacto:** Latência na API, overhead de subprocess.  
**Fix:** Adicionar cache TTL igual ao main process (5 min).

### 🟢 BAIXO — `appStore` salva settings a cada mudança síncrona
**Arquivo:** `src/renderer/src/stores/appStore.ts`  
**Linha:** 21-32  
**Descrição:** Cada `setState` dispara IPC síncrono para salvar no disco. Múltiplas mudanças rápidas = múltiplas escritas.  
**Impacto:** Micro-stutters.  
**Fix:** Usar debounce (ex: lodash.debounce) ou persist middleware do Zustand.

---

## 5. ARQUITETURA / MANUTENIBILIDADE 🏗️

### 🟠 ALTO — Duplicação de paths entre Python e Electron
**Arquivos:** Vários  
**Descrição:** `USER_DATA`, `MODELS_DIR`, `VOICES_DIR` são definidos separadamente em TypeScript e Python. Se mudar um, o outro quebra.  
**Fix:** Definir em um único lugar (ex: env var setada pelo Electron) ou usar package compartilhado.

### 🟡 MÉDIO — Zero testes automatizados
**Descrição:** Não há testes unitários, de integração ou E2E.  
**Impacto:** Regressões passam despercebidas.  
**Fix:** Adicionar pelo menos tests para: sanitização de paths, download com checksum, IPC handlers.

### 🟡 MÉDIO — Model registry duplicado
**Descrição:** `assets/model-registry.json` é lido pelo Python para listar modelos, mas o Electron também o lê para downloads. Se o backend retornar dados diferentes do frontend, há inconsistência.  
**Fix:** Fonte única de verdade: backend lê o registry, frontend apenas consome via API.

### 🟡 MÉDIO — Zustand store sem persist middleware
**Arquivo:** `src/renderer/src/stores/appStore.ts`  
**Descrição:** Persistência manual com `saveToDisk` chamado a cada setter. Código boilerplate e propenso a erros.  
**Fix:** Usar `zustand/middleware` com `persist`.

### 🟡 MÉDIO — `getModelRegistry` via backend mas download via main process
**Descrição:** O Electron faz download diretamente (porque precisa de progresso), mas o backend também baixa modelos. Duas implementações de download.  
**Fix:** Unificar: backend faz download com progress via SSE/WebSocket, ou Electron faz tudo.

### 🟢 BAIXO — `any[]` types espalhados
**Arquivos:** Frontend  
**Descrição:** Vários lugares usam `any[]` em vez de tipos definidos (`clonedVoices`, `audioDevices`, etc.).  
**Fix:** Usar interfaces de `shared/types.ts`.

### 🟢 BAIXO — Sem i18n framework
**Descrição:** Todo o texto está hardcoded em português. OK para MVP, mas dificulta futuras traduções.  
**Fix:** Adicionar `react-i18next` se houver plano de internacionalização.

### 🟢 BAIXO — `preload/index.ts` exporta tipos e API misturados
**Descrição:** O arquivo exporta tanto tipos quanto a implementação da API.  
**Fix:** Separar tipos para `preload/types.ts`.

---

## 6. ACESSIBILIDADE ♿

### 🟡 MÉDIO — Botões de ícone sem `aria-label`
**Arquivo:** `src/renderer/src/App.tsx`, várias páginas  
**Descrição:** Botões com apenas ícones (minimize, maximize, close, pin, play, delete, etc.) não têm `aria-label`. Leitores de tela não sabem o que eles fazem.  
**Fix:** Adicionar `aria-label` a todos os botões de ícone.

### 🟡 MÉDIO — Sem skip link / landmarks ARIA
**Descrição:** Não há `<main>`, `<nav>`, `role="banner"`, etc. Navegação por teclado pode ser confusa.  
**Fix:** Adicionar landmarks semânticos e skip link.

### 🟡 MÉDIO — `highContrast` e `largeFont` não cobrem todos os elementos
**Descrição:** As classes são aplicadas no root mas podem não afetar componentes com cores hardcoded.  
**Fix:** Auditar todas as cores com axe/WAVE.

### 🟢 BAIXO — Range input de velocidade sem `aria-valuenow`
**Arquivo:** `src/renderer/src/pages/TTSPage.tsx`  
**Descrição:** O slider de velocidade não tem label associado via `htmlFor`/`id`.  
**Fix:** Adicionar `<label htmlFor="speed">` e `id="speed"` no input.

### 🟢 BAIXO — ToastContainer pode não ser anunciado por leitores de tela
**Descrição:** Notificações toast podem passar despercebidas por usuários de leitor de tela.  
**Fix:** Usar `role="alert"` e `aria-live="polite"` no container de toasts.

---

## 7. BUILD / DISTRIBUIÇÃO 📦

### 🟠 ALTO — PyInstaller bundle ainda grande demais (~1.2GB)
**Descrição:** Mesmo após cleanup, o bundle é enorme. Isso afeta download time e instalação.  
**Impacto:** Usuários com conexão lenta desistem do download.  
**Fixes adicionais:**
- Excluir `tests/`, `__pycache__`, `*.pyc` de todas as libs
- Excluir `sklearn` se não usado (muitos MB)
- Excluir `spacy` se não usado
- Excluir documentação de libs (`*.md`, `*.rst`, `docs/`)
- Usar UPX compression (se não já usando)
- Considerar download-on-demand de engines pesadas (XTTS, Bark) em vez de bundle completo

### 🟡 MÉDIO — Sem code signing → Windows Defender SmartScreen
**Descrição:** Sem certificado de assinatura, o instalador pode ser bloqueado pelo SmartScreen.  
**Impacto:** Usuários comuns não sabem como contornar.  
**Fix:** Adquirir certificado EV (caro) ou Standard Code Signing. Alternativa: distribuir via Microsoft Store.

### 🟡 MÉDIO — VB-Audio Virtual Cable não integrado no installer
**Descrição:** O app detecta mas não instala o VB-Cable automaticamente.  
**Impacto:** Feature de microfone virtual não funciona out-of-the-box.  
**Fix:** Bundlear `VBCABLE_Setup.exe` e oferecer instalação automática na primeira execução.

### 🟢 BAIXO — `electron-builder.yml` sem `asarUnpack` para Python bundle
**Descrição:** O bundle Python está em `extraResources`, mas `asarUnpack` pode ser necessário para acesso direto a certos arquivos.  
**Fix:** Verificar se `extraResources` já é suficiente (parece ser).

---

## 8. PRÓXIMOS PASSOS RECOMENDADOS

### Fase 1 — Segurança (BLOQUEANTE para release)
1. [ ] Configurar CORS no FastAPI
2. [ ] Sanitizar todos os paths de arquivo no Python
3. [ ] Habilitar `sandbox: true` no Electron (ou justificar/documentar)
4. [ ] Validar `modelId` e `ext` em todos os IPC handlers
5. [ ] Validar URLs em `shell:open-external`
6. [ ] Implementar cleanup de arquivos temporários WAV

### Fase 2 — Bugs Críticos
7. [ ] Corrigir loop infinito em `ModelsPage`
8. [ ] Corrigir `cpuThreads` em `hardware-detector.ts`
9. [ ] Corrigir `clearLogs` para realmente limpar
10. [ ] Corrigir `wmic` quebrado em `hardware_probe.py`

### Fase 3 — Performance e Qualidade
11. [ ] Implementar streaming real no WebSocket
12. [ ] Liberar VRAM ao descarregar modelos
13. [ ] Corrigir memory leak em `ClonePage`
14. [ ] Adicionar testes automatizados (começar com sanitização de paths)

### Fase 4 — Polish
15. [ ] Adicionar `aria-label` em todos os botões de ícone
16. [ ] Integrar instalação do VB-Cable no onboarding
17. [ ] Otimizar tamanho do PyInstaller bundle
18. [ ] Adicionar code signing

---

## 9. CONCLUSÃO

O VoiceLaunch TTS tem uma arquitetura sólida e um propósito nobre. O código está bem organizado e as convenções são seguidas. No entanto, **existem vulnerabilidades de segurança reais que impedem uma release pública segura.**

As correções da Fase 1 são simples (CORS, sanitização de paths, validação de input) e devem levar menos de 2 horas. Com essas correções, o projeto estará em bom estado para um beta fechado.

Para uma release pública ampla, recomenda-se também:
- Code signing (para evitar SmartScreen)
- Testes E2E básicos
- Redução do bundle Python (< 500MB ideal)

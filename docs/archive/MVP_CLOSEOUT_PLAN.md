# VoiceLaunch TTS — Plano de Fechamento do MVP

> Documento de trabalho. Data: 2026-05-19. Status do produto: **POS-REDESIGN, CLOUD ATIVO, BACKEND LOCAL PENDENTE**.

---

## 1. Definição do MVP

Um usuário final, sem conhecimento técnico, em **qualquer Windows 10/11** com NVIDIA, AMD, Intel integrada ou sem GPU dedicada, instala um instalador (`.exe`), abre o app, e em **até dois cliques** consegue:

1. **Digitar uma frase e ouvir uma voz natural** (online ou local, o app decide).
2. **Rotear essa voz para o Discord/Zoom/jogo** via microfone virtual VB-Cable.
3. **Salvar atalhos** (frases rápidas + atalhos globais 1..9).
4. **Trocar entre perfis** (Padrão / Jogo) sem reabrir o app.

**Critério de fechamento**: a trilha acima funciona em três máquinas reais:
- **NVIDIA + CUDA**: tudo funcional, inclusive clonagem de voz.
- **AMD ou Intel**: Piper/Kokoro local + Edge TTS online (sem clonagem) — todos os fluxos sem dead-end.
- **Sem GPU dedicada (notebook básico)**: Edge TTS online + Piper local CPU, com banner honesto explicando limites.

---

## 2. Avaliação profunda do estado atual

### 2.1. O que já funciona (validado nesta máquina, 2026-05-19)

| Capacidade | Status | Caminho |
|---|---|---|
| UI/UX (paleta roxa gamer, HUD, scanline, sidebar, banners) | ✅ | Renderer Electron |
| Edge TTS cloud — listagem (~400 vozes) | ✅ | Main process WS direto |
| Edge TTS cloud — síntese + playback | ✅ | `cloud:synthesize` + HTML5 Audio |
| Frase rápida + atalhos globais Ctrl+Shift+1..9 | ✅ | `setupGlobalShortcuts` |
| Perfis Padrão/Jogo com switch | ✅ | `appStore.setActiveProfile` |
| Modo compacto 480×420 always-on-top | ✅ | `window:set-compact` |
| Detecção de hardware (CPU/RAM/GPU/CUDA) | ✅ | `detectHardware` PowerShell |
| Janela sem barra dupla, drag region | ✅ | `frame: false` + `app-drag-region` |
| Acessibilidade (alto contraste, fonte grande, reduced motion) | ✅ | `index.css` overrides |
| Testes unitários | ✅ 38/38 | `appStore`, `communicationState` |

### 2.2. O que NÃO funciona ainda (gaps confirmados)

| Gap | Causa raiz | Impacto |
|---|---|---|
| Piper/Kokoro local (em `npm run dev`) | Python do sistema sem deps (`fastapi`, `piper`, `onnxruntime`...) | Bloqueia uso local em desenvolvimento. Em build empacotado funciona via `voicelaunch-backend.exe` |
| XTTS v2 (clonagem) | Exige NVIDIA + CUDA + venv extra com `TTS`/PyTorch | Só NVIDIA; depende de install-deps server-side |
| Roteamento de áudio para VB-Cable na trilha **cloud** | `playCloudAudio` usa o speaker default; `setSinkId` exposto mas sem UI de seleção | Discord não recebe a voz online |
| `Ctrl+Shift+1..9` com voz online | atalho aciona síntese local que falha quando backend offline | Atalho fica inoperante na trilha cloud |
| Download de modelos | Não revalidado em máquina limpa nesta rodada | URL HuggingFace pode mudar; sem retry/resume |
| `install-deps` de XTTS / MeloTTS / Bark | Depende do backend Python ativo + pip funcional na máquina do usuário | Em prática só funciona em ambiente preparado |
| Verificação real do mic virtual no onboarding | Último passo não detecta sucesso end-to-end | Usuário não tecnico não sabe se "está funcionando" |
| Tests para Edge TTS / cloudAudio / migrações de tier | Não escritos nesta rodada | Risco de regressão |
| HardwarePage hoje é desambiguada de "Configurações" | Dashboard em `/dashboard` é acessado via card em Settings; bom, mas falta polish | Aceitável, mas pode melhorar copy |

### 2.3. Estado dos motores TTS (por tier real)

| Engine | Tier | Hardware mínimo | Estado neste repo |
|---|---|---|---|
| **Edge TTS** (cloud) | Universal | qualquer máquina + internet | Implementado, sem mic-routing |
| **Piper** (ONNX) | CPU OK | qualquer Windows | Empacotado no `voicelaunch-backend.exe`; deps no `requirements-piper.txt`; modelos via HuggingFace |
| **Kokoro** (ONNX) | CPU OK | 4 GB RAM | Idem |
| **XTTS v2** (PyTorch) | Avançado | NVIDIA CUDA 11.8+, 4 GB+ VRAM | Excluído do bundle padrão; install via `install-deps` server-side |
| **MeloTTS** | Experimental | CPU OK | Excluído do bundle padrão |
| **Fish Speech** | Experimental | CUDA, 4 GB+ VRAM | Excluído do bundle padrão |
| **Bark** | Experimental | CUDA, 6 GB+ VRAM | Excluído do bundle padrão |

> Nota: o bundle Python (`scripts/build-python-venv.bat`) hoje inclui **Piper + Kokoro** (linhas 109-128 excluem TTS, melo, bark, fish_speech, torch_directml). XTTS é uma decisão consciente: install opcional via `install-deps` quando o usuário NVIDIA pedir.

### 2.4. Vendor-awareness do detector de hardware

O detector ([src/main/hardware-detector.ts](src/main/hardware-detector.ts)) classifica em tiers `edge | cpu | entry | mid | high | enthusiast`. Funciona para NVIDIA (via `nvcc` + `nvidia-smi`), mas para **AMD em Windows** o detector reporta `gpuVendor: 'amd'` mas `isCudaAvailable: false` e `isRocmAvailable: false` (ROCm-Windows é praticamente inexistente). A consequência: AMD users entram no tier `cpu`, igual a alguém sem GPU.

**Isso é tecnicamente correto** — em Windows AMD não tem nenhum framework de aceleração estável para TTS — mas a UX precisa explicar essa decisão sem soar como "seu PC é ruim".

---

## 3. Decisões arquiteturais que travam o MVP

### 3.1. Trilha "online primeiro"

A Fase recém-concluída fez `cloud` o source default em [TTSPage.tsx](src/renderer/src/pages/TTSPage.tsx). Isso é correto: o usuário consegue falar **sem instalar nada**.

**Consequência**: a aba "Vozes" (antes Modelos) precisa ser reorganizada para refletir que o caminho cloud é o primeiro, e o local é uma melhoria/escolha consciente.

### 3.2. Backend Python opcional

O Python só é estritamente necessário para:
- Piper / Kokoro local (vozes offline)
- Clonagem XTTS (NVIDIA only)
- Roteamento via `play_to_virtual_mic` em `virtual_mic.py` (que usa `sounddevice`)

**Decisão**: o backend Python continua **bundled como standalone exe** via `scripts/build-python-venv.bat` (essa parte funciona em build empacotado). Em desenvolvimento, o usuário rola sem backend porque Edge TTS supre a maior parte dos casos.

### 3.3. Mic routing — duas trilhas, mesma UX

| Trilha | Como roteia | Estado |
|---|---|---|
| **Local (Piper/Kokoro)** | Python `virtual_mic.py` escreve no dispositivo "CABLE Input" via `sounddevice` | Funciona quando backend OK |
| **Cloud (Edge TTS)** | Renderer chama `audio.setSinkId(cableOutputDeviceId)` antes de `play()` | Hook existe, falta seleção de dispositivo na UI |

A unificação dessas duas é o passo MVP-crítico para Discord funcionar em todas as trilhas.

---

## 4. Trilhas de hardware (vendor-aware)

### 4.1. NVIDIA (CUDA 11.8+)

**Promessa**: "Tudo. Vozes online ilimitadas + Piper/Kokoro local de alta qualidade + clonagem XTTS v2."

**Pipeline de install**:
1. App abre → detector roda → vê `isCudaAvailable: true`.
2. HomePage mostra HUD com tier `S` (Entusiasta) ou `A` (Alto), badge "NVIDIA CUDA".
3. Onboarding sugere:
   - Passo 1: Edge TTS já funciona, escolha uma voz e teste.
   - Passo 2: Instale Piper (CPU, leve) — funciona em background.
   - Passo 3: (NVIDIA-only) Você pode habilitar XTTS para clonar sua voz (~2 GB).
4. Em Vozes > Locais, XTTS aparece com badge `Avancado` e botão "Instalar engine" (chama `install-deps`).
5. Em Clonar, fluxo wizard 4 passos só ativa se XTTS estiver pronto.

**Critérios de aceite NVIDIA**:
- [ ] Detector reporta `isCudaAvailable: true` em RTX 20/30/40/50 com driver CUDA instalado.
- [ ] Piper/Kokoro funcionam em CPU mesmo em NVIDIA (não dependem do CUDA).
- [ ] XTTS install-deps roda `pip install TTS` no venv do backend e instancia `XttsEngine` sem erro.
- [ ] Clonagem de voz produz arquivo `.json` + sample funcional.
- [ ] Mic routing funciona via `virtual_mic.py` (Python) ou `setSinkId` (cloud).

### 4.2. AMD ou Intel integrada (sem CUDA)

**Promessa**: "Piper + Kokoro local funcionam. Voz online ilimitada com Edge TTS. Clonagem fica indisponível (não é seu PC, é limitação do ecosistema TTS)."

**Pipeline de install**:
1. App abre → detector roda → vê `gpuVendor: 'amd'` ou `'intel'`, `isCudaAvailable: false`.
2. HomePage mostra HUD com tier `B` (CPU) com badge "Compatível", **sem** linguagem negativa.
3. Onboarding sugere:
   - Passo 1: Edge TTS já funciona.
   - Passo 2: Piper (ONNX CPU) instala em 30 s.
   - Passo 3: (opcional) Kokoro para vozes mais naturais — 300 MB, CPU.
4. Em Vozes > Locais, XTTS aparece com tag `Requer NVIDIA` em estado disabled + tooltip explicando.
5. Em Clonar, página mostra estado "Indisponível neste hardware" + redireciona para Edge TTS como alternativa para variedade de vozes.

**Critérios de aceite AMD**:
- [ ] Detector identifica `gpuVendor: 'amd'` em Radeon discreta e iGPU.
- [ ] Tier sempre `B` ou `cpu`, **nunca** `error` ou `low`.
- [ ] Piper + Kokoro funcionam em CPU sem regressão visual de tier.
- [ ] XTTS / Bark / Fish Speech ficam ocultos OU mostrados como `Requer NVIDIA CUDA` com cor neutra (não vermelho).
- [ ] Banner de hardware AMD usa cor `state-warn` apenas no AVISO de "use Piper/Kokoro" e cor `state-ready` no resto.

### 4.3. Sem GPU dedicada (Intel iGPU básica, notebook)

**Promessa**: "Use Edge TTS online. Piper local roda se quiser leveza."

Igual ao caminho AMD, com copy adaptada. O detector já trata isso (tier `cpu`).

---

## 5. Fases até o release

### Fase G — Mic routing universal + Discord verification (1 dia)

**Objetivo**: Edge TTS toca no VB-Cable. Atalhos Ctrl+Shift+1..9 funcionam em cloud.

**Arquivos**:
- [src/renderer/src/utils/cloudAudio.ts](src/renderer/src/utils/cloudAudio.ts) — aceita `deviceId` (já implementado parcialmente).
- [src/renderer/src/components/AudioOutputPicker.tsx](src/renderer/src/components/AudioOutputPicker.tsx) — novo. Lista `audiooutput` devices via `navigator.mediaDevices.enumerateDevices()`, persiste seleção em `appStore.cableDeviceId`.
- [src/renderer/src/stores/appStore.ts](src/renderer/src/stores/appStore.ts) — adicionar `cableDeviceId: string | null`, `setCableDeviceId`.
- [src/renderer/src/pages/SettingsPage.tsx](src/renderer/src/pages/SettingsPage.tsx) — seção "Microfone Virtual" ganha o AudioOutputPicker e botão "Testar saida".
- [src/renderer/src/App.tsx](src/renderer/src/App.tsx) — handler de `onGlobalSpeakQuickPhrase` checa `voiceSource` salvo no store; se `cloud`, usa `synthesizeCloud` + `playCloudAudio(audio, mime, cableDeviceId)`.
- [src/renderer/src/components/DiscordReadyBanner.tsx](src/renderer/src/components/DiscordReadyBanner.tsx) — "Testar agora" usa cableDeviceId se setado.
- Persistir `voiceSource` em AppSettings: novo campo `voiceSource: 'local' | 'cloud'`.

**Critérios**:
- [ ] Em Ajustes > Microfone Virtual, dropdown lista dispositivos `audiooutput`, com CABLE Output destacado.
- [ ] Clicar "Testar saida" toca um chime curto **no dispositivo selecionado** (Discord ouve).
- [ ] Atalho global Ctrl+Shift+1 com perfil "Jogo" e cloud ativo dispara síntese e toca no CABLE Output, mesmo com app em background.
- [ ] `prefers-reduced-motion` mantém banner sem glow-pulse.

### Fase H — Vozes page reorganizada (1 dia)

**Objetivo**: Pagina `/models` (rotulada "Vozes") tem 3 abas: **Online (Edge TTS)** | **Locais (Piper/Kokoro)** | **Clonadas**. Caminho online aparece primeiro.

**Arquivos**:
- [src/renderer/src/pages/ModelsPage.tsx](src/renderer/src/pages/ModelsPage.tsx) — refactor para abas internas com toggle.
- Reutilizar [CloudVoicePicker](src/renderer/src/components/CloudVoicePicker.tsx) na aba Online com modo "browse" (sem "selecionar voz", só pré-ouvir).
- Aba Clonadas: redirect amigável caso `getCloneCapability(hardware).enabled === false`.
- "Recomendação por hardware" no topo da página, vendor-aware.

**Critérios**:
- [ ] Abrir Vozes → cai em Online por padrão.
- [ ] Cada voz online tem botão "▶ Ouvir amostra" que sintetiza "Olá, eu sou {nome}." e toca local (no speaker, não no CABLE).
- [ ] Em AMD: Locais mostra Piper/Kokoro como `Recomendado`. XTTS oculto a menos que `showExperimentalModels`.
- [ ] Em NVIDIA: Locais mostra Piper, Kokoro como `Recomendado` e XTTS como `Avançado`. Botão "Instalar engine" funciona.
- [ ] Clonadas avisa hardware com fallback.

### Fase I — Onboarding hardware-aware (0.5 dia)

**Objetivo**: Tutorial muda os passos baseado em `gpuVendor` + `isCudaAvailable`.

**Arquivos**:
- [src/renderer/src/components/OnboardingTutorial.tsx](src/renderer/src/components/OnboardingTutorial.tsx) — `steps` viram função `buildSteps(hardware)` que retorna 4-5 passos vendor-aware.
- Adicionar verificação real no último passo: polling de `getVirtualMicStatus` por 10 segundos após botão "Ativar mic".

**Pseudo-fluxo**:
```
hardware = await getHardwareInfo()
if hardware.isCudaAvailable:
  steps = [Boas-vindas, EdgeTTS, Piper (rápido), XTTS opcional, Mic+Discord]
elif hardware.gpuVendor in ['amd', 'intel']:
  steps = [Boas-vindas, EdgeTTS, Piper/Kokoro (CPU), Mic+Discord]
else:  // CPU only / unknown
  steps = [Boas-vindas, EdgeTTS, Piper (CPU leve), Mic+Discord]
```

**Critérios**:
- [ ] AMD vê 4 passos sem mencionar XTTS.
- [ ] NVIDIA vê 5 passos com slot para XTTS.
- [ ] Último passo aguarda `getVirtualMicStatus === true` por 10s e mostra ✓ quando confirmado.

### Fase J — Hardware page vendor-honest (0.5 dia)

**Objetivo**: Dashboard explica para cada usuário a **trilha recomendada concreta** baseada no hardware detectado, sem fórmulas genéricas.

**Arquivos**:
- [src/renderer/src/pages/DashboardPage.tsx](src/renderer/src/pages/DashboardPage.tsx) — reescrever bloco "Recomendação" para usar um `HardwarePlaybook` por vendor.
- Novo [src/renderer/src/utils/hardwarePlaybook.ts](src/renderer/src/utils/hardwarePlaybook.ts) com:
  ```ts
  export function getHardwarePlaybook(hw: HardwareInfo): {
    headline: string  // "Trilha NVIDIA premium"
    summary: string
    steps: { title: string, action: 'install' | 'configure' | 'celebrate', href?: string }[]
    advancedAvailable: boolean
    warnings: { tone: 'info' | 'warn'; text: string }[]
  }
  ```

**Critérios**:
- [ ] NVIDIA RTX vê headline "Trilha completa NVIDIA + CUDA" com 4 passos.
- [ ] AMD Radeon vê headline "Trilha leve para AMD" sem warnings vermelhos.
- [ ] Intel iGPU vê headline "Trilha CPU + nuvem".
- [ ] Cada `step` tem botão direto para a página correspondente.

### Fase K — Download URLs revalidadas + resume (1 dia)

**Objetivo**: Downloads de modelos não quebram silenciosamente, suportam resume após perda de rede.

**Arquivos**:
- [assets/model-registry.json](assets/model-registry.json) — adicionar campo `mirrors: string[]` por modelo; revalidar URLs (HuggingFace URLs estão em `resolve/v1.0.0/` para Piper, podem ter mudado).
- [src/main/download-manager.ts](src/main/download-manager.ts) — suporte a `Range` header para resume, retry com backoff exponencial (3 tentativas), fallback automático para mirror.
- [src/main/ipc-handlers.ts](src/main/ipc-handlers.ts) — handler `model:download` aceita opção `forceMirror: number`.

**Critérios**:
- [ ] Modelo Piper PT-BR baixa 100% em máquina limpa Windows.
- [ ] Cortando rede no meio do download, retomar continua de onde parou (até 5 min depois).
- [ ] URL inválida (404) tenta o primeiro mirror automaticamente; se todos falham, erro claro.
- [ ] Checksum SHA-256 incluído no registry para Piper, Kokoro (oficiais do HuggingFace).

### Fase L — install-deps endurecido (1 dia)

**Objetivo**: `install-deps` para XTTS na trilha NVIDIA não falha em ambiente típico.

**Arquivos**:
- [src/python/model_manager.py](src/python/model_manager.py) — método `install_dependencies(model_id)` usa subprocess com timeout 600s, logs progresso linha-a-linha de volta ao frontend via `model:install-progress` IPC, valida CUDA antes de tentar pip install TTS.
- Novo IPC `model:install-progress` (event-based, similar a `model:download:progress`).
- [src/renderer/src/pages/ModelsPage.tsx](src/renderer/src/pages/ModelsPage.tsx) — exibe progresso linha por linha durante install-deps com terminal-look HUD.

**Critérios**:
- [ ] Em NVIDIA com CUDA 11.8+ instalado e Python OK, `install-deps('xtts_v2')` termina em < 5 min e XTTS fica `depsInstalled: true`.
- [ ] Em AMD, o botão "Instalar engine" para XTTS fica oculto (não há erro silencioso).
- [ ] Progresso é mostrado em terminal-look com syntax highlight para `[INFO]/[WARN]/[ERROR]`.
- [ ] Se cair sem CUDA, mensagem clara "XTTS exige NVIDIA + CUDA" antes de tentar instalar.

### Fase M — Testes + QA (1 dia)

**Objetivo**: Cobertura suficiente para confiar no release.

**Novos testes** (`*.test.ts`):
- `edge-tts-client.test.ts` (main): mock fetch, garante cache de 24h, garante errado da WS sem matar processo.
- `cloudAudio.test.ts` (renderer): mock `<audio>`, valida sequência stop→play→ended.
- `hardwarePlaybook.test.ts`: cada cenário (NVIDIA, AMD, Intel, CPU-only) retorna playbook correto.
- `migration.test.ts`: cobre AppSettings v0→v1 + futuras.

**Smoke manual** em 3 máquinas:
- Máquina A: NVIDIA RTX 3060, Win11, Python 3.10+ pré-instalado, CUDA 12.x.
- Máquina B: AMD Radeon RX 6600 (ou iGPU), Win11, sem Python.
- Máquina C: Notebook Intel iGPU, Win10, sem Python.

**Roteiro smoke**:
1. Instalar `.exe` do dist.
2. Abrir app → onboarding (verificar steps vendor-aware).
3. Cloud → escolher voz pt-BR → falar "GG" → ouvir no speaker.
4. Ativar mic virtual → testar "Discord agora" → confirmar Discord recebe.
5. Ctrl+Shift+V → modo compacto sobreposto a jogo.
6. Ctrl+Shift+1 com perfil "Jogo" → ouve "GG" no Discord sem trazer app a foreground.
7. Locais → instalar Piper → falar offline.
8. (NVIDIA-only) Locais → instalar XTTS → Clonar Voz.

### Fase N — Empacotamento + release (0.5 dia)

**Objetivo**: `npm run dist:win` produz `.exe` confiável para distribuição.

**Tarefas**:
- Rebuildar `python_dist/voicelaunch-backend/` via `scripts/build-python-venv.bat`.
- Atualizar `latest.yml` + `.blockmap`.
- Assinatura de código (`docs/CODE_SIGNING.md`) — **decisão**: pular para v1.0, aceitar SmartScreen warning. Anotar no README.
- Atualizar `CHANGELOG.md`.
- Tag git `v1.0.0`.
- (Opcional) GitHub Release com `.exe` + checksums.

**Critérios**:
- [ ] `dist/VoiceLaunch-TTS-Setup-1.0.0.exe` < 600 MB.
- [ ] Instalador NSIS roda em VM Windows limpa sem deps prévias.
- [ ] Backend bundle responde em `/health` no primeiro start.
- [ ] App abre em < 3s na primeira execução.

---

## 6. Resumo de execução

| Fase | Foco | Estimativa | Bloqueia o release? |
|---|---|---|---|
| **G** | Mic routing universal (cloud → VB-Cable) | 1 dia | **SIM** |
| **H** | Vozes page com abas Online/Locais/Clonadas | 1 dia | **SIM** |
| **I** | Onboarding hardware-aware | 0.5 dia | **SIM** |
| **J** | Dashboard com playbook vendor-aware | 0.5 dia | Recomendado |
| **K** | Download URLs revalidadas + resume | 1 dia | **SIM** |
| **L** | install-deps endurecido (NVIDIA only) | 1 dia | Recomendado (NVIDIA path) |
| **M** | Testes + smoke 3 máquinas | 1 dia | **SIM** |
| **N** | dist:win + release | 0.5 dia | **SIM** |

**Total**: 6.5 dias úteis com folga para iteração.

**Caminho rápido para release (sem L)**: G + H + I + K + M + N = 5 dias. XTTS install-deps pode ficar como "advanced add-on, manual instructions in README".

---

## 7. Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Edge TTS muda protocolo WebSocket | Média | Cliente tem timeout + erro claro; user-agent atualizado; cache de 24h reduz dependência |
| URLs HuggingFace mudam | Média | Fase K adiciona mirrors + checksum |
| AMD users com expectativa de XTTS | Baixa | Onboarding e Hardware page explicitam limitação sem culpar AMD |
| Antivírus marca o `.exe` (unsigned) | Alta | README explica SmartScreen + checksums oficiais; v1.1 considera EV cert |
| VB-Cable não instalado | Alta | `installVBCable()` já abre instalador embutido ou site; banner pós-mic confirma |
| Python backend não sobe em máquina limpa | Média | `python_dist/voicelaunch-backend.exe` é standalone, **não precisa Python no host** |
| `setSinkId` não funciona em Electron 35 | Baixa | Já testado disponível em Chromium; fallback no util retorna ao default sem quebrar |

---

## 8. O que fica para v1.1 (não bloqueia MVP)

- Atalhos globais customizáveis pelo usuário (hoje hard-coded).
- Suporte oficial a Bark / Fish Speech / MeloTTS (hoje experimentais).
- Mac e Linux (hoje Windows-only).
- Assinatura de código EV (SmartScreen verde).
- Auto-update real (hoje desligado em `app-config`).
- Análise de uso anônima / telemetria opt-in.
- DirectML para AMD (requer Python + torch-directml; valida no servidor).
- ROCm para AMD em Linux (fora do escopo Windows).
- Marketplace de vozes clonadas comunitárias.
- Streaming TTS via WebSocket (esqueleto existe em `tts:stream-start` mas sem implementação).

---

## 9. Definições de pronto (critérios de release v1.0)

### 9.1. Funcionalidades obrigatórias

- [x] Edge TTS cloud funcional, ~400 vozes.
- [ ] Edge TTS roteado para VB-Cable (Fase G).
- [ ] Atalhos globais 1..9 falam cloud no CABLE Output (Fase G).
- [x] Piper/Kokoro empacotados no backend standalone (já existe em `python_dist/`).
- [ ] Vozes page com abas Online/Locais/Clonadas (Fase H).
- [ ] Onboarding adapta passos por hardware (Fase I).
- [ ] Dashboard mostra playbook vendor-aware (Fase J).
- [ ] Downloads de Piper/Kokoro com mirrors + checksum (Fase K).
- [ ] 3 máquinas reais validadas em smoke (Fase M).

### 9.2. Qualidade

- [x] Testes verdes (38/38 base).
- [ ] Testes adicionais Edge TTS / cloudAudio / playbook (Fase M).
- [x] Build OK com tokens roxo/gamer.
- [x] Acessibilidade preservada (high-contrast, large-font, reduced-motion).
- [ ] Lint zero warnings — atualmente `npm run lint` não existe; adicionar script + ESLint config básica.

### 9.3. Distribuição

- [ ] Instalador `.exe` NSIS < 600 MB.
- [ ] `latest.yml` correto (auto-update preparado para v1.1).
- [ ] README atualizado com SmartScreen + checksums.
- [ ] CHANGELOG.md v1.0.0 escrito.
- [ ] Tag git `v1.0.0` no remoto.
- [ ] (Opcional) GitHub Release publicado.

---

## 10. Arquivos críticos do MVP (resumo)

### Renderer
- [src/renderer/src/App.tsx](src/renderer/src/App.tsx)
- [src/renderer/src/pages/TTSPage.tsx](src/renderer/src/pages/TTSPage.tsx)
- [src/renderer/src/pages/ModelsPage.tsx](src/renderer/src/pages/ModelsPage.tsx) (alvo Fase H)
- [src/renderer/src/pages/DashboardPage.tsx](src/renderer/src/pages/DashboardPage.tsx) (alvo Fase J)
- [src/renderer/src/components/OnboardingTutorial.tsx](src/renderer/src/components/OnboardingTutorial.tsx) (alvo Fase I)
- [src/renderer/src/components/CloudVoicePicker.tsx](src/renderer/src/components/CloudVoicePicker.tsx)
- [src/renderer/src/utils/cloudAudio.ts](src/renderer/src/utils/cloudAudio.ts) (alvo Fase G)
- [src/renderer/src/utils/hardwarePlaybook.ts](src/renderer/src/utils/hardwarePlaybook.ts) (novo, Fase J)
- [src/renderer/src/stores/appStore.ts](src/renderer/src/stores/appStore.ts)

### Main
- [src/main/index.ts](src/main/index.ts) (alvo Fase G — `onGlobalSpeakQuickPhrase` cloud-aware)
- [src/main/ipc-handlers.ts](src/main/ipc-handlers.ts)
- [src/main/edge-tts-client.ts](src/main/edge-tts-client.ts)
- [src/main/hardware-detector.ts](src/main/hardware-detector.ts)
- [src/main/download-manager.ts](src/main/download-manager.ts) (alvo Fase K)
- [src/main/python-manager.ts](src/main/python-manager.ts)

### Python backend (já bundled)
- [src/python/main.py](src/python/main.py)
- [src/python/model_manager.py](src/python/model_manager.py) (alvo Fase L)
- [src/python/virtual_mic.py](src/python/virtual_mic.py)
- [src/python/hardware_probe.py](src/python/hardware_probe.py)

### Assets
- [assets/model-registry.json](assets/model-registry.json) (alvo Fase K)

### Scripts
- [scripts/build-python-venv.bat](scripts/build-python-venv.bat)
- [scripts/smoke-packaged-backend.ps1](scripts/smoke-packaged-backend.ps1)

---

## 11. Próximo passo imediato

Iniciar a **Fase G** (mic routing universal). Sequência sugerida:
1. Adicionar `cableDeviceId` + `voiceSource` ao `AppSettings` + `appStore` + migration v2.
2. Criar `AudioOutputPicker` em `components/`.
3. Atualizar `playCloudAudio` chamadas em `TTSPage` e `App.tsx` global shortcut handler.
4. Adicionar seção "Saida de audio" em SettingsPage > Microfone Virtual.
5. DiscordReadyBanner "Testar agora" usa cableDeviceId.
6. Rodar `npm test` + `npm run build` + smoke manual.

Quando Fase G estiver verde, decidir entre H/I/J pela próxima janela de execução.

# Changelog

## [Nao lancado] - branch `feat/virtual-mic-auto-install` (pivo online-first + mic facil + simplificacao)

### Adicionado

- **Microfone virtual com instalacao assistida**: o launcher baixa o VB-Cable, abre o instalador e, ao detectar o driver, **ativa o mic sozinho** (auto-deteccao por poll + auto-ativacao). Download/extracao em `%ProgramData%` para funcionar em conta padrao + UAC.
- **Monitor de audio**: a voz online toca no cabo (Discord ouve) **e** no seu fone ao mesmo tempo, com seletor "Voce escuta em" (padrao do sistema, um dispositivo, ou mudo). Funcao pura `buildAudioOutputs` decide os destinos.
- **Captura de tecla livre** para atalhos de voz: grave qualquer combinacao (Ctrl/Alt/Win + tecla) em vez de escolher de uma lista fixa; aviso quando outro app ja usa a tecla.
- **Latencia**: cache LRU de audio Edge TTS + pre-aquecimento dos atalhos.
- **Agentes de design** (`.claude/agents/launcher-designer.md`, `app-flow-designer.md`) e um workflow de auditoria de design.

### Alterado

- **Pivo online-first**: tela Falar e navegacao focadas no Microsoft Edge TTS (roteado no renderer via `setSinkId`).
- **Atalhos unificados** (`voiceShortcuts`, schema v4) com criacao/edicao inline na tela Falar e na aba Atalhos.
- **Perfil unico**: removido o perfil "Jogo" e o seletor de perfil (settings legados continuam validos, sem bump de schema).
- **Redesign v2**: Inicio e Falar mais sobrios e simples — CTA primario unico, barra de estado enxuta (4->2 chips), tokens de tipografia/raio/cor consistentes, sem glow.
- **Layout responsivo**: sem overflow horizontal em janelas menores (`min-w-0` no main e nos filhos flex/grid; split de duas colunas so em `2xl`).
- **Dependencias**: Electron 36 -> 42, electron-builder 25 -> 26.

### Removido

- Aba e pagina **Logs** da navegacao.
- Caminho local morto da navegacao (rotas `/models`, `/clone`; card "Setup local recomendado").

### Corrigido

- **Mic "mudo"**: a voz ia so para o cabo; agora ha monitor para o usuario se ouvir; o chime de teste toca nos dois caminhos.
- **Colisao de hotkeys** `Ctrl+Shift+1..9` (passaram a pertencer aos atalhos de voz).
- **Backend em dev** usa o standalone empacotado quando o `python.exe` da maquina e um stub da Microsoft Store.

## [1.1.0] - 2026-05-26 (Auditoria completa + qualidade + novas funcionalidades)

### Adicionado

- **Exportar historico como CSV**: botao "Exportar CSV" no painel TTS exporta todas as frases com timestamp UTC, voz e texto no formato RFC 4180. Funciona via `historyExport.ts`; timestamps sempre em UTC independente do fuso horario local.
- **Feedback visual de atalhos**: ao disparar um atalho de voz via hotkey global, o card correspondente na pagina de Atalhos acende com brilho roxo por 2 s (evento `voicelaunch:shortcut-triggered`). Feedback imediato mesmo com o app minimizado.
- **Escala de tipografia semantica**: 8 tokens Tailwind com nomes de funcao — `text-caption` (11 px meta/badge) ate `text-hero` (30 px display) — em vez de tamanhos numericos sem contexto.
- **Botao "Rever tutorial"** em Configuracoes: reinicia o onboarding sem precisar reinstalar o app.
- **20 design tokens de estado**: variaveis CSS `--vl-state-error/warn/success/live-{bg,border,accent,text}` em `index.css`. Elimina rgba() hardcoded em 14 arquivos e habilita theming futuro.
- **Estado vazio das frases rapidas**: placeholder dashed com icone Plus e instrucao clara quando nenhuma frase foi salva ainda.
- **Feedback de sintese**: botao Falar tem 3 estados visuais — Falar / Gerando... (spinner) / Parar — e `aria-busy` durante geracao.

### Alterado

- **OnboardingTutorial**: convertido de modal bloqueante (`fixed inset-0 bg-black/70`, `aria-modal="true"`) para painel lateral deslizante pela direita (`aria-modal="false"`). O usuario pode navegar nas abas e interagir com o app enquanto le o tutorial. Animacao `slide-in-right` 280 ms.
- **AlertBox**: configuracao de severidades (`alertConfig`) extraida para modulo proprio `alertConfig.ts`, separada do componente React — testavel de forma isolada.
- **Zustand selectors em TTSPage**: `useAppStore(useShallow(...))` com mapa de campos explicito; callbacks `handleCloudVoiceSelect`, `handleModelChange`, `handleSpeedChange`, `saveCurrentPhrase` envolvidos em `useCallback`. Reduz re-renders da TTSPage aos 10 campos relevantes.
- **toastStore**: `Set.add()`/`Set.delete()` O(1) em `pauseToast`/`resumeToast`/`removeToast`; elimina alocacao de array intermediario a cada mutacao.
- **Ordem de navegacao**: Vozes (3a posicao) antes de Atalhos — reflete a jornada do usuario (primeiro escolhe a voz, depois cria atalhos).
- **LogsPage**: semântica de abas com `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` e `tabIndex` corretos (WCAG 2.1 AA).

### Corrigido

- **TOCTOU em `getFolderSize` / `deleteFolderRecursive`**: `try/catch` por arquivo ignora silenciosamente arquivos deletados entre `readdirSync` e `statSync`. Antes podia crashar com `ENOENT` em delecoes concorrentes.
- **Notificacoes com HTML**: `send-notification` faz strip de tags antes de truncar — evita `&lt;b&gt;` escapado no toast do sistema.
- **SettingsPage**: blocos warn/success usam tokens CSS (`var(--vl-state-warn-*)`) em vez de rgba() inline; consistente com o restante da UI.
- **cloudAudio.ts**: 4 `console.log`/`console.warn` de debug removidos; mantidos apenas os 3 handlers de erro legitimos.
- **Seletor de voz**: `isSpeakingRef.current` como guarda sincrono na funcao `speak()` evita race condition ao clicar duas vezes em "Falar".

### Testes

- `alertConfig.test.ts` (3): campos CSS var, icones distintos por severidade, error ≠ warn
- `toastStore.test.ts` (6): addToast, auto-remove por duracao, removeToast, pauseToast (para timer), resumeToast (retoma tempo restante), duration 0 = persistente — tudo com `vi.useFakeTimers()`
- `historyExport.test.ts` (6): buildCsv vazio (so header), linha unica, escape de aspas duplas, escape de virgulas, timestamp UTC, downloadCsv criacao e revogacao de blob URL (jsdom)
- **110/110 verde** (era 95/95)

### Infra / CI

- Workflow Linear sync (`linear-sync.yml`): branch com ID → In Progress; PR merge → Done; sem dependencia de token de terceiros.

## [1.0.0-rc.4] - 2026-05-20 (Polimento + dedup + perf)

### Adicionado

- **Guia "Como usar como microfone no Discord, VRChat e jogos"** colapsavel na HomePage e na pagina de Atalhos. Quatro passos numerados (instalar VB-Cable, selecionar CABLE Input, configurar CABLE Output no Discord/VRChat, ativar mic virtual) + dica especifica de VRChat. Antes a documentacao estava enterrada em VoiceShortcutsPage.

### Refatorado (sem mudanca de comportamento)

- Hook `useCloudVoices()` extraido com cache em memoria (24h) — evita dois fetches quando o usuario abre TTSPage e Vozes > Online em sequencia.
- Utilitarios `localeFlag`, `shortVoiceLabel`, `sortAvailableLocales`, `filterCloudVoices` centralizados em `utils/cloudVoiceFormatting.ts`.
- `CloudVoicePicker` e `CloudVoicesTab` agora compartilham toda a logica de fetch/filter/locale (eliminou ~80 linhas duplicadas).

### Performance

- Selectors do Zustand reescritos em 6 callsites (`TitleBar`, `HomePage`, `CompactView`, `App` root, `ModelsPage`, `OnboardingTutorial`). Antes o padrao `const { x } = useAppStore()` retornava o store inteiro e causava re-render a cada mudanca de qualquer field. Agora cada componente subscreve apenas aos fields que usa.

### Testes

- `cloudVoiceFormatting.test.ts` (11 testes): localeFlag, shortVoiceLabel com/sem padrao Microsoft, sortAvailableLocales prioriza populares, filterCloudVoices por locale/busca/personalidade.
- `download-manager.test.ts` (5 testes): rejeicao de http externo (gate de https), aceite de localhost para backend, limite de 5 redirects (anti-SSRF), `cancelDownload` com modelId desconhecido.
- **95/95 verde** (era 78/78).

### Mantido sem mudanca

- Cadeia Edge TTS continua funcionando com `webm-24khz-16bit-mono-opus` (validado novamente via `scripts/smoke-edge-tts.js`).
- CSP + media-src.
- Whitelist de extensoes de audio.

## [1.0.0-rc.3] - 2026-05-20 (Cloud playback destravado)

### Corrigido (BLOQUEADOR P0)

- **Edge TTS cloud agora reproduz audio.** A trilha online estava silenciosamente quebrada por DUAS causas combinadas que foram corrigidas nesta rodada:
  1. CSP em `index.html` faltava a diretiva `media-src`. Sem ela Chromium aplica `default-src 'self'` e bloqueia qualquer `blob:`/`data:` URL como source de `<audio>`. Adicionado `media-src 'self' blob: data:` + endpoints reais `wss://speech.platform.bing.com https://speech.platform.bing.com` em `connect-src`.
  2. `outputFormat` MPEG-2 Layer III 24kHz era fragil no decoder do Chromium 127 (Electron 35). Trocado por `webm-24khz-16bit-mono-opus` — Opus em container WebM eh nativo Chromium.
- `mimeType` propagado para `audio/webm` em todos os 6 callsites (handler IPC + cloudAudio util + TTSPage + App.tsx atalho/voice-shortcut + CloudVoicesTab + DiscordReadyBanner + VoiceShortcutsPage).
- `cloudAudio.ts` reescrito com 3 fallbacks em cascata: `<audio>` + blob URL → `<audio>` + data URL → Web Audio API `decodeAudioData` + `MediaStreamDestination`. O terceiro caminho preserva `setSinkId` para o CABLE Input.
- Token de playback impede race quando usuario clica duas vezes em prévias rápidas.

### Segurança

- `validateAudioExtension` ganhou whitelist estrita (`wav/mp3/ogg/oga/opus/webm/m4a/aac/flac`). Rejeita explicitamente `.exe/.bat/.cmd/.ps1/.js/.sh`.
- `download-manager` agora limita redirects a 5 (anti-SSRF) e bloqueia `http://` externo (apenas `https`). Aceita 301/302/303/307/308.
- `edge-tts-client`: bodies do tipo `response` que nao sao JSON parseavel agora logam `WARN` em vez de engolir silenciosamente.

### Diagnostico

- Novo `scripts/smoke-edge-tts.js`: roda fora do Electron (apenas node + ws), sintetiza voz fixada via WebSocket completo (Sec-MS-GEC + headers + SSML), salva o WebM resultante em disco e valida magic bytes `1a45dfa3` (EBML/Matroska). Util para confirmar que a cadeia de sintese funciona sem precisar abrir GUI.

### UX

- CompactView agora exibe **8 quick phrases** em vez de 4 (badges `1..8` visiveis na hora do jogo).

### Testes

- `security-utils.test.ts`: 17 testes cobrindo `validateModelId`, whitelist de extensoes de audio, `isHttpUrl`, `sanitizeFileName`.
- `edge-tts-client.test.ts`: 8 testes cobrindo `generateSecMsGec` (formato hex SHA-256 64 chars, estabilidade na janela de 5 min, rotacao na proxima janela) e geracao de URLs (WSS + voices list).
- **78/78 verde** (era 57/57).

### Validacao end-to-end

- Smoke `scripts/smoke-edge-tts.js` rodado com 3 vozes (pt-BR Francisca, en-US Aria, pt-BR Antonio): 239-298 frames `Path:audio`, 28-35 KB cada, magic byte `1a45dfa3` valido em todos.
- `out/renderer/index.html` (que vai pro `.exe` empacotado) contem o CSP atualizado.
- Build Windows: `npm run dist:win` gera `VoiceLaunch-TTS-Setup-1.0.0.exe` com backend Python bundled.

## [1.0.0-rc.2] - 2026-05-19 (Redesign + Cloud)

### Reescritas

- **Sistema de design roxo/gamer**: brand passou a ser roxo neon (#8B5CF6 pivo), cyan virou secondary reservado pra estado "ao vivo".
- **HUD components**: hud-frame, hud-frame--hero com scanline, neon-glow, badge-shortcut 1..9, tier-badge S/A/B/C, terminal-textarea.
- **TitleBar custom** (`frame: false`) com drag region — sem mais barra dupla no Windows.
- **HomePage** com hero + grid HUD 2x2 (Backend, Modelos, Mic, Atalho) + Quick Launch.

### Adicionado

- **Edge TTS cloud** (sem Python, sem GPU): ~400 vozes Microsoft Edge TTS via WebSocket nativo no main process; Sec-MS-GEC anti-bot token (SHA-256 com Windows-ticks via BigInt).
- **CloudVoicePicker / CloudVoicesTab** com filtro por idioma, busca e previa por voz.
- **AudioOutputPicker** em Ajustes para rotear voz online ao CABLE Input via `setSinkId`.
- **Voice Shortcuts soundboard**: pagina `/shortcuts` com CRUD; cada atalho guarda voz + texto + tecla + velocidade. 31 slots de hotkey (Ctrl+Shift+1..0, Ctrl+Alt+1..0, Ctrl+Shift+F1..F12). Main process registra dinamicamente via IPC.
- **Perfis Padrao/Jogo** com ProfileSwitcher na sidebar; troca de perfil aplica modelo, velocidade e quick phrases imediatamente.
- **DiscordReadyBanner** com botao "Testar agora" roteado pra CABLE Input.
- **HardwarePlaybook** vendor-aware: trilhas distintas pra NVIDIA+CUDA, NVIDIA sem CUDA, AMD, Intel iGPU, CPU-only.
- **Onboarding hardware-aware**: passos mudam pelo `gpuVendor` + `isCudaAvailable`; ultimo passo faz polling real do mic virtual.
- **DashboardPage com playbook**: cards numerados clicaveis com a trilha concreta pra cada vendor.
- **Vozes page com abas**: Online (Edge TTS) / Locais (Piper/Kokoro) / Clonadas (XTTS).
- **LogsPage**: syntax highlight INFO/WARN/ERROR coloridos, filtro por nivel, busca, truncamento 2000 linhas.
- **Single-instance lock**: `app.requestSingleInstanceLock` + `app.exit(0)` impede zumbis.

### Corrigido

- **`model:load`/`model:unload`** agora validam `modelId` (paridade com `model:uninstall`) — fecha vetor de injecao.
- **`buildHistoryItem`** usa `crypto.randomUUID()` — sem colisao em rajadas rapidas.
- **Conflito de atalhos globais** capturado e exibido em toast com instrucao util.
- **Foco do textarea** retorna em `finally` apos `speak()` — fluxo digitar->Enter->digitar sem clique extra.
- **Toast em modo compacto** posiciona no topo (`top-2`) — nao cobre o botao Falar em 480x420.
- **BackendBanner** discreto quando `voiceSource === 'cloud'` (some na trilha cloud, fica visivel na trilha local).
- **`python-manager`** mantem referencia do `launchPlan` no construtor — diagnostics nao ficam stale em falha pre-start.

### Migracoes (`schemaVersion`)

- **v1**: estrutura inicial com `profiles[]` e `activeProfileId`.
- **v2**: + `voiceSource`, `cloudVoice`, `cableDeviceId`, `cableDeviceLabel`.
- **v3**: + `voiceShortcuts[]` com 31 slots de hotkey.
- Migration preserva `quickPhrases` legados no perfil `padrao`; cobre cenarios de fresh install, upgrade, e fallback de `activeProfileId` invalido.

### Compat Discord / VRChat

- Voz online roteada pro CABLE Input via `HTMLMediaElement.setSinkId(deviceId)`.
- Documentado em-app: instalar VB-Cable, escolher CABLE Input na saida, definir CABLE Output como microfone no Discord/VRChat.
- VRChat: voice activation funciona out-of-box; PTT exige interacao manual (sem simulacao de tecla nativa nesta versao).

### Cobertura

- **57/57 testes** verde (vitest): HardwarePlaybook por vendor, VoiceShortcuts (conflito/reserva/sugestao), migracoes v1-v3, `crypto.randomUUID` em rajada, sanitizacao de comunicacao.

### Plano

- `docs/MVP_CLOSEOUT_PLAN.md` documenta o caminho completo ate v1.0 final, incluindo as fases K (download URLs com mirrors + checksum + resume), L (install-deps XTTS endurecido pra NVIDIA), M (smoke em 3 maquinas reais), N (assinatura + release).

### Conhecidas / fora desta rodada

- Backend Python local exige `voicelaunch-backend.exe` empacotado (em `npm run dist:win`); em dev sem venv Python configurado, o backend nao sobe — vozes locais nao funcionam mas as online sim.
- Clonagem XTTS exige NVIDIA + CUDA + install-deps via backend.
- PTT do VRChat: voice activation funciona automaticamente; simulacao de tecla PTT fica para v1.1 (requer biblioteca nativa tipo robotjs).
- Instalador continua sem assinatura de codigo — SmartScreen vai exibir warning na primeira execucao.

## [1.0.0] - 2026-05-12

### Adicionado

- Launcher desktop em Electron + React + TypeScript
- Backend Python FastAPI com suporte a multiplos engines TTS
- Matriz de suporte do MVP local:
  - Piper TTS como caminho principal para a primeira fala local
  - Kokoro como upgrade de qualidade dentro do fluxo estavel
  - XTTS v2 como recurso avancado condicionado a validacao NVIDIA/CUDA
  - MeloTTS, Fish Speech e Bark mantidos como experimentais, fora do caminho principal
- Deteccao automatica de hardware para orientar o fluxo estavel do MVP
- Download one-click de modelos com progresso em tempo real
- Instalacao automatica de dependencias Python por engine
- Microfone virtual via VB-Audio Virtual Cable com deteccao automatica
- Clonagem de voz integrada com gate de uso pratico para hardware sem CUDA
- Interface acessivel com alto contraste, fonte grande, teclado virtual e navegacao por teclado
- Tutorial interativo de primeiro uso
- Sistema de logs unificado (Main + Python)
- Persistencia de configuracoes no disco via Electron IPC
- WebSocket streaming para TTS em tempo real
- Build system completo com electron-builder + PyInstaller + NSIS

### Corrigido

- CORS restrito, sandbox do Electron habilitado e validacoes de path/URL/extensao nos pontos criticos
- Loop infinito da tela de modelos removido
- `cpuThreads`, `clearLogs`, `hardware_probe.py` e cleanup de `audioUrl` corrigidos
- UI alinhada ao MVP local com onboarding/checklist, filtro de modelos e toggle de experimentais
- Fluxo de comunicacao assistiva reforcado com rascunho persistente, historico persistente, frases rapidas personalizaveis e abertura rapida do comunicador compacto
- Redesign do launcher aplicado ao shell, Home, TTS e modo compacto com direcao visual tech noir acessivel e gates mais honestos no fluxo principal
- Nome do instalador canonico alinhado com `latest.yml` para evitar drift entre artefato local e metadata de auto-update
- Boot do app destravado para abrir a UI antes do backend, com estado visivel e retry quando o backend falha
- Empacotamento corrigido para remover duplicacao de `python_dist`, reduzindo fortemente o tamanho do instalador
- Fluxo de VB-Cable ajustado para tentar o instalador embutido e cair para o site oficial quando necessario
- Atalhos globais de fala alinhados a modelos realmente visiveis e instalados no MVP
- Auto-update desligado por padrao ate existir pipeline real de release

### Notas

- O caminho garantido do MVP local em CPU/AMD continua sendo Piper e Kokoro
- XTTS v2 nao faz parte da primeira experiencia padrao; depende de validacao NVIDIA/CUDA
- O launcher gerencia o ciclo de vida do processo Python automaticamente
- Vozes clonadas ficam em `%APPDATA%\\VoiceLaunch\\voices\\`
- Modelos ficam em `%APPDATA%\\VoiceLaunch\\models\\`

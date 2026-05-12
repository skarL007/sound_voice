# Changelog

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

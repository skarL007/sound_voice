# Plano Completo — VoiceLaunch TTS

## Fase 0: Fundação (Dia 1)
- [x] 0.1 Criar Harness Engineering
- [x] 0.2 Criar Plano de Execução
- [x] 0.3 Inicializar projeto Electron + Vite + React + TypeScript
- [x] 0.4 Configurar build system (electron-builder, vite configs)
- [x] 0.5 Configurar Python backend (FastAPI, estrutura de pastas)
- [x] 0.6 Definir contratos IPC e REST API
- [x] 0.7 Criar sistema de logging unificado (main + renderer + python)

## Fase 1: Detecção de Hardware & Catálogo de Modelos (Dia 1-2)
- [x] 1.1 Implementar `hardware_probe.py` (CPU, RAM, GPU, OS, disco)
- [x] 1.2 Implementar `hardware-detector.ts` (wrapper IPC)
- [x] 1.3 Criar tela de Dashboard de Hardware no React
- [x] 1.4 Implementar catálogo de modelos com metadados (model-registry.json)
- [x] 1.5 Implementar sistema de recomendação automática de modelos por tier
- [x] 1.5 Criar componente de card de modelo (idiomas, qualidade, VRAM, clonagem)

## Fase 2: Download & Gestão de Modelos (Dia 2-3)
- [x] 2.1 Download com progresso via Node.js https (alternativa ao aria2c)
- [x] 2.2 Implementar `model_manager.py` (download, extrair, validar, instalar deps)
- [x] 2.3 Implementar `download-manager.ts` com progresso IPC
- [x] 2.4 Criar tela de downloads ativos e fila
- [x] 2.5 Implementar instalação de dependências Python por modelo (requirements separados)
- [x] 2.6 Criar sistema de cache e cleanup de modelos

## Fase 3: Engine TTS — Wrappers dos Modelos (Dia 3-5)
- [x] 3.1 Implementar wrapper **Piper TTS** (prioridade 1 — CPU, leve, PT-BR)
- [x] 3.2 Implementar wrapper **Kokoro** (prioridade 2 — qualidade, PT-BR)
- [x] 3.3 Implementar wrapper **MeloTTS** (prioridade 3 — CPU, PT-BR)
- [x] 3.4 Implementar wrapper **XTTS v2** (prioridade 4 — clonagem, PT-BR, AMD DirectML)
- [x] 3.5 Implementar wrapper **Fish Speech** (prioridade 5 — clonagem comercial)
- [x] 3.6 Implementar wrapper **Bark** (prioridade 6 — expressivo)
- [x] 3.7 Criar interface unificada `BaseTTSEngine` para todos os wrappers
- [x] 3.8 Implementar endpoint `/tts` síncrono e `/ws/tts-stream` WebSocket

## Fase 4: Interface de Geração de Voz (Dia 5-6)
- [x] 4.1 Criar tela principal de geração (input de texto, seleção de modelo/voz)
- [x] 4.2 Implementar player de áudio com playback via backend
- [x] 4.3 Criar sistema de frases pré-definidas / favoritos
- [x] 4.4 Implementar atalhos de teclado globais (push-to-talk, frases rápidas)
- [x] 4.5 Criar modo "conversação rápida" (janela flutuante, always-on-top)
- [x] 4.6 Implementar histórico de frases geradas

## Fase 5: Virtual Microphone (Dia 6-7)
- [x] 5.1 Integrar VB-Audio Virtual Cable (detecção, instalação, configuração)
- [x] 5.2 Implementar `virtual_mic.py` (roteamento de áudio para CABLE Input)
- [x] 5.3 Criar tela de configuração de dispositivos de áudio
- [x] 5.4 Implementar toggle "Usar como microfone virtual"
- [x] 5.5 Implementar modo "Push to Talk" vs "Always On"
- [x] 5.6 Criar instruções visuais para apps (Discord, Zoom, etc.)
- [ ] 5.7 Implementar merge de microfone real + TTS (VoiceMeeter instructions)

## Fase 6: Clonagem de Voz (Dia 7-9)
- [x] 6.1 Criar wizard de clonagem (4 passos: gravar/importar → validar → processar → salvar)
- [x] 6.2 Implementar gravação de áudio no Electron (MediaRecorder API)
- [x] 6.3 Implementar validação de áudio (duração, SNR, formato)
- [x] 6.4 Implementar extração de embeddings para XTTS v2 (usa speaker_wav diretamente)
- [ ] 6.5 Implementar extração de embeddings para Fish Speech
- [x] 6.6 Criar tela de gerenciamento de vozes clonadas
- [x] 6.7 Implementar preview/teste de voz clonada
- [x] 6.8 Mostrar tempo estimado de processamento antes de iniciar

## Fase 7: Acessibilidade & Polish (Dia 9-10)
- [x] 7.1 Implementar alto contraste e fontes grandes
- [x] 7.2 Criar modo de navegação por teclado completo (Tab, Enter, atalhos)
- [x] 7.3 Implementar teclado virtual na tela
- [x] 7.4 Criar tutorial interativo de primeiro uso
- [x] 7.5 Adicionar tooltips explicativos em cada modelo
- [x] 7.6 Implementar sistema de notificações desktop
- [x] 7.7 Criar tela de configurações gerais
- [x] 7.8 Criar página de logs unificada (Main + Python)
- [x] 7.9 Persistir configurações do usuário no disco

## Fase 8: Build & Distribuição (Dia 10-11)
- [x] 8.1 Configurar PyInstaller para backend Python
- [x] 8.2 Configurar electron-builder para .exe standalone
- [x] 8.3 Criar script de build completo (build-python.bat → build-electron.bat)
- [x] 8.4 Testar instalação em máquina limpa (Windows 10/11)
- [x] 8.5 Criar instalador NSIS com VB-Cable bundled
- [x] 8.6 Gerar versão de teste e validar end-to-end

## Entregáveis por Fase

| Fase | Entregável Visível |
|------|-------------------|
| 0 | Repositório estruturado, builds funcionando |
| 1 | Tela "Meu Computador" com specs e recomendações |
| 2 | Tela "Modelos" com download one-click e progresso |
| 3 | Áudio gerando localmente via API Python |
| 4 | App funcional de digitar → ouvir voz |
| 5 | Voz saindo como microfone em outros apps |
| 6 | Wizard de clonagem funcionando end-to-end |
| 7 | UI acessível, tutorial, polish, logs, persistência |
| 8 | `.exe` instalável e testado |

## Critérios de Aceitação do Projeto

1. Usuário abre o app e vê as specs do PC em < 3s
2. Usuário pode baixar e instalar Piper TTS em < 2 minutos (modelo PT-BR)
3. Usuário digita texto em português e ouve a voz em < 1s (Piper CPU)
4. Usuário ativa "modo microfone" e a voz aparece no Discord/Zoom
5. Usuário clona uma voz em < 5 minutos (incluindo gravação)
6. App funciona 100% offline após downloads iniciais
7. Interface é navegável 100% por teclado

---

*Plano versionado. Última atualização: 2026-05-11*

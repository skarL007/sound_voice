# Harness Engineering — VoiceLaunch TTS

## 1. Visão do Produto

Launcher desktop (Electron) para execução local de modelos TTS open-source, com foco em **acessibilidade para pessoas com deficiência na fala e mudas**. O usuário digita ou seleciona frases predefinidas, o sistema sintetiza voz e a envia como **microfone virtual** para qualquer aplicação (Discord, Zoom, jogos, etc.).

### Diferenciais
- Detecção automática de hardware e recomendação de modelos
- Download e configuração one-click de modelos e dependências
- Clonagem de voz integrada no launcher (6–30s de áudio de referência)
- Saída como microfone virtual sem configurações manuais complexas
- Interface pensada para acessibilidade (atalhos de teclado, modo de digitação rápida, frases favoritas)

---

## 2. Arquitetura de Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                        │
│  • Gerenciamento de janelas                                         │
│  • IPC com renderer                                                 │
│  • Spawn do Python Backend                                          │
│  • Download de arquivos (modelos, VB-Cable)                         │
│  • Instalação de dependências do sistema (Python, CUDA, etc.)       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ IPC (ipcMain / ipcRenderer)
┌─────────────────────────────────────────────────────────────────────┐
│                      Electron Renderer (React)                      │
│  • UI/UX completa                                                   │
│  • Dashboard de hardware                                            │
│  • Catálogo de modelos TTS                                          │
│  • Player de áudio / visualização de onda                           │
│  • Tela de clonagem de voz com wizard                               │
│  • Configurações de microfone virtual                               │
│  • Teclado virtual / frases rápidas                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP / WebSocket (localhost:9472)
┌─────────────────────────────────────────────────────────────────────┐
│                     Python Backend (FastAPI)                        │
│  • Endpoints REST para inferência TTS                               │
│  • WebSocket para streaming de áudio em tempo real                  │
│  • Gerenciamento de modelos (download, load, unload)                │
│  • Pipeline de clonagem de voz                                      │
│  • Integração com NAudio / VB-Cable para virtual mic                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Modelos TTS (on-disk)                       │
│  Piper / Kokoro / XTTS-v2 / Fish Speech / Bark / MeloTTS            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Shell Desktop** | Electron 35 + Vite | Acesso nativo ao sistema, empacotamento cross-platform, ecossistema maduro |
| **Frontend UI** | React 19 + TypeScript + Tailwind CSS | Componentização, tipagem segura, estilização rápida |
| **State Management** | Zustand | Leve, TypeScript-friendly, sem boilerplate |
| **Backend TTS** | Python 3.10+ + FastAPI | Ecossistema AI dominante em Python, async nativo |
| **Inferência TTS** | Piper, Kokoro, TTS (Coqui), fish-speech, bark, melotts | Modelos mais maduros e atualizados em 2026 |
| **Áudio Virtual** | VB-Audio Virtual Cable (bundled) + NAudio (C# bridge) | Solução estável e testada no Windows para virtual mic |
| **Hardware Detection** | Python: `psutil`, `GPUtil`, `py-cpuinfo`, `wmic` | APIs nativas para coleta de specs |
| **Download/Install** | `aria2c` (acelerado) + `pip` programático | Downloads grandes de modelos (GBs) com resumo |
| **Empacotamento** | `electron-builder` + `pyinstaller` | Gera `.exe` standalone com Python embutido |

---

## 4. Modelos TTS Suportados

### Matriz de Modelos

| Modelo | Idiomas | PT-BR | MOS | VRAM Mín | CPU OK | Clonagem | Licença | Peso Download |
|--------|---------|-------|-----|----------|--------|----------|---------|---------------|
| **Piper** | 50+ | ✅ Sim | 3.5 | 0 MB (CPU) | ✅ Sim | ❌ Não | MIT | 10–100 MB |
| **Kokoro** | 9 (incl. PT) | ✅ Sim | 4.2 | < 1 GB | ✅ Sim | ❌ Presets | Apache 2.0 | ~300 MB |
| **XTTS v2** | 17 | ✅ Sim | 4.0 | ~4 GB | ❌ GPU | ✅ 6s ref | CPML (non-commercial) | ~2 GB |
| **Fish Speech** | 8 | ⚠️ Parcial | 4.1 | ~4 GB | ❌ GPU | ✅ 10-30s | Apache 2.0 | ~2 GB |
| **Bark** | 13+ | ⚠️ Parcial | 3.7 | ~6 GB | ❌ GPU | ⚠️ Limitada | MIT | ~4 GB |
| **MeloTTS** | 6+ | ✅ Sim | 3.9 | 0 MB (CPU) | ✅ Sim | ❌ Não | MIT | ~500 MB |

### Regras de Recomendação por Hardware

| Tier Hardware | Modelos Recomendados |
|---------------|----------------------|
| CPU apenas / < 4 GB RAM | Piper, MeloTTS |
| iGPU / 4-8 GB RAM | Kokoro, Piper, MeloTTS |
| GTX 1650 / 8 GB | Kokoro, XTTS-v2 (lento), MeloTTS |
| RTX 3060+ / 16 GB | Todos os modelos |
| RTX 4090 / 32 GB | Todos, incluindo Bark e batch processing |

---

## 5. Sistema de Virtual Microphone

### Abordagem no Windows

1. **Bundled VB-Audio Virtual Cable**: O launcher inclui o instalador do VB-Cable (gratuito, licença permitida para redistribuição do driver). Instalação silenciosa via linha de comando.
2. **Roteamento Automático**: O backend Python envia o áudio gerado para o dispositivo de playback "CABLE Input".
3. **Dispositivo de Gravação**: "CABLE Output" aparece como microfone disponível em qualquer aplicação.
4. **Merge Opcional**: Para uso simultâneo de microfone real + TTS, instruir o usuário a instalar VoiceMeeter (também bundled) ou usar modo "push-to-talk" no launcher.

### Implementação Técnica

```python
# Pseudocódigo do roteamento
import sounddevice as sd
import numpy as np

def play_as_virtual_mic(audio_array: np.ndarray, sample_rate: int):
    # Encontra o dispositivo VB-Cable Input
    device = find_device_by_name("CABLE Input")
    sd.play(audio_array, samplerate=sample_rate, device=device['index'])
    sd.wait()
```

### Alternativa Nativa (futura)
- Desenvolver driver virtual usando Windows User-Mode Driver Framework (UMDF) ou portar `scream` / `virtual-audio-cable` open-source.
- Prioridade: usar VB-Cable na v1 por estabilidade.

---

## 6. Pipeline de Clonagem de Voz

### Fluxo UX (Wizard de 4 passos)

1. **Gravar ou Importar**: Usuário grava 6–30s de áudio via mic ou arrasta arquivo WAV/MP3.
2. **Validar**: Sistema verifica duração, SNR (ruído), taxa de amostragem.
3. **Processar**: Extrai embeddings do speaker (dependendo do modelo: XTTS, Fish Speech, F5-TTS).
4. **Salvar**: Armazena o embedding/voice-print no perfil do usuário (`~/.voicelaunch/voices/`).

### Tempos de Processamento (RTX 3060 referência)

| Modelo | Extração Embedding | Inferência 10s texto |
|--------|-------------------|----------------------|
| XTTS v2 | 2–4s | 1.8s |
| Fish Speech | 3–5s | 1.2s |
| F5-TTS | 2–3s | 1.4s |

### Armazenamento
- Cada voz clonada: ~5–50 MB (embedding + metadados + sample de referência)
- Formatos: `.pt` (PyTorch), `.pth`, `.safetensors`

---

## 7. Estrutura de Diretórios

```
sound_voice/
├── docs/
│   ├── HARNESS.md              # Este documento
│   └── PLAN.md                 # Plano de execução
├── src/
│   ├── main/                   # Processo principal Electron (Node.js)
│   │   ├── index.ts            # Entry point
│   │   ├── ipc-handlers.ts     # Comunicação IPC
│   │   ├── python-manager.ts   # Spawn/monitoramento do backend Python
│   │   ├── download-manager.ts # Downloads com progresso
│   │   └── hardware-detector.ts# Wrapper para detecção de hardware
│   ├── renderer/               # React App
│   │   ├── main.tsx            # Entry React
│   │   ├── App.tsx             # Router/Layout
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── pages/              # Telas principais
│   │   ├── stores/             # Zustand stores
│   │   └── hooks/              # Custom hooks
│   └── python/                 # Backend Python
│       ├── main.py             # FastAPI server
│       ├── tts_engines/        # Wrappers para cada modelo
│       ├── voice_cloner.py     # Pipeline de clonagem
│       ├── hardware_probe.py   # Detecção de hardware
│       ├── model_manager.py    # Download/load/unload
│       ├── virtual_mic.py      # Integração com VB-Cable
│       └── requirements.txt    # Dependências Python
├── assets/
│   ├── vbcable/                # Instalador VB-Audio Cable
│   └── icons/                  # Ícones do app
├── scripts/
│   ├── build-python.bat        # Build do backend com PyInstaller
│   └── setup-env.bat           # Setup inicial de ambiente
├── package.json                # Dependências Node/Electron
├── electron-builder.yml        # Config de empacotamento
├── tsconfig.json
├── vite.main.config.ts
├── vite.renderer.config.ts
└── README.md
```

---

## 8. APIs e Contratos

### IPC (Main ↔ Renderer)

| Canal | Direção | Payload | Descrição |
|-------|---------|---------|-----------|
| `hardware:get-info` | R→M | `{}` | Retorna specs do PC |
| `hardware:get-info:response` | M→R | `{cpu, ram, gpu, os}` | |
| `model:download` | R→M | `{modelId, variant?}` | Inicia download |
| `model:download:progress` | M→R | `{modelId, percent, speed}` | |
| `model:download:complete` | M→R | `{modelId, success}` | |
| `model:list-installed` | R→M | `{}` | Lista modelos instalados |
| `tts:synthesize` | R→M | `{text, modelId, voiceId?, speed?}` | Gera áudio |
| `tts:play` | M→R | `{audioPath}` | Áudio pronto |
| `tts:stream-start` | R→M | `{text, modelId}` | Inicia streaming WS |
| `voice:clone` | R→M | `{audioPath, modelId, name}` | Clona voz |
| `voice:clone:progress` | M→R | `{stage, percent}` | |
| `voice:list` | R→M | `{}` | Lista vozes clonadas |
| `mic:route` | R→M | `{enabled, device?}` | Ativa/desativa virtual mic |

### REST API (Python Backend)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do backend |
| GET | `/models` | Lista modelos disponíveis e status |
| POST | `/models/load` | Carrega modelo na VRAM |
| POST | `/models/unload` | Descarrega modelo |
| POST | `/tts` | Síntese síncrona (retorna WAV) |
| WS | `/ws/tts-stream` | Streaming de chunks de áudio |
| POST | `/voice/clone` | Clonagem de voz |
| GET | `/voice/list` | Lista vozes clonadas |
| POST | `/voice/delete` | Remove voz clonada |
| GET | `/hardware` | Informações de hardware |
| POST | `/play` | Reproduz áudio em dispositivo |
| GET | `/audio/devices` | Lista dispositivos de áudio |

---

## 9. Segurança & Privacidade

- **100% offline**: Nenhuma requisição para APIs externas além do download inicial de modelos.
- **Dados locais**: Vozes clonadas, histórico, configurações ficam em `%APPDATA%\VoiceLaunch\`.
- **Sandbox**: Renderer Electron com `contextIsolation: true`, `nodeIntegration: false`.
- **Assinatura**: Binários Python empacotados e verificados por hash.

---

## 10. Métricas de Performance

| Métrica | Target |
|---------|--------|
| Cold start do launcher | < 3s |
| Startup do backend Python | < 5s |
| Download modelo Piper | < 30s (10 MB) |
| Download modelo XTTS | < 5 min (2 GB, com resume) |
| Latência TTS (Piper CPU) | < 200ms |
| Latência TTS (Kokoro GPU) | < 150ms |
| Latência TTS (XTTS GPU) | < 300ms |
| Tempo clonagem voz | < 10s (referência 6s) |
| Uso RAM idle | < 300 MB |

---

## 11. Decisões Arquiteturais Registradas

| Data | Decisão | Contexto | Consequência |
|------|---------|----------|--------------|
| 2026-05-10 | Electron + React shell | Acesso nativo ao sistema + UI rica | Bundle maior (~150 MB), mas UX superior |
| 2026-05-10 | Python backend separado | Ecossistema TTS é 99% Python | Necessita spawn de processo, IPC mais complexo |
| 2026-05-10 | FastAPI + WebSocket | Streaming de áudio em tempo real | Requer porta local livre (9472) |
| 2026-05-10 | VB-Cable bundled | Windows não tem virtual mic nativo | Instalação de driver necessária (UAC) |
| 2026-05-10 | PyInstaller para Python | Distribuição sem exigir Python no PC | Build mais lento, binários maiores |
| 2026-05-10 | aria2 para downloads | Modelos são grandes, precisam de resume | Dependência externa, mas estável |

---

## 12. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| VB-Cable instalação falha (UAC) | Média | Alto | Detectar falha, instruir instalação manual, oferecer VoiceMeeter |
| Modelo não cabe na VRAM | Alta | Médio | Detectar antes de carregar, sugerir modelos leves |
| Python backend crash | Baixa | Alto | Restart automático, health checks, logs detalhados |
| Download interrompido | Média | Baixo | Resume automático via aria2, validação de checksum |
| Clonagem com áudio ruim | Alta | Baixo | Validar SNR/duração antes de processar, preview da qualidade |
| Latência alta em CPU-only | Alta | Médio | Otimizar para streaming chunk-by-chunk, indicar "modo leitura" vs "modo conversação" |

---

*Documento versionado. Última atualização: 2026-05-10*

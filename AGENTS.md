# Agent Instructions — VoiceLaunch TTS

## Projeto

VoiceLaunch TTS é um launcher desktop em Electron para execução local de modelos TTS open-source, com foco em acessibilidade para pessoas com deficiência na fala e mudas.

## Stack

- **Shell**: Electron 35 + Vite
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Python 3.10+ + FastAPI + Uvicorn
- **TTS Engines**: Piper, Kokoro, MeloTTS, XTTS v2, Fish Speech, Bark
- **Audio**: sounddevice + soundfile + VB-Audio Virtual Cable

## Estrutura de Diretórios

```
src/
  main/         # Processo principal Electron (Node.js)
  preload/      # Script de preload (API segura)
  renderer/     # Aplicação React
  python/       # Backend FastAPI
  shared/       # Tipos TypeScript compartilhados
```

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Distribuição
npm run dist:win
```

## Convenções

- Use TypeScript strict em todo código novo
- Componentes React: arrow functions com export default
- IPC: sempre tipar payloads no `src/shared/types.ts`
- Python: docstrings em funções públicas, PEP 8
- Modelos TTS: imports lazy dentro dos wrappers para evitar dependências obrigatórias

## Dependências Python

Instalar via: `pip install -r src/python/requirements.txt`

Para build standalone: `scripts/build-python.bat`

## Notas

- O backend Python roda em localhost:9472
- O launcher gerencia o ciclo de vida do processo Python
- Vozes clonadas ficam em `%APPDATA%\voicelaunch-tts\voices\`
- Modelos ficam em `%APPDATA%\voicelaunch-tts\models\`

# VoiceLaunch TTS

Launcher desktop em Electron para execucao local de TTS (Text-to-Speech) open-source, com foco em acessibilidade para pessoas com deficiencia na fala.

## Caminho estavel do MVP local

- **Piper**: primeira experiencia recomendada, leve e confiavel
- **Kokoro**: upgrade de qualidade ainda dentro do fluxo estavel
- **Microfone virtual**: integracao local com Discord, Zoom, jogos e outros apps
- **XTTS v2 como recurso avancado**: recomendado somente depois de validar NVIDIA com CUDA
- **MeloTTS, Fish Speech e Bark**: fora do caminho principal do MVP atual

## Suporte pratico por perfil de hardware

- **CPU / sem GPU validada**: Piper e Kokoro
- **AMD no Windows**: Piper e Kokoro como fluxo garantido do MVP
- **NVIDIA com CUDA validado**: Piper e Kokoro no fluxo principal, XTTS v2 como recurso avancado

## Modelos no estado atual do projeto

| Modelo | Status no MVP | Observacao |
|--------|----------------|------------|
| Piper | Estavel | Melhor ponto de partida para primeira fala local |
| Kokoro | Estavel | Melhor qualidade mantendo o fluxo principal |
| XTTS v2 | Avancado | Recomendado apenas com NVIDIA/CUDA validado |
| MeloTTS | Experimental | Fora do fluxo principal atual |
| Fish Speech | Experimental | Fora do fluxo principal atual |
| Bark | Experimental | Fora do fluxo principal atual |

## Funcionalidades

- Execucao local offline apos os downloads iniciais
- Download de modelos pela interface
- Instalacao de dependencias por engine
- Microfone virtual com VB-Cable
- Historico de frases e frases rapidas
- Modo compacto e atalhos globais
- Onboarding focado no fluxo estavel do MVP

## Requisitos

- Windows 10/11 (x64)
- 4 GB RAM minimo
- 8 a 16 GB RAM recomendados para melhor experiencia
- GPU NVIDIA opcional para XTTS v2 avancado
- Python 3.10+ apenas para desenvolvimento

## Desenvolvimento

```bash
# Instalar dependencias Node
npm install

# Instalar dependencias Python core
pip install -r src/python/requirements-core.txt

# Instalar engines que deseja usar
pip install -r src/python/requirements-piper.txt
pip install -r src/python/requirements-kokoro.txt
pip install -r src/python/requirements-xtts.txt

# Rodar em desenvolvimento
npm run dev

# Build para producao
npm run build

# Criar instalador .exe
npm run dist:win
```

## Arquitetura

- **Electron Main**: gerenciamento de janela, IPC e ciclo de vida do backend
- **React Renderer**: fluxo de setup, UI de modelos, fala e configuracoes
- **Python Backend (FastAPI)**: inferencia TTS, clonagem, audio e gestao de modelos

## Logs

Logs sao salvos em `%APPDATA%\VoiceLaunch\logs\` e podem ser visualizados na aba "Logs" do aplicativo.

## Licenca

MIT

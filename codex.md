# VoiceLaunch TTS - Estado do Projeto

> Atualizado em: 2026-05-12
> Status: **MVP LOCAL ESTABILIZADO - REPO PUBLICADO, README ALINHADO E BETA CORE PENDENTE**

---

## Estado Atual Para Retomada

- **Fonte de verdade desta pasta:** este checkout voltou a ser um repositorio Git valido; a continuidade agora depende de `codex.md`, `README.md`, `CHANGELOG.md`, `docs/` e do remoto publicado.
- **Fluxo principal real do MVP local:** `Piper` primeiro, `Kokoro` como upgrade de qualidade, `XTTS v2` somente como trilha avancada em `NVIDIA/CUDA`.
- **Fora do caminho principal:** `MeloTTS`, `Fish Speech` e `Bark` seguem experimentais e ocultos por padrao.
- **Verificacao fresca desta rodada:** `npm test` = **21 testes passando**; `npm run build` = **build OK**.
- **Verificacao de distribuicao desta rodada:** `npm run dist:win` = **installer NSIS atualizado gerado** com nome canonico alinhado ao `latest.yml`.
- **Verificacao de runtime desta rodada:** `npm run dev` e `dist/win-unpacked/VoiceLaunch TTS.exe` subiram em execucao real.
- **Validacao extra de runtime empacotado:** o backend standalone respondeu em `/health` e o fallback de porta foi exercitado com sucesso quando `9472` estava ocupado.
- **Artefato canonico desta rodada:** `dist/VoiceLaunch-TTS-Setup-1.0.0.exe`, gerado em `2026-05-12 17:45`.
- **Repositorio publicado:** `https://github.com/skarL007/sound_voice` em `main`, com `origin/main` sincronizado no commit `0462a62` (`Polish repo docs and inclusive positioning`).

---

## O Que Foi Endurecido Nesta Rodada

### Produto e UX

- [x] A janela principal agora abre antes do backend Python.
- [x] O app mostra estado de backend em inicializacao/erro com acao de retry.
- [x] Os atalhos globais de frases rapidas agora usam apenas modelos realmente visiveis e instalados no MVP.
- [x] O modo compacto bloqueia a fala de forma honesta enquanto o backend nao estiver pronto.

### Microfone Virtual

- [x] O fluxo do VB-Cable ficou honesto: tenta o instalador embutido, e cai para o site oficial quando o `.exe` nao estiver presente no pacote.
- [x] A UI de Configuracoes passou a comunicar esse fallback de forma explicita.

### Empacotamento e Distribuicao

- [x] O nome canonico do installer foi alinhado com `latest.yml`.
- [x] `python_dist` foi removido do `app.asar` e ficou apenas em `extraResources`, eliminando duplicacao no pacote.
- [x] O tamanho do instalador caiu fortemente depois dessa correcao.
- [x] Auto-update ficou desligado por padrao ate existir trilha operacional real de release.
- [x] O backend standalone agora usa `model-registry.json` exposto via `extraResources`.
- [x] O backend escolhe uma porta livre quando `9472` estiver ocupada.

---

## Funcionalidades Hoje Validadas

### Core TTS

- [x] Piper funcionando end-to-end
- [x] Kokoro funcionando end-to-end
- [x] API `/tts` retornando `audioPath` + `duration`
- [x] Playback local via `/play`
- [x] Cancelamento de TTS durante execucao

### Comunicacao Assistiva

- [x] Historico persistente
- [x] Rascunho persistente
- [x] Frases rapidas personalizaveis
- [x] Atalhos globais `Ctrl+Shift+V`, `Ctrl+Shift+1..9`, `Ctrl+Shift+M`, `Ctrl+Shift+S`
- [x] Comunicador compacto com recentes e estado de mic virtual
- [x] Alto contraste, fonte grande e foco visivel

### Build e Distribuicao

- [x] Installer NSIS em `dist/VoiceLaunch-TTS-Setup-1.0.0.exe`
- [x] `win-unpacked` validado em runtime real
- [x] `latest.yml` consistente com o nome do artefato
- [x] Backend Python empacotado como recurso standalone

---

## Artefatos Relevantes

```text
dist/
  VoiceLaunch-TTS-Setup-1.0.0.exe        <- 467,475,211 bytes
  VoiceLaunch-TTS-Setup-1.0.0.exe.blockmap
  latest.yml
  win-unpacked/
```

### Integridade do pacote beta atual

- **SHA-256:** `A944D5D0F1697F76B3E94624F5C561C7D15A5AF2F5E14E05ABC3EC4927D35DF8`
- **SHA-512:** `D34A67B260D5A9698A45EF5AA350BC25EF0D690AE6A277F1F7E538272D812582B815FBF704F1DDD76334ADACAE7FD9EA27E15F3A08EE4B5FB5D1AF15A03FF736`
- **Auto-update metadata:** `dist/latest.yml` aponta para `VoiceLaunch-TTS-Setup-1.0.0.exe`
- **Observacao operacional:** o diretorio `dist/` ainda pode conter um installer legado com espacos no nome de builds anteriores; o artefato canonico desta rodada e o arquivo hifenizado.

---

## Problemas Conhecidos

- **Installer nao assinado:** aceitavel para beta fechado, mas ainda bloqueia release publica sem aviso do SmartScreen.
- **Auto-update:** desligado por padrao nesta fase; so deve ser ligado quando existir fluxo real de release/publicacao.
- **XTTS v2:** continua pesado e dependente de `NVIDIA/CUDA`; nao faz parte da primeira experiencia obrigatoria.
- **MeloTTS:** fora do fluxo principal; a instalacao ainda nao e confiavel.
- **Downloads grandes:** continuam sujeitos a rate-limit externo.

---

## Documentacao e posicionamento publico

- [x] `README.md` reescrito para refletir o fluxo real do MVP local
- [x] Linguagem publica ajustada para um tom mais humano e inclusivo
- [x] Fluxograma Mermaid adicionado ao `README.md`
- [x] `package.json` alinhado com o repositorio real publicado no GitHub
- [x] Docs publicas e copy institucional alinhadas ao posicionamento atual do produto

---

## Proximo Foco Recomendado

1. Executar a trilha **Core** de `docs/BETA_PROGRAM.md` em maquina limpa.
2. Validar VB-Cable + Discord/Zoom em maquina limpa.
3. Definir um canal direto de suporte ao beta para testers nao tecnicos.
4. So depois decidir sobre beta ampliado, XTTS no pacote final e assinatura de codigo.
5. Na proxima retomada, usar `README.md` como entrada publica e `codex.md` como checkpoint operacional.

---

## Snapshot de Continuidade - 2026-05-12

### O que foi validado nesta retomada

- [x] `npm test` continua verde com **21/21** testes passando.
- [x] `npm run build` continua verde.
- [x] `npm run dist:win` foi reexecutado com sucesso nesta maquina.
- [x] O runtime empacotado em `dist/win-unpacked/VoiceLaunch TTS.exe` voltou a subir em execucao real.
- [x] O backend standalone respondeu novamente em `/health` com `{"status":"ok","version":"1.0.0"}`.

### O que foi corrigido nos checkpoints/docs

- [x] `codex.md` e `docs/BETA_PROGRAM.md` foram alinhados ao artefato atual gerado em `2026-05-12 17:45`.
- [x] O commit publicado correto em `origin/main` foi registrado como `0462a62`.
- [x] A URL de `GitHub Issues` em `docs/BETA_PROGRAM.md` foi corrigida para `https://github.com/skarL007/sound_voice/issues`.
- [x] `README.md`, `docs/HARNESS.md` e `AGENTS.md` foram alinhados ao path real de dados/logs do app empacotado: `%APPDATA%\\voicelaunch-tts\\`.

### Onde paramos no produto

- O escopo da proxima rodada foi restringido explicitamente para **manter o app como launcher/orquestrador**, sem virar uma UX separada por framework.
- O problema levantado pelo usuario para a proxima implementacao continua aberto e cobre:
  - catalogo real de vozes por framework, com idioma e genero quando o runtime souber informar;
  - feedback visual de `modelo carregando` e `modelo carregado`;
  - melhoria do layout da experiencia de fala;
  - configuracao de tecla/atalho para frases rapidas;
  - validacao mais forte do microfone virtual.
- **Nenhuma implementacao dessas features novas foi iniciada ainda** nesta rodada; a conversa parou na definicao do comportamento de carregamento de modelo no launcher.

### Decisao pendente para a proxima sessao

- Fechar qual sera o comportamento de carregamento de modelo no launcher:
  1. carregar automaticamente ao falar;
  2. exigir botoes explicitos de `Carregar` / `Descarregar`;
  3. suportar ambos.

### Observacao operacional

- O worktree local ficou com mudancas de documentacao ainda nao commitadas em `AGENTS.md`, `README.md`, `codex.md`, `docs/BETA_PROGRAM.md` e `docs/HARNESS.md`.
- A pasta `.superpowers/` apareceu apenas por causa do companion visual usado para brainstorming e deve ser tratada como artefato local, nao como estado funcional do produto.

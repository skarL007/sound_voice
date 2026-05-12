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
- **Artefato canonico desta rodada:** `dist/VoiceLaunch-TTS-Setup-1.0.0.exe`, gerado em `2026-05-12 03:16`.
- **Repositorio publicado:** `https://github.com/skarL007/sound_voice` em `main`, com `origin/main` sincronizado no commit `dbd9f6bb712c7beed3b249dae8930a98a874ec81`.

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
  VoiceLaunch-TTS-Setup-1.0.0.exe        <- 467,474,927 bytes
  VoiceLaunch-TTS-Setup-1.0.0.exe.blockmap
  latest.yml
  win-unpacked/
```

### Integridade do pacote beta atual

- **SHA-256:** `51CBB05DAA17A4F1333AB8E798E5157A64369D49DB3B6E31E5938508E3D5C2B9`
- **SHA-512:** `A52382BBD4A568CBA4F9CE5357D17E8157ECC366FCC52A9CE17A7167AE14828A485CF15578091B5A0ED7C24B6E7626677E48686E69195E0F8FF02E2ED40E302B`
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

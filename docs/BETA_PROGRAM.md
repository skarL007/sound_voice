# Programa de Beta - VoiceLaunch TTS

## Objetivo

Validar o fluxo real de comunicacao assistiva offline antes de qualquer abertura publica mais ampla. O beta atual existe para confirmar instalacao, primeira fala, persistencia, comunicador compacto e microfone virtual no estado real do MVP local.

## Escopo Atual do Beta

- **Trilha Core (obrigatoria):** Piper, Kokoro, frases rapidas, historico e rascunho persistentes, comunicador compacto, VB-Cable, Discord/Zoom e acessibilidade.
- **Trilha Advanced (opcional):** XTTS v2 e clonagem de voz apenas em maquinas com NVIDIA/CUDA validado.
- **Fora do beta principal:** MeloTTS, Fish Speech e Bark.

## Gates Antes de Convidar Testers Externos

- [x] `npm test` verde
- [x] `npm run build` verde
- [x] `npm run dist:win` gerando instalador atualizado e consistente com `latest.yml`
- [x] Runtime empacotado validado em `win-unpacked`
- [x] Fallback automatico de porta validado em runtime empacotado quando `9472` estava ocupado
- [ ] Validar o instalador em maquina Windows limpa
- [ ] Validar VB-Cable + Discord/Zoom em maquina limpa
- [ ] Definir pelo menos um canal direto de suporte para testers nao tecnicos alem de GitHub Issues

## Trilha 1 - Core Beta

### Instalacao

- [ ] Usar o instalador canonico em `dist/VoiceLaunch-TTS-Setup-1.0.0.exe`
- [ ] Instalar em Windows 10/11 sem Python preinstalado
- [ ] Confirmar que a UI abre imediatamente
- [ ] Confirmar que o backend Python sobe corretamente
- [ ] Registrar qualquer friccao no SmartScreen ou permissao inicial

### Primeira Fala Local

- [ ] Instalar um modelo **Piper**
- [ ] Digitar texto e falar com `Enter`
- [ ] Parar audio com `Ctrl+Shift+S`
- [ ] Ativar a opcao de manter texto apos falar
- [ ] Instalar **Kokoro**
- [ ] Alternar entre Piper e Kokoro e comparar tempo e resposta
- [ ] Ajustar velocidade e confirmar impacto esperado

### Comunicacao Assistiva

- [ ] Salvar pelo menos 3 frases rapidas personalizadas
- [ ] Usar os botoes de frases rapidas
- [ ] Usar `Ctrl+Shift+1..9` com frases salvas
- [ ] Abrir o comunicador compacto com `Ctrl+Shift+V`
- [ ] Falar pelo modo compacto
- [ ] Repetir uma frase recente a partir do historico
- [ ] Fechar e reabrir o app e confirmar persistencia de rascunho e historico

### Cenarios Reais

- [ ] Pedir ajuda usando uma frase salva
- [ ] Responder "sim" e "nao" em no maximo 2 interacoes
- [ ] Recuperar uma mensagem apos interrupcao de audio
- [ ] Repetir uma frase frequente sem redigitar tudo

### Microfone Virtual

- [ ] Instalar VB-Audio Virtual Cable
- [ ] Se o instalador nao estiver embutido no pacote, confirmar fallback para o site oficial
- [ ] Ativar o microfone virtual no app
- [ ] Confirmar que o dispositivo aparece na lista do Discord/Zoom
- [ ] Usar a fala sintetizada dentro do Discord ou Zoom

### Acessibilidade

- [ ] Testar navegacao apenas por teclado
- [ ] Testar alto contraste
- [ ] Testar fonte grande
- [ ] Testar foco visivel nas acoes principais
- [ ] Testar o comunicador compacto com frases salvas e recentes
- [ ] Testar com leitor de tela, se disponivel

### Observabilidade

- [ ] Registrar CPU/GPU durante sintese
- [ ] Registrar congelamentos, travamentos ou audio sem playback
- [ ] Anexar logs e passos de reproducao para qualquer falha relevante

## Trilha 2 - Advanced Beta

Executar apenas em maquinas com NVIDIA/CUDA validado. Falhas aqui nao bloqueiam o beta core.

- [ ] Baixar dependencias e modelo do **XTTS v2**
- [ ] Gravar 6-10 segundos de audio de referencia
- [ ] Clonar voz com XTTS v2
- [ ] Usar a voz clonada na TTS Page
- [ ] Registrar tempo de download, tempo de preparo e consumo de VRAM
- [ ] Confirmar se a feature agrega valor suficiente para continuar no pacote final

## Feedback

### Canal ativo hoje

- GitHub Issues: https://github.com/skarL007/sound_voice/issues

### Gate operacional ainda pendente

- Definir um canal direto real para testers nao tecnicos antes de abrir convites amplos.
- Os placeholders antigos de email e Discord foram removidos de proposito para evitar falsa prontidao operacional.
- Ignorar qualquer installer legado com espacos no nome que tenha sobrado localmente de builds anteriores; o pacote correto desta rodada e o arquivo hifenizado referenciado por `latest.yml`.

### Informacoes obrigatorias

```text
OS Version:
CPU:
RAM:
GPU:
Model tested:
Track tested: [Core / Advanced]
Issue type: [Bug / Feature Request / Performance / Accessibility]
Description:
Steps to reproduce:
Expected behavior:
Actual behavior:
Screenshots/logs (if applicable):
```

## Problemas Esperados no Beta

| Issue | Workaround | Impacto esperado |
|-------|-----------|------------------|
| Windows SmartScreen warning | Click em "More info" -> "Run anyway" | Esperado ate assinatura de codigo |
| XTTS v2 exige download grande | Deixar para a trilha Advanced | Nao bloqueia o beta core |
| Installer ainda nao assinado | Validar internamente antes de abrir publico amplo | Esperado no beta fechado |
| Auto-update desativado neste build | Validar update manualmente fora do beta fechado | Intencional nesta fase |
| MeloTTS/Fish Speech/Bark fora do fluxo principal | Testar Piper e Kokoro | Intencional |

## Manifesto do pacote atual

- **Arquivo canonico:** `dist/VoiceLaunch-TTS-Setup-1.0.0.exe`
- **Tamanho:** `467475211` bytes
- **SHA-256:** `A944D5D0F1697F76B3E94624F5C561C7D15A5AF2F5E14E05ABC3EC4927D35DF8`
- **Gerado em:** `2026-05-12 17:45` (America/Sao_Paulo)

## Proximo Gate de Produto

Nao abrir timeline publica de release ainda. O proximo gate real e:

1. Validar o instalador novo em maquina limpa.
2. Rodar a trilha Core de ponta a ponta.
3. Definir canal direto de suporte ao beta.
4. So depois decidir sobre beta ampliado, XTTS no pacote e assinatura de codigo.

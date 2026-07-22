# Microfone Virtual - Guia Tecnico

## Como Funciona

O VoiceLaunch TTS usa o **VB-Audio Virtual Cable** para rotear o audio gerado como se fosse um microfone real. Isso permite levar a voz sintetizada para qualquer aplicativo compativel com entrada de microfone, como Discord, Zoom e jogos.

## Arquitetura

```text
[VoiceLaunch TTS] --audio--> [CABLE Input (VB-Audio)]
                                     |
                                     v
                           [CABLE Output (Virtual Mic)]
                                     |
                                     v
                         [Discord / Zoom / Jogos]
```

## Instalacao

### Pelo app (recomendado)
1. Abra a tela **Falar** (ou **Ajustes > Microfone Virtual**).
2. Se o VB-Cable nao for detectado, clique em **Instalar microfone virtual**.
3. O launcher baixa o instalador oficial da VB-Audio com barra de progresso, extrai o pacote e abre o instalador. Se o `VBCABLE_Setup.exe` ja vier embutido no pacote, ele e usado direto, sem download.
4. No instalador do VB-Cable, clique em **Install Driver**. Se ele pedir, reinicie o Windows.
5. Volte ao VoiceLaunch TTS e clique em **Verificar instalacao** (re-detecta sem reiniciar o app).
6. Quando aparecer **VB-Cable detectado**, clique em **Ativar microfone virtual**.

Se o download automatico falhar (rede ou URL indisponivel), o launcher abre o site oficial para download manual.

> Origem: **VB-Cable da VB-Audio** (donationware) — https://vb-audio.com/Cable/. O download/redistribuicao e permitido mantendo a origem visivel ao usuario.

### Manual
1. Baixe em: https://vb-audio.com/Cable/
2. Extraia o ZIP e execute `VBCABLE_Setup_x64.exe` (ou `VBCABLE_Setup.exe` em 32-bit)
3. Reinicie o computador

## Configuracao nos Aplicativos

### Discord
1. Configuracoes de Usuario > Voz e Video
2. Dispositivo de Entrada: **CABLE Output**
3. Desative "Supressao de Ruido" e "Cancelamento de Eco" para melhor qualidade

### Zoom
1. Configuracoes > Audio
2. Microfone: **CABLE Output**
3. Desmarque "Suprimir ruido de fundo"

### Jogos
1. Configuracoes de Audio ou Voz
2. Microfone: **CABLE Output**

## Modos de Operacao

### Push to Talk (PTT)
- O TTS so e enviado ao microfone virtual quando voce segura uma tecla configurada
- Util para evitar transmissao acidental

### Always On
- Todo audio gerado vai direto ao microfone virtual
- Recomendado para conversacao continua

## Merge com Microfone Real

Para usar TTS e fala real simultaneamente, instale **VoiceMeeter Banana**:
1. Configure o microfone real no input 1
2. Configure CABLE Output no input 2
3. Selecione VoiceMeeter Output como microfone no aplicativo

## Solucao de Problemas

| Problema | Solucao |
|----------|---------|
| Nenhum som no app | Verifique se CABLE Output esta selecionado como microfone |
| So ouco eco | Desative "Listen to this device" no Painel de Controle de Som |
| Qualidade ruim | Aumente a taxa de amostragem do VB-Cable para 48000 Hz |
| Delay alto | Use modelos leves como Piper e Kokoro em modo CPU |

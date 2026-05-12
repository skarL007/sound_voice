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

### Pelo app
O app tenta abrir o instalador embutido quando ele estiver presente no pacote. Se esse instalador nao estiver disponivel, o fluxo oficial e abrir o site do VB-Audio para instalacao manual.

### Manual
1. Baixe em: https://vb-audio.com/Cable/
2. Execute `VBCABLE_Setup.exe`
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

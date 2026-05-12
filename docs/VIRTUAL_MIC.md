# Microfone Virtual — Guia Técnico

## Como Funciona

O VoiceLaunch TTS usa o **VB-Audio Virtual Cable** para rotear o áudio gerado como se fosse um microfone real. Isso permite que pessoas com deficiência na fala usem o TTS em qualquer aplicativo (Discord, Zoom, jogos, etc.).

## Arquitetura

```
[VoiceLaunch TTS] --audio--> [CABLE Input (VB-Audio)]
                                     |
                                     v
                           [CABLE Output (Virtual Mic)]
                                     |
                                     v
                         [Discord / Zoom / Jogos]
```

## Instalação

### Automática (recomendada)
O instalador NSIS do VoiceLaunch inclui o VB-Cable e o instala silenciosamente.

### Manual
1. Baixe em: https://vb-audio.com/Cable/
2. Execute `VBCABLE_Setup.exe`
3. Reinicie o computador

## Configuração nos Aplicativos

### Discord
1. Configurações de Usuário > Voz e Vídeo
2. Dispositivo de Entrada: **CABLE Output**
3. Desative "Supressão de Ruído" e "Cancelamento de Eco" para melhor qualidade

### Zoom
1. Configurações > Áudio
2. Microfone: **CABLE Output**
3. Desmarque "Suprimir ruído de fundo"

### Jogos (geral)
1. Configurações de Áudio/Voz
2. Microfone: **CABLE Output**

## Modos de Operação

### Push to Talk (PTT)
- O TTS só é enviado ao microfone virtual quando você segura uma tecla configurada
- Útil para evitar transmissão acidental

### Always On
- Todo áudio gerado vai direto ao microfone virtual
- Recomendado para conversação contínua

## Merge com Microfone Real

Para usar TTS e fala real simultaneamente, instale **VoiceMeeter Banana** (gratuito):
1. Configure o microfone real no input 1
2. Configure CABLE Output no input 2
3. Selecione VoiceMeeter Output como microfone no aplicativo

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Nenhum som no app | Verifique se CABLE Output está selecionado como microfone |
| Só ouço eco | Desative "Listen to this device" no Painel de Controle de Som |
| Qualidade ruim | Aumente a taxa de amostragem do VB-Cable para 48000 Hz |
| Delay alto | Use modelos leves (Piper, Kokoro) em modo CPU |

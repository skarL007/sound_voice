# VB-Audio Virtual Cable

Para habilitar a instalação automática do VB-Cable no VoiceLaunch TTS:

1. Baixe o **VBCABLE_Setup.exe** em: https://vb-audio.com/Cable/
2. Coloque o arquivo `VBCABLE_Setup.exe` nesta pasta (`assets/vbcable/`)
3. Rebuild o app com `npm run dist:win`

O instalador será incluído no pacote final e poderá ser executado automaticamente
pelo usuário através do botão "Instalar Automaticamente" em Configurações > Microfone Virtual.

> Nota: A instalação do driver requer privilégios de administrador no Windows.

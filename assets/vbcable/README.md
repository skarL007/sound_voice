# VB-Audio Virtual Cable

O VoiceLaunch TTS instala o VB-Cable de duas formas, nesta ordem de preferencia:

1. **Embutido (opcional, offline):** se `VBCABLE_Setup_x64.exe` (e/ou `VBCABLE_Setup.exe`)
   estiver nesta pasta, o launcher o usa direto, sem baixar nada.
2. **Download automatico (padrao):** se nao houver instalador embutido, o launcher baixa
   o pacote oficial da VB-Audio com barra de progresso, extrai e abre o instalador. O usuario
   clica em **Instalar microfone virtual** na tela **Falar** ou em **Configuracoes > Microfone Virtual**.

## Para embutir o instalador (opcional)

1. Baixe o pacote em: https://vb-audio.com/Cable/
2. Extraia o ZIP e coloque `VBCABLE_Setup_x64.exe` (e/ou `VBCABLE_Setup.exe`) nesta pasta.
3. Rebuild com `npm run dist:win` — o `electron-builder.yml` ja copia esta pasta para `resources/vbcable/`.

A URL e a versao usadas no download automatico ficam em `src/main/app-config.ts` (`VBCABLE_DOWNLOAD`).
Ao sair um novo driver pack, atualize a URL la (e o `sha256`, se quiser fixar a verificacao de integridade).

> VB-Cable da VB-Audio e **donationware** (https://vb-audio.com/Cable/); baixar/redistribuir e
> permitido mantendo a origem visivel ao usuario. A instalacao do driver requer privilegios de
> administrador no Windows (o app ja roda elevado).

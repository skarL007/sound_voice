---
description: Verificação completa do VoiceLaunch TTS — tsc, vitest, build e (opcional) smoke do backend empacotado.
---
Execute, em ordem, e reporte o resultado de cada passo com evidência real (não afirme sucesso sem a saída):

1. `npx tsc --noEmit` — esperado 0 erros.
2. `npx vitest run` — esperado tudo verde; relate a contagem.
3. `npm run build` — esperado exit 0.
4. (Opcional, se houver pacote em `dist/`) `.\scripts\smoke-packaged-backend.ps1 -Port 9482` — backend responde `/health` e `/models`.

Se algo falhar, PARE e reporte o erro exato (arquivo:linha) antes de continuar. Não tente consertar sem confirmar a causa-raiz primeiro.

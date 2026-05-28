---
description: Resume o estado do VoiceLaunch TTS — lê codex.md + estado git e diz onde paramos.
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git rev-list:*), Read
---
Você vai produzir um resumo objetivo de "onde paramos" no VoiceLaunch TTS.

Contexto git atual:
- Status: !`git status -s`
- À frente de origin/main: !`git rev-list --count origin/main..HEAD`
- Atrás de origin/main: !`git rev-list --count HEAD..origin/main`
- Últimos commits: !`git log --oneline -10`

Agora:
1. Leia `codex.md` (fonte de verdade operacional) — foque nos snapshots de continuidade mais recentes e na seção de pendências.
2. Cruze com o estado git acima.
3. Produza, conciso e específico: (a) último entregue, (b) pendências reais, (c) próximo passo recomendado.

NÃO invente trabalho que não esteja no repo. Se o pedido do usuário citar features que não existem aqui (ex: Stripe/Kiwify/webhooks), avise que isso não pertence a este repositório.

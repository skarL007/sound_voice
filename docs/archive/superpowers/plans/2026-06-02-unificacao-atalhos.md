# Plano — Unificar e redesenhar a criação de atalhos (card-driven)

> Gerado em 2026-06-02 por auditoria multi-agente (arquitetura + pendências + síntese).
> Pedido: criar atalho clicando no card da área de Frases Rápidas (escrever → "criar atalho"; "testar" → editar; melhorar como o texto é mostrado).

## Veredito
A UX que você quer **já existe** — só que na tela errada (`VoiceShortcutsPage`, com card editável on-blur + "Testar"). O trabalho real **não é construir do zero**: é **levar essa UI para a área de Frases Rápidas** (tela Falar) e **acabar com a duplicação de modelo de dados**. Baixo risco e alto retorno *se unificar primeiro*; médio risco se tentar manter os dois.

## 🔑 Decisão: UNIFICAR em `voiceShortcuts`
Hoje há **dois conceitos sobrepostos** para a mesma intenção:
- `quickPhrases: string[]` (só texto, sem voz/tecla por item) — tela Falar;
- `voiceShortcuts: {id, hotkey, voice, text, speed, enabled}` (rico) — tela Atalhos, com CRUD + persistência + re-registro de tecla **já prontos**.

O que você pediu **é exatamente o `VoiceShortcut`**. Então: os cards de Frases Rápidas passam a ler/escrever `voiceShortcuts`, e `quickPhrases` é aposentado (com migração). Criar um 3º modelo ou enriquecer `quickPhrases` = mais trabalho e mais risco, sem ganho.

## ⚠️ Achados críticos (confirmados no código)
1. **Colisão de `Ctrl+Shift+1..9`** — o main registra esses 9 slots **fixos** para `quickPhrases` no boot ([main/index.ts:224](src/main/index.ts:224)), e os mesmos slots são válidos para `voiceShortcuts` ([voiceShortcuts.ts:4](src/renderer/src/utils/voiceShortcuts.ts:4)). Resultado: todo atalho de voz nesses slots cai em "conflicted" e **nunca dispara**. → **Resolver ANTES de mexer na UI** (senão os atalhos novos nascem mortos).
2. **Dupla fonte de verdade** + **corrida de escrita** (dois writers no mesmo `settings`, debounce 250ms vs 300ms).
3. **Migração não-trivial**: `quickPhrases` também vive em `profiles[].quickPhrases`; cap de 12 vs 9 slots Ctrl+Shift.

## Fluxo proposto (card-driven)
1. **Card vazio**: placeholder clicável "+ Criar atalho" com a tecla sugerida (`suggestNextHotkey`) em destaque.
2. **Escrever**: textarea inline no card ("O que dizer ao apertar o atalho?"). Voz herda a `cloudVoice` atual; tecla = próxima livre. Ctrl+Enter confirma.
3. **Criar atalho**: botão no card → `addVoiceShortcut(...)` (já persiste e re-registra a tecla) → toast "Atalho criado: Ctrl+Shift+N".
   - **Voz nula**: usar a 1ª voz pt-BR como fallback (1 clique); só bloquear se a lista ainda não carregou.
4. **Card criado**: título = `deriveName(text)`, frase em line-clamp-2, badge da **voz** e da **tecla real** (`formatHotkeyDisplay`).
5. **Testar → editar**: "Testar" toca a frase **e** abre o textarea para editar; commit on-blur → `updateVoiceShortcut` (re-registra a tecla).
6. **Disparo global**: a tecla envia `global:speak-voice-shortcut` (caminho `speak-quick-phrase` é aposentado).

## Design proposto (como o texto é mostrado — item 5)
- **Hierarquia**: título forte (`deriveName`) + frase em `line-clamp-2` (cor `ink-soft`) — dá pra escanear sem ler tudo.
- **Badge de tecla real** (`formatHotkeyDisplay`) no lugar do número posicional.
- **Badge de voz** (`cleanVoiceName` + F/M) — hoje o card não mostra voz.
- **Remover o rótulo "Command pad"** (ruído).
- Estado `enabled` visível (opacity + toggle); glow no disparo; aplicar o mesmo polish ao **CompactView**.
- Empty-state: "Clique num card para criar seu primeiro atalho".

## Roadmap
| Fase | Objetivo | Esforço |
|------|----------|---------|
| **0** | **Resolver a colisão de hotkeys** (eleger `voiceShortcuts` dono de Ctrl+Shift+1..9; remover registro fixo de `quickPhrases`) — pré-requisito | S |
| **1** | Extrair `ShortcutCard`/`VoiceSelect`/`HotkeySelect` + `handleAdd`/`handleTest` para componentes/hook compartilhados | M |
| **2** | Cards da tela Falar passam a criar/editar `voiceShortcuts` (fluxo + design acima) + CompactView | M/L |
| **3** | Migração `quickPhrases → voiceShortcuts` (idempotente, versionada, preserva legado) | M |
| **4** | Convergência de UI/copy (decidir /shortcuts como visão avançada ou remover; cheatsheet; copy online) | S |
| **5** | Testes dos fluxos novos (dispatch, reregister, migração) | M |
| **6** | Limpeza do caminho local morto (`{false ? ...}` em TTSPage; rotas /models /clone) | S |
| **7** | Fechar a branch (bump Electron 36→42, rebuild python_dist, push + PR, codex) | M |

## Pendências gerais do projeto (além do redesign)
- Código morto do caminho **local** ([TTSPage.tsx:533](src/renderer/src/pages/TTSPage.tsx:533) `{false ? ...}`; rotas /models /clone).
- **Copy desatualizada** ("100% Offline", "Piper+Kokoro") vs foco online.
- **python_dist defasado** (exe 2026-05-15 sem a Fase 2 do roteamento).
- **Branch sem push** (18 commits) + bump Electron major no working tree.
- **Zero testes** do dispatch/reregister de atalhos.

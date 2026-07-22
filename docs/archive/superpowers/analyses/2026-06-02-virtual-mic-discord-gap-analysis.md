# Análise de Gaps — Microfone Virtual no Discord com Download/Instalação Automática

> Gerado em 2026-06-02 por auditoria multi-agente (7 dimensões em paralelo + síntese).
> Objetivo do usuário: o microfone virtual (VB-Cable) precisa **funcionar no Discord**, com **download e instalação automática** pelo launcher (mínimo de passos manuais).
>
> **Status (2026-06-02): Fases 1–3 IMPLEMENTADAS e verificadas** — caminho escolhido: *download automático no app + 1 clique* (Opção 2). `tsc` limpo, 124/124 testes, build OK, Python OK. **Pendente:** Fase 4 (validação em máquina limpa + critérios de aceite), fixar SHA-256 do ZIP, assinatura de código (SmartScreen).

---

## Veredito

O projeto está a **meio caminho do escopo aprovado** (abrir instalador embutido + verificar detecção) e **longe do objetivo ampliado** (download + instalação automática).

- **0% do plano `2026-06-02-virtual-mic-installer.md` foi implementado** — `virtualMicSetup.ts` e `VirtualMicSetupPanel.tsx` não existem.
- **Bloqueador raiz é físico:** `assets/vbcable/` contém **apenas `README.md`** — o `VBCABLE_Setup.exe` não está no repo. Por isso o launcher **nunca instala nada** hoje.
- **Boa notícia:** há muita infraestrutura reaproveitável — `download-manager.ts` completo (progresso/checksum/anti-SSRF), hook NSIS `installer.nsh` que **já tenta instalação silenciosa `/S`**, e `requireAdministrator` já ligado. O caminho semi-automático é alcançável em poucos dias.

## Por que o mic NÃO chega ao Discord hoje

1. **Instalação:** o botão "Tentar instalador do pacote" ([SettingsPage.tsx](src/renderer/src/pages/SettingsPage.tsx)) **sempre** cai no fallback de abrir vb-audio.com, porque `getBundledVBCableInstallerCandidates()` ([app-config.ts:30](src/main/app-config.ts:30)) nunca encontra o `.exe` ([ipc-handlers.ts:354](src/main/ipc-handlers.ts:354)).
2. **NSIS:** o hook [installer.nsh:6](build/installer.nsh:6) já roda `VBCABLE_Setup.exe /S` durante o setup, mas é inócuo pela mesma ausência do `.exe`.
3. **Roteamento backend:** [virtual_mic.py:11](src/python/virtual_mic.py) detecta o cabo **só no `__init__`** e nunca re-escaneia — após instalar, é preciso **reiniciar o app inteiro** ou o áudio cai no dispositivo padrão.
4. **Sample rate:** [virtual_mic.py:34](src/python/virtual_mic.py) envia áudio no rate do engine (Piper 22050 / Kokoro 24000) direto ao CABLE, que opera a 48000 Hz → risco de rejeição de stream ou pitch shift.
5. **Feedback falso:** `/play` retorna `{success:True}` mesmo quando caiu no fallback do speaker ([virtual_mic.py:36](src/python/virtual_mic.py)) — o usuário vê "sucesso" sem o som ter ido ao Discord.

---

## Bloqueadores (deduplicados)

| # | Bloqueador | Esforço | Só se download? |
|---|-----------|---------|-----------------|
| B1 | **`VBCABLE_Setup.exe` ausente** do repo (`assets/vbcable/` só tem README). Desbloqueia também o NSIS `/S`. | P | Não — raiz de tudo |
| B2 | **Plano aprovado 0% implementado** — `virtualMicSetup.ts`/`VirtualMicSetupPanel.tsx` + testes não existem; SettingsPage/TTSPage seguem ad-hoc. | M | Não |
| B3 | **Backend sem re-detecção em runtime** — falta `POST /mic/refresh` (ou re-scan em `/mic/route`); a re-detecção da UI é ilusória sem isso. | P | Não |
| B4 | **`download-manager` não generalizável** — `ModelDownloadTask` tem `modelId` obrigatório e emite eventos `model:download:*`. Precisa extrair `downloadFileWithProgress(task, eventPrefix, window)`. | P | Sim |
| B5 | **Canais IPC/preload/tipos de download inexistentes** para VB-Cable (`mic:download-vb-cable`, eventos de progresso, métodos no preload, tipos em `shared/types.ts`). | M | Sim |
| B6 | **Testes automatizados zerados** para o fluxo (detecção, componente, handler `mic:install-vb-cable`). Os 6 casos da spec não foram escritos. | P–M | Não |

---

## Decisão de Automação (o ponto central)

A spec aprovada em [2026-06-02-virtual-mic-installer-design.md](docs/superpowers/specs/2026-06-02-virtual-mic-installer-design.md) coloca **explicitamente fora de escopo** a "instalação silenciosa" e o "download automático". O pedido do usuário é o **oposto**. Além disso, há **incoerência**: o hook `installer.nsh:6` **já viola a spec** ao tentar `/S`. Atender o pedido exige uma **nova spec que supersede a de 2026-06-02**.

### Opção 1 — Embutido + abrir instalador (escopo da spec atual)
- **Como:** adicionar o `.exe` em `assets/vbcable/`; botão chama `installVBCable()` → `spawn` do instalador oficial; usuário clica "Install Driver" (1–2 cliques) + reinício se pedido. UI guia com "Instalador aberto" + "Verificar instalação".
- **Viabilidade:** **ALTA** (técnica e legal). Donationware permite redistribuição com crédito visível. `requireAdministrator` já garante elevação. Sem dependência de rede. Plano pronto para copiar.
- **Riscos:** não é "automático" — usuário ainda vê o diálogo do instalador. Exige binário no git (`.gitattributes` binary) + SHA-256 fixado.

### Opção 2 — Download automático + lançar instalador (semi-automático, 1 confirmação) — *alvo recomendado*
- **Como:** não embute; novo handler reaproveita `download-manager.ts` (refatorado p/ genérico), baixa de URL estável da VB-Audio com **barra de progresso real**, valida SHA-256, faz `spawn`. Usuário dá 1 confirmação. Re-detecta via `/audio/devices`.
- **Viabilidade:** **MÉDIA**. Infra de download já é robusta. Obstáculos: (a) vb-audio.com **não expõe link direto estável** — vem como **ZIP** (`VBCABLE_Driver_PackXX.zip`) exigindo extração (yauzl/adm-zip) que o projeto não tem; (b) sem SHA-256 oficial publicado → manter hash manualmente por versão.
- **Riscos:** URL pode quebrar a cada release; manutenção recorrente; ainda exige 1 clique.

### Opção 3 — Download + instalação silenciosa (totalmente automático)
- **Como:** como a 2, mas `spawn` com `/S` e aguarda exit code; re-detecta em loop. Zero cliques. (O NSIS `installer.nsh` já faz isso **durante o setup do launcher**.)
- **Viabilidade:** **BAIXA–MÉDIA, FRÁGIL**. VB-Audio **não documenta `/S` oficialmente**; varia entre versões e pode quebrar sem feedback. Alternativa `pnputil` tem licença incerta. Driver ainda costuma exigir **reinício do Windows**.
- **Riscos:** regressão silenciosa; executar binário baixado com admin sem verificar assinatura Authenticode; conflito direto com a spec.

### Recomendação

**Entregar a Opção 1 primeiro (base obrigatória), perseguir a Opção 2 como alvo.** Variante pragmática mais forte: como o `installer.nsh` **já tem o `/S` codificado**, embutir o `.exe` faz a **instalação acontecer silenciosamente no setup do launcher** (Opção 3 no momento mais seguro — durante o NSIS elevado), com a UI da Opção 1 como rede de segurança. A **Opção 3 em runtime** deve ficar atrás de flag opt-in, validada em VM limpa, nunca como padrão.

---

## Roadmap

### Fase 0 — Decisão de escopo e desbloqueio físico (P)
- Decidir o nível de automação; redigir nova spec que supersede a de 2026-06-02.
- Resolver a incoerência do `installer.nsh:6` (`/S`): validar em VM limpa ou remover até validar.
- Baixar o `VBCABLE_Setup.exe` oficial, calcular/registrar SHA-256, colocar em `assets/vbcable/`, marcar binary no `.gitattributes`. (`electron-builder.yml:17` já copia a pasta.)

### Fase 1 — Implementar o plano aprovado / Opção 1 (M)
- `src/renderer/src/utils/virtualMicSetup.ts` — `detectVBCable()` + `resolveVBCableInstallState()` (Tasks 1–2).
- `src/renderer/src/components/VirtualMicSetupPanel.tsx` — estados idle/launched/manual/detected (Task 3).
- `TTSPage.tsx` — CTA "Instalar microfone virtual" quando ausente + `loadMicDevices()` no `useEffect` + estado `vbCableDetected` (Task 4).
- `SettingsPage.tsx` — integrar o painel + botão "Verificar instalação" (re-detecção sem reiniciar).
- Escrever os 6 testes da spec.

### Fase 2 — Corrigir o backend Python de roteamento (M)
- `POST /mic/refresh` (ou re-scan em `/mic/route`) → fecha B3.
- `GET /mic/status` retornar `{enabled, available, deviceName}`.
- Resamplear para 48000 Hz antes do `sd.play(device=cable)`.
- Alinhar regra de detecção com o spec (`'cable'`), remover `break` prematuro, tratar locales.
- Reportar fallback no `/play` (`routedToVirtualMic`, `fallbackReason`).

### Fase 3 — Download automático semi-automático / Opção 2 (G)
- Refatorar `download-manager.ts` → `downloadFileWithProgress(task, eventPrefix, window)` genérico (wrapper mantém `downloadModelWithProgress`).
- Fixar `VBCABLE_DOWNLOAD_URL` + SHA-256 em `app-config.ts`.
- Pipeline de extração de ZIP (yauzl/adm-zip) + seleção por `process.arch`.
- Handler `mic:download-vb-cable` + eventos + preload + tipos.
- Barra de progresso no painel + tela de atribuição donationware **antes** do download.
- Re-detecção pós-instalação em loop com retry → evento `mic:vbcable:detected`.

### Fase 4 — Validação clean-machine, prova no Discord, empacotamento (G)
- Critérios de aceite mensuráveis em `docs/BETA_PROGRAM.md` (sinal no medidor do Discord, latência tolerada).
- Rodar o roteiro completo em VM Windows limpa.
- Validar `/S` em VM limpa se a Opção 3 for considerada.
- Estender `scripts/smoke-packaged-backend.ps1` (checar `/audio/devices` e `/mic/status`).
- Assinatura de código (EV; template em `docs/CODE_SIGNING.md`) + `.github/workflows/release.yml`.

---

## Apêndice — Inventário do que JÁ funciona

- IPC `mic:install-vb-cable` + preload `installVBCable()` + `getBundledVBCableInstallerCandidates()` (só falta o `.exe`).
- `download-manager.ts`: HTTPS-only, redirects (≤5), checksum SHA-256, progress (percent/speed/ETA), cancel via AbortController.
- `installer.nsh`: customInstall com checagem HKLM + `/S` (instalação silenciosa no setup).
- `electron-builder.yml`: `assets/vbcable/` → `resources/vbcable/`; `requireAdministrator`.
- Backend: `/mic/route`, `/mic/status`, `/audio/devices`; roteamento `play_to_virtual_mic` com fallback.
- UI: `DiscordReadyBanner` ("Testar agora"), `DiscordVRChatGuide`, `AudioOutputPicker` (detecta/destaca CABLE).
- Testes: `download-manager.test.ts` (5 cenários), `security-utils.test.ts` (allowlist vb-audio.com).

# Remove cloudAudio Debug Console Statements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar 4 `console.log` de debug do `cloudAudio.ts` do renderer, mantendo os 3 `console.warn`/`console.error` de erro que são consistentes com o padrão existente no codebase.

**Architecture:** O `src/main/logger.ts` usa `fs` + `app` do Electron e é inacessível no renderer. O preload não expõe canal IPC de escrita de logs. O padrão já estabelecido no renderer (`ClonePage.tsx`, `useCommunicationSettings.ts`) é usar `console.error` direto para erros — mantemos esse padrão. Os 4 `console.log` são traces de desenvolvimento sem valor em produção e devem ser removidos.

**Tech Stack:** TypeScript, Electron renderer, sem dependências novas.

---

## Inventory de Statements

| Linha | Tipo | Ação | Motivo |
|-------|------|------|--------|
| 54 | `console.warn` | **Manter** | Erro real: `play()` falhou — útil em produção |
| 68 | `console.error` | **Manter** | Erro real: `decodeAudioData` falhou |
| 107 | `console.error` | **Manter** | Erro real: play do MediaStream falhou |
| 132-135 | `console.log` + variável `headHex` | **Remover** | Debug trace: header hex dos bytes recebidos |
| 141 | `console.log` | **Remover** | Debug trace: confirmação de sucesso via blob URL |
| 150 | `console.log` | **Remover** | Debug trace: confirmação de sucesso via data URL |
| 157 | `console.log` | **Remover** | Debug trace: confirmação de sucesso via Web Audio API |

---

## File Structure

- **Modify:** `src/renderer/src/utils/cloudAudio.ts`
  - Remover bloco `headHex` (linhas 132–135) e 3 `console.log` de confirmação de sucesso.
  - Não criar novos arquivos; não alterar logger principal.

---

### Task 1: Remover os 4 console.log de debug do cloudAudio.ts

**Files:**
- Modify: `src/renderer/src/utils/cloudAudio.ts:128-160`

- [ ] **Step 1: Remover bloco headHex + console.log de recepção (linhas 132–135)**

  Localizar em `playCloudAudio()` o bloco:
  ```typescript
  const headHex = Array.from(bytes.slice(0, 8))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
  console.log(`[cloudAudio] received ${bytes.length} bytes, mime=${mimeType}, head: ${headHex}`)
  ```
  Remover as 4 linhas inteiras. A variável `headHex` não é usada em nenhum outro lugar.

- [ ] **Step 2: Remover console.log de confirmação blob URL (linha 141)**

  Localizar dentro do bloco `if (await tryPlayWithUrl(blobUrl, ...))`:
  ```typescript
  console.log('[cloudAudio] playback OK via blob URL')
  ```
  Remover a linha, mantendo o `return` imediatamente após.

- [ ] **Step 3: Remover console.log de confirmação data URL (linha 150)**

  Localizar dentro do bloco `if (await tryPlayWithUrl(dataUrl, ...))`:
  ```typescript
  console.log('[cloudAudio] playback OK via data URL')
  ```
  Remover a linha, mantendo o `return` imediatamente após.

- [ ] **Step 4: Remover console.log de confirmação Web Audio API (linha 157)**

  Localizar dentro do bloco `if (await tryPlayWithWebAudio(...))`:
  ```typescript
  console.log('[cloudAudio] playback OK via Web Audio API')
  ```
  Remover a linha, mantendo o `return` imediatamente após.

- [ ] **Step 5: Verificar que nenhum console.log permaneceu**

  Run: `grep -n "console\.log" src/renderer/src/utils/cloudAudio.ts`
  Expected: nenhuma saída (exit 0, sem linhas)

- [ ] **Step 6: Verificar que console.warn e console.error foram preservados**

  Run: `grep -n "console\." src/renderer/src/utils/cloudAudio.ts`
  Expected:
  ```
  54:    console.warn(`[cloudAudio] play() falhou para ${mimeType}:`, err)
  68:    console.error('[cloudAudio] decodeAudioData falhou:', err)
  107:      console.error('[cloudAudio] play() do MediaStream falhou:', err)
  ```

- [ ] **Step 7: Build para verificar que não quebrou TypeScript**

  Run: `npm run typecheck` (ou `npx tsc --noEmit`)
  Expected: 0 erros

- [ ] **Step 8: Commit**

  ```bash
  git add src/renderer/src/utils/cloudAudio.ts
  git commit -m "chore(renderer): remove debug console.log statements from cloudAudio

  Remove 4 development-only console.log traces (bytes received, playback
  strategy confirmations). The headHex variable that was only used by the
  removed log is also deleted.

  console.warn and console.error are kept — they signal real errors and
  are consistent with the renderer's existing logging pattern."
  ```

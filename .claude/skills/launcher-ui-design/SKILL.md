---
name: launcher-ui-design
description: Use when building or editing any UI in the VoiceLaunch TTS renderer (src/renderer) — pages, components, layout, styling, design tokens. Enforces dense launcher ergonomics, the sober/accessible design-v2 visual language, and popover/modal/toast/optimistic-UI patterns. Trigger on any React/Tailwind/CSS change in this repo.
---

# Launcher UI Design — VoiceLaunch TTS

You are shaping a **desktop launcher** (Electron + React + Tailwind), not a website. Density and legibility win over spectacle. The app serves two audiences at once — **assistive communication** users (need calm, contrast, legibility) and **gamers/Discord** users — so the bar is: looks intentional, reads effortlessly.

## Visual language (design v2 — sober, not neon)
- Calm neutral dark surfaces (slate/zinc family), layered by lightness + 1px border + soft shadow. NO glassmorphism blur, NO scanlines, NO neon text-glow, NO animated gradient text, NO HUD corner glints.
- Color with purpose: ONE brand accent (violet/indigo) for primary action + active nav only. Cyan = "live/transmitting" state only. Don't paint chrome with the accent.
- Modest radius (rounded-lg/xl); elevation via soft shadow, never glow.
- Canonical tokens live in `tailwind.config.js` (`theme.extend.colors`/`fontSize`) and `src/renderer/src/index.css` (`:root` vars + `@layer components`). Read them before adding styles; reuse tokens, never hardcode hex when a token exists.

## Density & layout
- Page headings ≤ 24px (`text-page`); use the semantic type scale (caption/label/body/ui/heading/title/page/hero), never raw landing-page sizes.
- Consistent spacing; avoid needless whitespace/scroll. Prefer a strict grid.
- Sidebar is the backbone: grouped links, a CLEAR active state, settings/help pinned to the bottom.
- Most important info at the top of each view.

## Interaction patterns
- **Popover** (non-blocking) for quick contextual actions (filters, display toggles); click-outside dismisses.
- **Modal** (blocking) ONLY for focused create/edit flows needing Save/Cancel.
- **Tabs** to split complex settings of one entity.
- **Toasts** (`toastStore`) for success/error confirmations.
- **Optimistic UI**: update the view immediately on create/delete (history items, quick phrases, voices), then reconcile with the backend.
- Reveal row actions (edit/delete) on hover; support bulk actions with checkboxes where lists grow long.

## Accessibility (non-negotiable here)
- Keep the **Atkinson Hyperlegible** font.
- Maintain and re-verify `:focus-visible` rings, `.high-contrast`, `.large-font`, `prefers-reduced-motion`.
- Target WCAG AA contrast (4.5:1 body text, 3:1 large/UI) on every new surface/text pairing.
- Motion is functional only (hover/press 150–200ms); no infinite loops.

## Before you finish
- `npx tsc --noEmit` clean.
- Walk the change in `npm run dev` at 1280×800 AND compact 480×420.
- Toggle high-contrast + large-font; confirm nothing breaks.

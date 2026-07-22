# Tech Noir Accessible Core Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o redesign visual `tech noir acessivel` ao nucleo do VoiceLaunch TTS sem alterar o comportamento funcional do launcher.

**Architecture:** O redesign fica concentrado no renderer e reaproveita a estrutura atual do app. A base visual e modernizada em `tailwind.config.js` e `index.css`, depois o shell, Home, `LocalSetupCard`, TTS e modo compacto recebem a nova composicao usando os mesmos dados e fluxos ja existentes.

**Tech Stack:** Electron 35, React 19, TypeScript, Tailwind CSS, Zustand, Vitest, Lucide React.

---

### Task 1: Preparar os tokens visuais e a base de estilo

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/renderer/src/index.css`

- [ ] **Step 1: Registrar a nova paleta e animacoes no Tailwind**

Adicionar o conjunto novo de cores e animacoes sem remover o que ainda e usado pelo app.

```js
// tailwind.config.js
extend: {
  colors: {
    brand: {
      50: '#ECFCFF',
      100: '#CFF8FF',
      200: '#A5F0FF',
      300: '#74E8FF',
      400: '#49E6FF',
      500: '#1FD0F0',
      600: '#10A6C5',
      700: '#117D95',
      800: '#125E71',
      900: '#103F4C',
    },
    ember: {
      100: '#FFE2D6',
      300: '#FFB291',
      500: '#FF8A5B',
      600: '#F06B34',
      700: '#BF4E20',
    },
    chrome: {
      950: '#06090D',
      900: '#0C1219',
      850: '#111A24',
      800: '#16212D',
      700: '#1B2836',
      600: '#243446',
      500: '#33506B',
    },
    signal: {
      success: '#61E4A3',
      warning: '#FFC15A',
      danger: '#FF6B7D',
    },
  },
  animation: {
    'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    'glow-soft': 'glow-soft 2.6s ease-in-out infinite',
    'lift-in': 'lift-in 240ms ease-out both',
  },
  keyframes: {
    'glow-soft': {
      '0%, 100%': { boxShadow: '0 0 0 rgba(73,230,255,0)' },
      '50%': { boxShadow: '0 0 24px rgba(73,230,255,0.22)' },
    },
    'lift-in': {
      from: { opacity: '0', transform: 'translateY(10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
    },
  },
}
```

- [ ] **Step 2: Reescrever a camada base e os componentes CSS compartilhados**

Substituir o visual `slate generic dark` por uma base `tech noir acessivel`, preservando `high-contrast` e `large-font`.

```css
/* src/renderer/src/index.css */
@layer base {
  :root {
    color-scheme: dark;
    --vl-bg-0: #06090d;
    --vl-bg-1: #0c1219;
    --vl-bg-2: #111a24;
    --vl-panel-0: #16212d;
    --vl-panel-1: #1b2836;
    --vl-line-soft: #243446;
    --vl-line-strong: #33506b;
    --vl-text-strong: #f3f7fb;
    --vl-text-body: #c8d3df;
    --vl-text-soft: #8fa1b3;
    --vl-cyan: #49e6ff;
    --vl-ember: #ff8a5b;
  }

  body {
    @apply text-slate-100 antialiased;
    background:
      radial-gradient(circle at top left, rgba(73,230,255,0.12), transparent 30%),
      radial-gradient(circle at top right, rgba(255,138,91,0.12), transparent 26%),
      linear-gradient(180deg, #0c1219 0%, #06090d 100%);
    font-family: 'Atkinson Hyperlegible Next', 'Segoe UI', system-ui, sans-serif;
  }
}

@layer components {
  .app-shell {
    @apply h-full flex flex-col;
    background:
      linear-gradient(180deg, rgba(12,18,25,0.96), rgba(6,9,13,0.98)),
      repeating-linear-gradient(
        90deg,
        rgba(255,255,255,0.015) 0,
        rgba(255,255,255,0.015) 1px,
        transparent 1px,
        transparent 24px
      );
  }

  .panel-surface {
    @apply rounded-[18px] border backdrop-blur-sm;
    background: linear-gradient(180deg, rgba(27,40,54,0.92), rgba(22,33,45,0.9));
    border-color: rgba(51,80,107,0.55);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  }

  .panel-muted {
    @apply rounded-2xl border;
    background: rgba(10, 14, 20, 0.82);
    border-color: rgba(36, 52, 70, 0.88);
  }

  .titlebar-btn {
    @apply p-2 rounded-xl transition-all duration-200;
  }

  .nav-link {
    @apply relative flex items-center gap-3 rounded-2xl px-3 lg:px-4 py-3 transition-all duration-200;
  }

  .status-pill {
    @apply inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium;
  }

  .btn-primary {
    @apply px-4 py-2 text-white font-semibold rounded-[14px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
    background: linear-gradient(135deg, #49e6ff, #1fd0f0 52%, #117d95);
    box-shadow: 0 10px 28px rgba(31, 208, 240, 0.28);
  }

  .btn-secondary {
    @apply px-4 py-2 font-medium rounded-[14px] transition-all duration-200;
    background: rgba(17, 26, 36, 0.92);
    color: #c8d3df;
    border: 1px solid rgba(51, 80, 107, 0.65);
  }

  .input-field {
    @apply w-full rounded-[14px] border px-4 py-2 transition-all;
    background: rgba(9, 13, 19, 0.9);
    border-color: rgba(51, 80, 107, 0.72);
    color: #f3f7fb;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Preservar acessibilidade forte na base**

Reforcar `focus-visible`, scrollbar, `high-contrast` e `large-font` com as novas classes compartilhadas.

```css
:focus-visible {
  outline: 2px solid #49e6ff;
  outline-offset: 3px;
}

.high-contrast .panel-surface,
.high-contrast .panel-muted,
.high-contrast .btn-primary,
.high-contrast .btn-secondary,
.high-contrast .input-field {
  background: #000000 !important;
  border: 2px solid #ffffff !important;
  box-shadow: none !important;
}
```

- [ ] **Step 4: Rodar build para validar a base visual**

Run: `cmd /c npm run build`  
Expected: build verde, sem erro de Tailwind ou CSS.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/renderer/src/index.css
git commit -m "feat: add tech noir base theme tokens"
```

### Task 2: Redesenhar o shell do app e a Home como cockpit

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Atualizar o `TitleBar` para o acabamento premium**

Trocar os wrappers e botoes do topo pelas classes novas, sem mudar handlers.

```tsx
function TitleBar() {
  return (
    <div className="h-12 flex items-center justify-between border-b border-chrome-700/70 bg-chrome-950/80 px-2 select-none app-drag-region">
      <div className="flex items-center gap-3 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-400/10">
          <Mic className="w-4 h-4 text-brand-300" />
        </div>
        <div>
          <span className="block text-sm font-semibold text-slate-100">VoiceLaunch TTS</span>
          <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-500">Local Voice Console</span>
        </div>
      </div>
      <div className="flex items-center gap-1 no-drag-region">
        <button
          onClick={() => setCompactMode(!compactMode)}
          className={`titlebar-btn ${compactMode ? 'text-brand-300 bg-brand-400/10' : 'text-slate-400 hover:bg-chrome-800 hover:text-brand-300'}`}
          aria-label="Alternar modo compacto"
        >
          <PictureInPicture className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAlwaysOnTop(!alwaysOnTop)}
          className={`titlebar-btn ${alwaysOnTop ? 'text-brand-300 bg-brand-400/10' : 'text-slate-400 hover:bg-chrome-800 hover:text-brand-300'}`}
          aria-label="Sempre no topo"
        >
          <Pin className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Atualizar a `Sidebar` para navegação tipo rail**

Manter `NavLink`, mas transformar o item ativo em trilho luminoso + bloco selecionado.

```tsx
function Sidebar() {
  return (
    <nav className="w-20 lg:w-64 border-r border-chrome-700/70 bg-chrome-950/55 px-3 py-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'nav-link',
              isActive
                ? 'border border-brand-400/25 bg-brand-400/10 text-brand-200 shadow-[inset_3px_0_0_0_rgba(73,230,255,0.9)]'
                : 'text-slate-400 hover:border hover:border-chrome-600 hover:bg-chrome-900/80 hover:text-slate-200',
            ].join(' ')
          }
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Reestruturar a Home para hero + status deck**

Manter a `HomePage` no mesmo arquivo, mas trocar a composicao atual por uma dupla `hero / operational card`.

```tsx
function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="panel-surface animate-lift-in p-8 lg:p-10">
          <div className="status-pill border-brand-400/30 bg-brand-400/10 text-brand-200">Modo local pronto para operacao</div>
          <h1 className="mt-6 text-4xl font-bold text-slate-50">Uma estacao de voz local para falar rapido, com clareza.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            O fluxo principal continua focado em Piper e Kokoro, com microfone virtual, frases rapidas e comunicacao assistiva.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#/tts" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base">
              <Volume2 className="h-5 w-5" />
              Falar agora
            </a>
            <a href="#/models" className="btn-secondary inline-flex items-center gap-2 px-6 py-3 text-base">
              <Download className="h-5 w-5" />
              Preparar modelos
            </a>
          </div>
        </section>

        <aside className="panel-surface p-6">
          <div className="status-pill border-chrome-600 bg-chrome-900/80 text-slate-300">Operational Status</div>
          <div className="mt-4 grid gap-3">
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Backend</span>
              <span className="text-xs font-medium text-brand-200">Local</span>
            </div>
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Modelo pronto</span>
              <span className="text-xs font-medium text-slate-100">Piper ou Kokoro</span>
            </div>
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Microfone virtual</span>
              <span className="text-xs font-medium text-slate-100">Ativavel</span>
            </div>
            <div className="panel-muted flex items-center justify-between p-3">
              <span className="text-sm text-slate-300">Modo compacto</span>
              <span className="text-xs font-medium text-slate-100">Ctrl+Shift+V</span>
            </div>
          </div>
        </aside>
      </div>

      <LocalSetupCard />
    </div>
  )
}
```

- [ ] **Step 4: Aplicar a nova casca ao root do app**

Substituir `bg-slate-900` por `app-shell` e aliviar o padding bruto do `main`.

```tsx
const rootClass = [
  'app-shell',
  highContrast ? 'high-contrast' : '',
  largeFont ? 'large-font' : '',
].filter(Boolean).join(' ')

<main className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-5">
```

- [ ] **Step 5: Rodar build apos o shell**

Run: `cmd /c npm run build`  
Expected: build verde, sem erro de JSX ou classes inexistentes.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: redesign app shell and home cockpit"
```

### Task 3: Transformar o `LocalSetupCard` em Launch Checklist

**Files:**
- Modify: `src/renderer/src/components/LocalSetupCard.tsx`

- [ ] **Step 1: Substituir a estrutura externa por um painel mais premium**

Trocar o wrapper `glass-panel` por `panel-surface` e reorganizar cabecalho, selo e resumo do setup.

```tsx
return (
  <section className="panel-surface space-y-6 p-6 lg:p-7">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="status-pill border-ember-500/30 bg-ember-500/10 text-ember-100">Launch Checklist</div>
        <h2 className="mt-4 text-2xl font-semibold text-slate-50">Setup local recomendado</h2>
        <p className="mt-2 text-slate-300">{recommendation.summary}</p>
        <p className="mt-2 text-sm text-slate-400">{recommendation.gpuNote}</p>
      </div>
      <div className="panel-muted rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-brand-200">
        MVP Local
      </div>
    </div>
```

- [ ] **Step 2: Reestilizar os itens do checklist**

Manter os mesmos dados e links, mas trocar cada linha por um card operacional com status, copy e CTA claro.

```tsx
{checklist.map((item) => (
  <div
    key={item.title}
    className="panel-muted flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between"
  >
    <div className="flex items-start gap-3">
      {item.done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-signal-success" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 text-slate-500" />
      )}
      <div>
        <div className="flex items-center gap-2">
          <item.icon className="h-4 w-4 text-brand-300" />
          <p className="text-sm font-semibold text-slate-100">{item.title}</p>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</p>
      </div>
    </div>
    <Link to={item.href} className="btn-secondary whitespace-nowrap text-sm">
      {item.cta}
    </Link>
  </div>
))}
```

- [ ] **Step 3: Reestilizar o bloco de modelos visiveis**

Trocar o box final por um resumo mais tatico, com tom de inventario de sistema.

```tsx
<div className="panel-muted p-4 text-sm text-slate-400">
  <div className="flex items-center gap-2 text-slate-200">
    <Zap className="h-4 w-4 text-amber-300" />
    Modelos visiveis neste MVP
  </div>
  <p className="mt-2 leading-6">
    {visibleModels.length > 0 ? visibleModels.map((model) => model.name).join(', ') : 'Carregando catalogo...'}
  </p>
</div>
```

- [ ] **Step 4: Rodar build apos o checklist**

Run: `cmd /c npm run build`  
Expected: build verde, sem regressao em `Link`, icones ou classes.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/LocalSetupCard.tsx
git commit -m "feat: restyle launch checklist card"
```

### Task 4: Redesenhar a tela TTS como console de comunicacao

**Files:**
- Modify: `src/renderer/src/pages/TTSPage.tsx`

- [ ] **Step 1: Reorganizar o topo para uma faixa de estado premium**

Substituir o topo atual por um cabecalho com identidade forte e uma faixa de estado legivel em um golpe de vista.

```tsx
  <div className="mb-5 flex flex-col gap-4">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-400/25 bg-brand-400/10">
        <Volume2 className="h-5 w-5 text-brand-300" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Falar</h1>
        <p className="text-sm text-slate-400">Console principal para composicao, repeticao e disparo rapido de voz.</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={toggleVirtualMic}
        className={
          virtualMicEnabled
            ? 'status-pill border-green-500/30 bg-green-500/10 text-green-200'
            : 'status-pill border-chrome-600 bg-chrome-900/85 text-slate-300'
        }
      >
        <Mic className="h-4 w-4" />
        {virtualMicEnabled ? 'Microfone virtual ativo' : 'Microfone virtual'}
      </button>
      <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary inline-flex items-center gap-2">
        <History className="h-4 w-4" />
        {showHistory ? 'Ocultar historico' : 'Abrir historico'}
      </button>
    </div>
  </div>

  <div className="panel-surface flex flex-wrap items-center gap-3 p-3">
    <div className="status-pill border-chrome-600 bg-chrome-900/85 text-slate-300">
      <Mic className="h-4 w-4 text-brand-300" />
      Modelo: {modelId || 'Nenhum pronto'}
    </div>
    <div className={virtualMicEnabled ? 'status-pill border-green-500/30 bg-green-500/10 text-green-200' : 'status-pill border-chrome-600 bg-chrome-900/85 text-slate-300'}>
      <MonitorUp className="h-4 w-4" />
      {virtualMicEnabled ? 'Mic virtual ativo' : 'Mic virtual desligado'}
    </div>
    <div className={isSpeaking ? 'status-pill border-brand-400/35 bg-brand-400/10 text-brand-100 animate-glow-soft' : 'status-pill border-chrome-600 bg-chrome-900/85 text-slate-300'}>
      <Send className="h-4 w-4" />
      {isSpeaking ? 'Falando agora' : 'Pronto para falar'}
    </div>
    <label className="status-pill border-chrome-600 bg-chrome-900/85 text-slate-300">
      <input type="checkbox" checked={keepTextAfterSpeak} onChange={(event) => setKeepTextAfterSpeak(event.target.checked)} className="accent-brand-400" />
      Manter texto
    </label>
  </div>
</div>
```

- [ ] **Step 2: Reestilizar o bloco de controles de modelo**

Transformar o seletor de modelo, velocidade e voz em uma barra operacional integrada.

```tsx
<div className="panel-surface mb-4 flex flex-wrap items-center gap-4 p-4">
  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Modelo</label>
  <select value={modelId} onChange={(e) => handleModelChange(e.target.value)} className="input-field py-2 text-sm w-56" disabled={noReadyModel}>
    {noReadyModel && <option value="">Nenhum modelo pronto</option>}
    {availableModels.map((model) => (
      <option key={model.id} value={model.id}>
        {model.name}
      </option>
    ))}
  </select>
  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Velocidade</label>
  <input type="range" min={0.5} max={2.0} step={0.1} value={speed} onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} className="w-28 accent-brand-400" />
  <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Voz</label>
  <input type="text" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="input-field py-2 text-sm w-36" placeholder="Padrao" disabled={noReadyModel} />
</div>
```

- [ ] **Step 3: Transformar a composicao em um console hero**

Manter toda a logica de `speak`, `keepTextAfterSpeak`, `VirtualKeyboard` e botoes, mas trocar o miolo por um painel dominante e mais legivel.

```tsx
  <div className="panel-surface flex flex-1 flex-col p-5 min-h-0">
  <textarea
    ref={textAreaRef}
    placeholder="Digite uma frase e fale imediatamente. Enter envia. Shift+Enter quebra linha."
    className="min-h-[280px] flex-1 resize-none bg-transparent text-xl leading-8 text-slate-50 outline-none placeholder:text-slate-500"
    value={text}
    onChange={(e) => setText(e.target.value)}
    onKeyDown={handleKeyDown}
    autoFocus
    disabled={noReadyModel}
  />
  <div className="mt-4 flex flex-col gap-3 border-t border-chrome-600/70 pt-4 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
      <span>{text.length} caracteres</span>
      <span>{availableModels.length} modelos prontos</span>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={keepTextAfterSpeak} onChange={(event) => setKeepTextAfterSpeak(event.target.checked)} className="accent-brand-400" />
        Manter texto apos falar
      </label>
    </div>
    <div className="flex flex-wrap gap-2">
      <button onClick={() => { setText(''); textAreaRef.current?.focus() }} className="btn-secondary text-sm">Limpar</button>
      <VirtualKeyboard
        onKeyPress={(key) => {
          setText((prev) => prev + key)
          setTimeout(() => textAreaRef.current?.focus(), 50)
        }}
        onBackspace={() => setText((prev) => prev.slice(0, -1))}
        onSpace={() => setText((prev) => prev + ' ')}
        onEnter={() => {
          void speak(text)
        }}
      />
      <button onClick={saveCurrentPhrase} disabled={!text.trim()} className="btn-secondary text-sm flex items-center gap-2">Salvar frase</button>
      <button onClick={() => void speak(text)} disabled={(!isSpeaking && !text.trim()) || noReadyModel} className="btn-primary min-w-36 justify-center text-sm flex items-center gap-2">Falar</button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Trocar frases rapidas por command pads e limpar o historico**

Reestilizar o bloco de frases e a coluna de historico, sem alterar os handlers.

```tsx
<div className="panel-surface p-4">
  <div className="mb-3 flex items-center gap-2">
    <Keyboard className="h-4 w-4 text-brand-300" />
    <h3 className="text-sm font-semibold text-slate-200">Frases rapidas</h3>
  </div>
  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
    {quickPhrases.map((phrase) => (
      <div key={phrase} className="panel-muted overflow-hidden rounded-2xl border">
        <button onClick={() => { setText(phrase); void speak(phrase) }} className="w-full px-3 py-3 text-left text-sm text-slate-200 transition-colors hover:bg-brand-400/10">
          {phrase}
        </button>
        <button onClick={() => deleteQuickPhrase(phrase)} className="border-t border-chrome-700/80 px-3 py-2 text-xs text-slate-400 hover:bg-chrome-900">
          Remover frase
        </button>
      </div>
    ))}
  </div>
</div>
```

```tsx
{showHistory && (
  <aside className="panel-surface w-full xl:w-80 p-4 overflow-auto">
    <h3 className="text-sm font-semibold text-slate-200">Historico persistente</h3>
    <div className="mt-3 space-y-3">
      {history.map((item) => (
        <div key={item.id} className="panel-muted p-3">
          <p className="text-sm text-slate-200 line-clamp-2">{item.text}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span>{item.modelId}</span>
            <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setText(item.text); void speak(item.text) }} className="btn-secondary text-xs">Repetir</button>
            <button onClick={() => addQuickPhrase(item.text)} className="btn-secondary text-xs">Fixar</button>
          </div>
        </div>
      ))}
    </div>
  </aside>
)}
```

- [ ] **Step 5: Rodar testes e build apos a TTS**

Run: `cmd /c npm run test`  
Expected: `vitest` verde, ainda com os 19 testes passando.

Run: `cmd /c npm run build`  
Expected: build verde, sem regressao de JSX ou tipos no renderer.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/pages/TTSPage.tsx
git commit -m "feat: redesign tts communication console"
```

### Task 5: Redesenhar o modo compacto como mini comunicador

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Reestilizar o header do compacto**

Manter os controles e estados atuais, mas dar leitura imediata para microfone virtual e `keepTextAfterSpeak`.

```tsx
<div className="flex items-center justify-between gap-2">
  <button className={virtualMicEnabled ? 'status-pill border-green-500/30 bg-green-500/10 text-green-200' : 'status-pill border-chrome-600 bg-chrome-900 text-slate-300'}>
    {virtualMicEnabled ? 'Mic ativo' : 'Mic virtual'}
  </button>
  <label className="flex items-center gap-2 text-xs text-slate-300">
    <input type="checkbox" checked={keepTextAfterSpeak} onChange={(event) => setKeepTextAfterSpeak(event.target.checked)} className="accent-brand-400" />
    Manter texto
  </label>
</div>
```

- [ ] **Step 2: Transformar o textarea e os atalhos em um mini console consistente**

Reaproveitar a mesma linguagem do TTS com menor densidade e CTA mais evidente.

```tsx
<textarea
  className="panel-muted min-h-[180px] flex-1 resize-none p-4 text-base leading-6 text-slate-50 outline-none placeholder:text-slate-500"
  placeholder="Digite uma frase e aperte Enter para falar"
  value={text}
  onChange={(e) => setText(e.target.value)}
  onKeyDown={handleKeyDown}
  autoFocus
/>

<div className="grid grid-cols-2 gap-2">
  {quickPhrases.slice(0, 4).map((phrase) => (
    <button onClick={() => { setText(phrase); void speak(phrase) }} className="panel-muted px-3 py-2 text-left text-xs text-slate-200 hover:border-brand-400/35 hover:bg-brand-400/10">
      {phrase}
    </button>
  ))}
</div>

<div className="flex items-center gap-2 overflow-auto pb-1">
  {history.slice(0, 3).map((item) => (
    <button onClick={() => setText(item.text)} className="rounded-xl border border-chrome-700/80 bg-chrome-900/90 px-3 py-2 text-xs text-slate-300 whitespace-nowrap">
      {item.text}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Tornar o CTA principal claramente dominante**

Trocar o botao atual por uma versao mais forte, com estados de `Falar` e `Parar` mais claros.

```tsx
<button
  onClick={() => void speak(text)}
  disabled={!isSpeaking && !text.trim()}
  className="btn-primary flex items-center justify-center gap-2 py-3 text-sm font-semibold"
>
  {isSpeaking ? <><Square className="w-4 h-4" />Parar</> : <><Send className="w-4 h-4" />Falar</>}
</button>
```

- [ ] **Step 4: Rodar testes e build apos o compacto**

Run: `cmd /c npm run test`  
Expected: `vitest` verde, sem regressao nos helpers existentes.

Run: `cmd /c npm run build`  
Expected: build verde.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: redesign compact communicator"
```

### Task 6: Verificacao visual final e runtime

**Files:**
- No file changes required if everything passes

- [ ] **Step 1: Rodar a validacao tecnica final**

Run: `cmd /c npm run test`  
Expected: suite completa verde.

Run: `cmd /c npm run build`  
Expected: build verde.

- [ ] **Step 2: Rodar o launcher para revisao visual**

Run: `cmd /c npm run dev`  
Expected: app Electron abre com o shell novo, Home redesenhada, TTS em estilo console e modo compacto coerente com o restante.

Checklist manual:

```text
1. Sidebar ativa com rail luminoso e leitura clara
2. Home com hero dominante e card operacional lateral
3. LocalSetupCard com cara de checklist premium
4. TTS com CTA de fala visualmente dominante
5. Frases rapidas legiveis e clicaveis
6. Historico claro, sem poluicao
7. Modo compacto legivel em janela pequena
8. High contrast e large font ainda funcionam
```

- [ ] **Step 3: Commit de fechamento**

```bash
git add tailwind.config.js src/renderer/src/index.css src/renderer/src/App.tsx src/renderer/src/pages/TTSPage.tsx src/renderer/src/components/LocalSetupCard.tsx
git commit -m "feat: apply tech noir accessible launcher redesign"
```

## Self-Review

### Spec coverage

- sistema visual: coberto na Task 1
- shell: coberto na Task 2
- Home: coberto na Task 2
- `LocalSetupCard` / Launch Checklist: coberto na Task 3
- TTS como console de comunicacao: coberto na Task 4
- modo compacto balanceado: coberto na Task 5
- validacao final e runtime: coberto na Task 6

### Placeholder scan

- o plano nao usa `TODO`, `TBD` ou passos vazios
- os comandos de validacao estao explicitos
- os arquivos afetados estao nomeados exatamente

### Type consistency

- o plano preserva os nomes e fluxos reais atuais: `TitleBar`, `Sidebar`, `HomePage`, `CompactView`, `TTSPage`, `LocalSetupCard`, `toggleVirtualMic`, `keepTextAfterSpeak`, `quickPhrases`, `history`
- nao introduz novas APIs ou stores para sustentar o redesign

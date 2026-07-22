import { useState } from 'react'
import { ChevronDown, ChevronRight, Headphones, Zap } from 'lucide-react'

interface DiscordVRChatGuideProps {
  defaultExpanded?: boolean
  compact?: boolean
}

const STEPS: { title: string; description: React.ReactNode }[] = [
  {
    title: 'Install VB-Audio Virtual Cable',
    description: (
      <span>
        Download it at{' '}
        <button
          onClick={() => window.electronAPI?.openExternal?.('https://vb-audio.com/Cable/')}
          className="underline"
          style={{ color: 'var(--vl-state-live)' }}
        >
          vb-audio.com/Cable
        </button>{' '}
        or from <strong>Settings &gt; Virtual microphone &gt; Try bundled installer</strong>.
      </span>
    ),
  },
  {
    title: 'Select CABLE Input in the app',
    description: (
      <span>
        In <strong>Settings &gt; Virtual microphone</strong>, choose{' '}
        <strong>CABLE Input (VB-Audio Virtual Cable)</strong> as the audio output.
      </span>
    ),
  },
  {
    title: 'Set CABLE Output in Discord or your game',
    description: (
      <span>
        Discord: <em>User Settings &gt; Voice &amp; Video &gt; Input Device = CABLE Output</em>.<br />
        VRChat: <em>Settings &gt; Audio &gt; Microphone = CABLE Output</em>; enable voice activation or use PTT.<br />
        Other games: point the default microphone to CABLE Output.
      </span>
    ),
  },
  {
    title: 'Enable the virtual microphone on the Speak panel',
    description: (
      <span>
        Click <strong>Enable virtual microphone</strong>. Online and local voices
        will play directly through CABLE. Global shortcuts (Ctrl+Shift+1..9) work
        in the background, even with the game focused.
      </span>
    ),
  },
]

export default function DiscordVRChatGuide({ defaultExpanded = false, compact = false }: DiscordVRChatGuideProps) {
  const [open, setOpen] = useState(defaultExpanded)

  return (
    <section className="hud-frame p-4 space-y-3">
      <button
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center gap-2 text-left"
        aria-expanded={open}
      >
        <Headphones className="h-5 w-5" style={{ color: 'var(--vl-state-live)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-ink-strong">
            How to use this as a microphone in Discord, VRChat, and games
          </p>
          {!open && (
            <p className="text-xs text-ink-soft mt-0.5">
              4 steps: install VB-Cable, select CABLE Input/Output, enable the virtual mic.
            </p>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-ink-soft flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-ink-soft flex-shrink-0" />
        )}
      </button>

      {open && (
        <ol className={`space-y-2.5 pl-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold"
                style={{
                  background: 'var(--vl-surface-overlay)',
                  border: '1px solid var(--vl-hud-border-strong)',
                  color: 'var(--vl-purple-200)',
                }}
              >
                {index + 1}
              </span>
              <div className="space-y-0.5">
                <p className="font-medium text-ink-strong">{step.title}</p>
                <p className="text-ink-body leading-relaxed">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {open && (
        <div
          className="rounded-xl p-3 text-xs flex items-start gap-2"
          style={{ background: 'var(--vl-state-live-bg)', border: '1px solid var(--vl-state-live-border)', color: 'var(--vl-state-live-text)' }}
        >
          <Zap className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            VRChat tip: if the game doesn't detect the mic, open the launcher and click{' '}
            <strong>Test output</strong> in the Virtual microphone panel — this forces Windows
            to recognize CABLE Input as active.
          </span>
        </div>
      )}
    </section>
  )
}

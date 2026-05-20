import { useState } from 'react'
import { ChevronDown, ChevronRight, Headphones, Zap } from 'lucide-react'

interface DiscordVRChatGuideProps {
  defaultExpanded?: boolean
  compact?: boolean
}

const STEPS: { title: string; description: React.ReactNode }[] = [
  {
    title: 'Instale o VB-Audio Virtual Cable',
    description: (
      <span>
        Baixe em{' '}
        <button
          onClick={() => window.electronAPI?.openExternal?.('https://vb-audio.com/Cable/')}
          className="underline"
          style={{ color: 'var(--vl-state-live)' }}
        >
          vb-audio.com/Cable
        </button>{' '}
        ou em <strong>Ajustes &gt; Microfone Virtual &gt; Tentar instalador do pacote</strong>.
      </span>
    ),
  },
  {
    title: 'Selecione CABLE Input no app',
    description: (
      <span>
        Em <strong>Ajustes &gt; Microfone Virtual</strong>, escolha{' '}
        <strong>CABLE Input (VB-Audio Virtual Cable)</strong> como saida de audio.
      </span>
    ),
  },
  {
    title: 'Configure CABLE Output no Discord ou jogo',
    description: (
      <span>
        Discord: <em>User Settings &gt; Voice &amp; Video &gt; Input Device = CABLE Output</em>.<br />
        VRChat: <em>Settings &gt; Audio &gt; Microphone = CABLE Output</em>; ative voice activation ou use PTT.<br />
        Outros jogos: aponte o microfone padrao para CABLE Output.
      </span>
    ),
  },
  {
    title: 'Ative o microfone virtual no painel Falar',
    description: (
      <span>
        Clique em <strong>Ativar microfone virtual</strong>. A voz online e as locais
        passam a tocar diretamente no CABLE. Atalhos globais (Ctrl+Shift+1..9) funcionam
        em background, mesmo com o jogo em foco.
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
            Como usar como microfone no Discord, VRChat e jogos
          </p>
          {!open && (
            <p className="text-xs text-ink-soft mt-0.5">
              4 passos: instalar VB-Cable, selecionar CABLE Input/Output, ativar mic virtual.
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
                  background: 'rgba(139,92,246,0.18)',
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
          style={{ background: 'rgba(73,230,255,0.08)', border: '1px solid rgba(73,230,255,0.28)', color: '#A5F0FF' }}
        >
          <Zap className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Dica VRChat: se o jogo nao detectar o mic, abra o launcher e clique em{' '}
            <strong>Testar saida</strong> no painel de Microfone Virtual — isso forca o Windows
            a reconhecer o CABLE Input como ativo.
          </span>
        </div>
      )}
    </section>
  )
}

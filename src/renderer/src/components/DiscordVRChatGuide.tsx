import { useState } from 'react'
import { ChevronDown, ChevronRight, Headphones, Zap } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

interface DiscordVRChatGuideProps {
  defaultExpanded?: boolean
  compact?: boolean
}

const STEP_IDS = ['install', 'selectInput', 'setOutput', 'enable'] as const

const openVbCable = () => window.electronAPI?.openExternal?.('https://vb-audio.com/Cable/')

export default function DiscordVRChatGuide({ defaultExpanded = false, compact = false }: DiscordVRChatGuideProps) {
  const { t } = useTranslation('discord')
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
            {t('guide.title')}
          </p>
          {!open && (
            <p className="text-xs text-ink-soft mt-0.5">
              {t('guide.summary')}
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
          {STEP_IDS.map((id, index) => (
            <li key={id} className="flex items-start gap-3">
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
                <p className="font-medium text-ink-strong">{t(`guide.steps.${id}.title`)}</p>
                <p className="text-ink-body leading-relaxed">
                  <Trans
                    i18nKey={`guide.steps.${id}.description`}
                    ns="discord"
                    components={{
                      strong: <strong />,
                      em: <em />,
                      br: <br />,
                      link: (
                        <button
                          type="button"
                          onClick={openVbCable}
                          className="underline"
                          style={{ color: 'var(--vl-state-live)' }}
                        />
                      ),
                    }}
                  />
                </p>
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
            <Trans i18nKey="guide.tip" ns="discord" components={{ strong: <strong /> }} />
          </span>
        </div>
      )}
    </section>
  )
}

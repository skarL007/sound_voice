import { useEffect, useState } from 'react'
import { Keyboard, Plus } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import DiscordVRChatGuide from '../components/DiscordVRChatGuide'
import { HotkeyCapture, ShortcutCard, VoiceSelect } from '../components/ShortcutControls'
import { useVoiceShortcuts } from '../hooks/useVoiceShortcuts'
import { toast } from '../utils/toast'

export default function VoiceShortcutsPage() {
  const { t } = useTranslation('shortcutsPage')
  const sc = useVoiceShortcuts()
  const [draftText, setDraftText] = useState('')
  const [draftVoice, setDraftVoice] = useState('')
  const [draftHotkey, setDraftHotkey] = useState(sc.suggestedHotkey)

  useEffect(() => {
    if (!draftVoice && sc.cloudVoiceDefault) setDraftVoice(sc.cloudVoiceDefault)
  }, [sc.cloudVoiceDefault, draftVoice])
  useEffect(() => {
    setDraftHotkey(sc.suggestedHotkey)
  }, [sc.suggestedHotkey])

  const handleAdd = () => {
    const created = sc.createShortcut(draftText, { voice: draftVoice || undefined, hotkey: draftHotkey })
    if (created) setDraftText('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ border: '1px solid var(--vl-hud-border-strong)', background: 'var(--vl-surface-raised)' }}
        >
          <Keyboard className="h-5 w-5" style={{ color: 'var(--vl-state-ready)' }} />
        </div>
        <div className="space-y-1">
          <h1 className="text-page font-bold tracking-tight text-ink-strong">{t('title')}</h1>
          <p className="max-w-2xl text-sm text-ink-soft">
            <Trans i18nKey="intro" ns="shortcutsPage" components={{ strong: <strong /> }} />
          </p>
        </div>
      </div>

      {sc.cloudError && (
        <div
          className="rounded-2xl p-3 text-sm"
          style={{ background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)', color: 'var(--vl-state-warn-text)' }}
        >
          {t('cloudError', { error: sc.cloudError })}
        </div>
      )}

      <div className="hud-frame p-4 space-y-3" style={{ background: 'var(--vl-surface-raised)' }}>
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-sm font-semibold text-ink-strong">{t('new.title')}</h2>
        </div>
        <textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              handleAdd()
            }
          }}
          placeholder={t('new.placeholder')}
          className="terminal-textarea w-full p-3 text-sm min-h-[72px] font-mono"
          maxLength={500}
        />
        <div className="flex flex-wrap items-center gap-2">
          <VoiceSelect voices={sc.cloudVoices} value={draftVoice} onChange={setDraftVoice} ariaLabel={t('new.voiceAria')} />
          <HotkeyCapture value={draftHotkey} onChange={setDraftHotkey} shortcuts={sc.voiceShortcuts} ariaLabel={t('new.keyAria')} />
          <button onClick={handleAdd} className="btn-primary btn-primary--armed inline-flex items-center gap-2 text-sm ml-auto">
            <Plus className="h-4 w-4" />
            {t('new.add')}
          </button>
        </div>
      </div>

      {sc.sortedShortcuts.length === 0 ? (
        <p className="text-center text-sm text-ink-soft py-6">{t('empty')}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sc.sortedShortcuts.map((entry) => (
            <ShortcutCard
              key={entry.id}
              shortcut={entry}
              voices={sc.cloudVoices}
              allShortcuts={sc.voiceShortcuts}
              isTesting={sc.testingId === entry.id}
              isActive={sc.activeId === entry.id}
              onUpdate={(patch) => sc.updateShortcut(entry.id, patch)}
              onDelete={() => {
                sc.deleteShortcut(entry.id)
                toast(t('removed'), entry.name, 'info')
              }}
              onTest={() => void sc.testShortcut(entry)}
            />
          ))}
        </div>
      )}

      <DiscordVRChatGuide defaultExpanded={false} />
    </div>
  )
}

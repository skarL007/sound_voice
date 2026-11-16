import { useEffect, useState } from 'react'
import type { BackendStatus } from '../../../shared/types'
import { useAppStore } from '../stores/appStore'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, isLanguage, setLanguage } from '../i18n'
import {
  BookOpen,
  Contrast,
  Eye,
  Languages,
  Mic,
  RefreshCw,
  Settings,
  Type,
  Volume2,
} from 'lucide-react'
import AudioOutputPicker from '../components/AudioOutputPicker'
import { detectVBCable } from '../utils/virtualMicSetup'

const LANGUAGE_NAMES: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  en: 'English',
  fr: 'Français',
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation('settings')
  const {
    highContrast,
    setHighContrast,
    largeFont,
    setLargeFont,
    showExperimentalModels,
    setShowExperimentalModels,
    setTutorialSeen,
    voiceSource,
    setVoiceSource,
  } = useAppStore()
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    running: false,
    port: 9472,
    version: '1.0.0',
    uptime: 0,
    phase: 'starting',
  })
  const [vbCableInstalled, setVbCableInstalled] = useState(false)

  useEffect(() => {
    loadStatus()
    loadAudioDevices()
  }, [])

  const loadStatus = async () => {
    const status = await window.electronAPI.getBackendStatus()
    setBackendStatus(status)
  }

  const loadAudioDevices = async () => {
    // Online-first: detecta o cabo pelo renderer (enumerateDevices); backend so reforco.
    let detected = false
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const outs = await navigator.mediaDevices.enumerateDevices()
        detected = outs.some((d) => d.kind === 'audiooutput' && /cable/i.test(d.label))
      }
    } catch {
      /* ignore */
    }
    if (!detected) {
      try {
        detected = detectVBCable(await window.electronAPI.listAudioDevices())
      } catch {
        /* ignore */
      }
    }
    setVbCableInstalled(detected)
  }

  const restartBackend = async () => {
    await window.electronAPI.restartBackend()
    setTimeout(loadStatus, 3000)
  }

  const backendLabel =
    backendStatus.phase === 'running'
      ? t('backend.status.running')
      : backendStatus.phase === 'starting'
        ? t('backend.status.starting')
        : backendStatus.phase === 'error'
          ? t('backend.status.error')
          : t('backend.status.offline')

  const statusDotColor = backendStatus.phase === 'running'
    ? 'var(--vl-state-success)'
    : backendStatus.phase === 'starting'
      ? 'var(--vl-state-warn)'
      : 'var(--vl-state-error)'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7" style={{ color: 'var(--vl-state-ready)' }} />
        <h1 className="text-2xl font-bold text-ink-strong">{t('title')}</h1>
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Languages className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">{t('language.title')}</h2>
        </div>
        <div className="panel-muted flex items-center justify-between gap-4 p-3">
          <div>
            <label htmlFor="settings-language" className="block text-sm font-medium text-ink-strong">
              {t('language.label')}
            </label>
            <p id="settings-language-hint" className="text-xs text-ink-mute">{t('language.hint')}</p>
          </div>
          <select
            id="settings-language"
            aria-describedby="settings-language-hint"
            value={isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en'}
            onChange={(event) => {
              if (isLanguage(event.target.value)) void setLanguage(event.target.value)
            }}
            className="input-field text-sm w-auto"
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code} lang={code}>
                {LANGUAGE_NAMES[code]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
            <h2 className="text-lg font-medium text-ink-strong">{t('backend.title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: statusDotColor }} />
            <span className="text-sm text-ink-soft">{backendLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="panel-muted p-3">
            <span className="text-ink-mute">{t('backend.port')}</span>
            <p className="text-ink-strong font-medium font-mono">{backendStatus.port}</p>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute">{t('backend.uptime')}</span>
            <p className="text-ink-strong font-medium font-mono">{backendStatus.uptime}s</p>
          </div>
        </div>

        <button onClick={restartBackend} className="btn-secondary text-sm flex items-center gap-2" aria-label={t('backend.restartAria')}>
          <RefreshCw className="w-4 h-4" />
          {backendStatus.phase === 'starting' ? t('backend.restart') : t('common:retry')}
        </button>
        {backendStatus.lastError && (
          <p className="mt-3 text-sm" style={{ color: 'var(--vl-state-error)' }}>{backendStatus.lastError}</p>
        )}
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Volume2 className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">{t('voiceSource.title')}</h2>
        </div>
        <p className="mb-3 text-sm text-ink-soft">
          {t('voiceSource.description')}
        </p>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('voiceSource.groupLabel')}>
          {([
            { value: 'auto', title: t('voiceSource.auto.title'), hint: t('voiceSource.auto.hint') },
            { value: 'cloud', title: t('voiceSource.cloud.title'), hint: t('voiceSource.cloud.hint') },
            { value: 'local', title: t('voiceSource.local.title'), hint: t('voiceSource.local.hint') },
          ] as const).map((option) => (
            <label
              key={option.value}
              className={`panel-muted flex cursor-pointer flex-col gap-1 p-3 transition-colors hover:bg-brand-500/8 ${
                voiceSource === option.value ? 'ring-1 ring-brand-500' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="voice-source"
                  value={option.value}
                  checked={voiceSource === option.value}
                  onChange={() => setVoiceSource(option.value)}
                  className="accent-brand-500"
                />
                <span className="text-sm font-medium text-ink-strong">{option.title}</span>
              </span>
              <span className="text-xs text-ink-mute">{option.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Mic className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">{t('virtualMic.title')}</h2>
        </div>

        <div
          className="rounded-xl p-3 text-sm flex items-start gap-2"
          style={
            vbCableInstalled
              ? { background: 'var(--vl-state-success-bg)', border: '1px solid var(--vl-state-success-border)' }
              : { background: 'var(--vl-state-warn-bg)', border: '1px solid var(--vl-state-warn-border)' }
          }
        >
          <Mic
            className="h-4 w-4 flex-shrink-0 mt-0.5"
            style={{ color: vbCableInstalled ? 'var(--vl-state-success)' : 'var(--vl-state-warn)' }}
          />
          <p className="text-ink-body">
            {vbCableInstalled
              ? t('virtualMic.installed')
              : t('virtualMic.missing')}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <AudioOutputPicker />
        </div>
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Contrast className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">{t('accessibility.title')}</h2>
        </div>

        <div className="space-y-3">
          <label className="panel-muted flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-brand-500/8">
            <div className="flex items-center gap-3">
              <Contrast className="w-5 h-5 text-ink-soft" />
              <div>
                <p className="text-sm font-medium text-ink-strong">{t('accessibility.highContrast.title')}</p>
                <p className="text-xs text-ink-mute">{t('accessibility.highContrast.hint')}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </label>

          <label className="panel-muted flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-brand-500/8">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-ink-soft" />
              <div>
                <p className="text-sm font-medium text-ink-strong">{t('accessibility.largeFont.title')}</p>
                <p className="text-xs text-ink-mute">{t('accessibility.largeFont.hint')}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={largeFont}
              onChange={(event) => setLargeFont(event.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </label>
        </div>
      </div>

      <div className="hud-frame p-5">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-5 h-5" style={{ color: 'var(--vl-state-ready)' }} />
          <h2 className="text-lg font-medium text-ink-strong">{t('localVoices.title')}</h2>
        </div>

        <label className="panel-muted flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-brand-500/8">
          <div>
            <p className="text-sm font-medium text-ink-strong">{t('localVoices.experimental.title')}</p>
            <p className="text-xs text-ink-mute">
              {t('localVoices.experimental.hint')}
            </p>
          </div>
          <input
            type="checkbox"
            checked={showExperimentalModels}
            onChange={(event) => setShowExperimentalModels(event.target.checked)}
            className="w-5 h-5 accent-brand-500"
          />
        </label>
      </div>

      <div className="hud-frame p-5">
        <h2 className="text-lg font-medium text-ink-strong mb-3">{t('shortcuts.title')}</h2>
        <p className="text-sm text-ink-soft mb-3">
          {t('shortcuts.description')}
        </p>
        <ul className="space-y-2 text-sm">
          {[
            ['Ctrl+Shift+F', t('shortcuts.focus')],
            ['Ctrl+Shift+V', t('shortcuts.compact')],
            ['Ctrl+Shift+M', t('shortcuts.toggleMic')],
            ['Ctrl+Shift+S', t('shortcuts.stop')],
            ['Ctrl+Shift+1..9', t('shortcuts.phrases')],
          ].map(([shortcut, desc]) => (
            <li key={shortcut} className="panel-muted flex items-center justify-between p-2.5">
              <span className="text-ink-body">{desc}</span>
              <code className="badge-shortcut text-[11px] px-2 w-auto" style={{ minWidth: 'auto', width: 'auto', height: 'auto', padding: '2px 6px' }}>
                {shortcut}
              </code>
            </li>
          ))}
        </ul>
      </div>

      <div className="hud-frame p-5">
        <h2 className="text-lg font-medium text-ink-strong mb-3">{t('about.title')}</h2>
        <p className="text-sm text-ink-soft leading-relaxed mb-4">
          {t('about.description')}
        </p>
        <button
          onClick={() => setTutorialSeen(false)}
          className="btn-secondary inline-flex items-center gap-2 text-sm mb-4"
          aria-label={t('about.replay')}
        >
          <BookOpen className="w-4 h-4" />
          {t('about.replay')}
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">{t('about.version')}</span>
            <span className="text-ink-strong">1.3.0</span>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">{t('about.license')}</span>
            <span className="text-ink-strong">MIT</span>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">{t('about.mainFlow')}</span>
            <span className="text-ink-strong">{t('about.mainFlowValue')}</span>
          </div>
          <div className="panel-muted p-3">
            <span className="text-ink-mute block mb-1">{t('about.advanced')}</span>
            <span className="text-ink-strong">{t('about.advancedValue')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

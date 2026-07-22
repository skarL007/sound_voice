import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAppStore } from '../stores/appStore'
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Download,
  Headphones,
  Keyboard,
  Mic,
  SkipForward,
  Sparkles,
  UserCircle,
  Volume2,
  X,
} from 'lucide-react'
import type { HardwareInfo } from '../../../shared/types'
import { getHardwarePlaybook } from '../utils/hardwarePlaybook'
import type { PlaybookStepAction } from '../utils/hardwarePlaybook'

interface Step {
  title: string
  description: string
  icon: ReactNode
  tip?: string
  verify?: 'mic-virtual' | null
}

function iconFor(action: PlaybookStepAction | 'welcome'): ReactNode {
  const color = 'var(--vl-state-ready)'
  const liveColor = 'var(--vl-state-live)'
  switch (action) {
    case 'welcome':
      return <Mic className="w-12 h-12" style={{ color }} />
    case 'try-cloud':
      return <Cloud className="w-12 h-12" style={{ color: liveColor }} />
    case 'install-piper':
    case 'install-kokoro':
      return <Download className="w-12 h-12" style={{ color }} />
    case 'install-xtts':
      return <UserCircle className="w-12 h-12" style={{ color }} />
    case 'setup-mic':
      return <Headphones className="w-12 h-12" style={{ color: liveColor }} />
    case 'tour-shortcuts':
      return <Keyboard className="w-12 h-12" style={{ color }} />
    default:
      return <Sparkles className="w-12 h-12" style={{ color }} />
  }
}

function buildSteps(hardware: HardwareInfo | null): Step[] {
  const playbook = getHardwarePlaybook(hardware)
  const intro: Step = {
    title: 'Welcome to VoiceLaunch TTS',
    description:
      'A local voice station for people who can\'t speak, gamers, Discord users, or anyone who needs assistive communication. Your track was adapted to your hardware.',
    icon: iconFor('welcome'),
    tip: `Track detected: ${playbook.headline}.`,
  }
  const playSteps: Step[] = playbook.steps.map((step) => ({
    title: step.title,
    description: step.description,
    icon: iconFor(step.action),
    tip: step.action === 'try-cloud'
      ? 'Go to "Speak", choose a voice, and hit Enter. Works right away.'
      : step.action === 'install-piper'
        ? 'Cloud voices on "Speak" cover most needs out of the box. A local voice kicks in automatically as a fallback when you are offline.'
        : step.action === 'install-xtts'
          ? 'Voice cloning is not available in this build — use the cloud voices on "Speak" instead.'
          : step.action === 'setup-mic'
            ? 'In "Settings" > Virtual microphone, select CABLE Input.'
            : step.action === 'tour-shortcuts'
              ? 'In "Shortcuts" you create global hotkeys that trigger phrases.'
              : undefined,
    verify: step.action === 'setup-mic' ? 'mic-virtual' : null,
  }))
  return [intro, ...playSteps]
}

export default function OnboardingTutorial() {
  const tutorialSeen = useAppStore((state) => state.tutorialSeen)
  const setTutorialSeen = useAppStore((state) => state.setTutorialSeen)
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [steps, setSteps] = useState<Step[]>(buildSteps(null))
  const [micVerified, setMicVerified] = useState(false)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    if (!tutorialSeen) {
      setIsOpen(true)
    }
  }, [tutorialSeen])

  useEffect(() => {
    let active = true
    window.electronAPI.getHardwareInfo().then((info) => {
      if (!active) return
      setHardware(info)
      setSteps(buildSteps(info))
    })
    return () => {
      active = false
    }
  }, [])

  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  // Focus trap: save previous focus, move into modal, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      // Move focus to the first focusable element inside the dialog
      requestAnimationFrame(() => {
        const first = getFocusable(dialogRef.current)[0]
        if (first) (first as HTMLElement).focus()
      })
    } else {
      // Restore focus to the element that triggered the modal
      if (previousFocusRef.current && (previousFocusRef.current as HTMLElement).focus) {
        ;(previousFocusRef.current as HTMLElement).focus()
      }
    }
  }, [isOpen])

  const close = () => {
    setIsOpen(false)
    setTutorialSeen(true)
  }

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  useEffect(() => {
    if (!isOpen || !step || step.verify !== 'mic-virtual') return
    let cancelled = false
    let attempts = 0
    setPolling(true)
    setMicVerified(false)
    const tick = async () => {
      if (cancelled) return
      try {
        const status = await window.electronAPI.getVirtualMicStatus()
        if (status) {
          setMicVerified(true)
          setPolling(false)
          return
        }
      } catch {
        /* ignore */
      }
      attempts += 1
      if (attempts < 10 && !cancelled) {
        setTimeout(tick, 1000)
      } else {
        setPolling(false)
      }
    }
    void tick()
    return () => {
      cancelled = true
      setPolling(false)
    }
  }, [isOpen, stepIndex, step])

  const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  function getFocusable(root: HTMLElement | null): Element[] {
    return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      close()
      return
    }
    if (e.key !== 'Tab') return
    const focusable = getFocusable(dialogRef.current)
    if (focusable.length === 0) return
    const first = focusable[0] as HTMLElement
    const last = focusable[focusable.length - 1] as HTMLElement
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const next = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((index) => index + 1)
    } else {
      close()
    }
  }

  const prev = () => {
    if (stepIndex > 0) setStepIndex((index) => index - 1)
  }

  const trackHardware = hardware ? `${hardware.gpuVendor.toUpperCase()} · ${hardware.ramGB} GB` : 'Detecting hardware...'

  if (!isOpen) return null

  return (
    <div
      className="fixed right-0 inset-y-0 z-40 flex flex-col w-full max-w-[400px] animate-slide-in-right overflow-hidden"
      style={{
        borderLeft: '1px solid var(--vl-hud-border-strong)',
        background: 'var(--vl-surface-overlay)',
        backdropFilter: 'blur(12px)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
      }}
      role="complementary"
      aria-modal="false"
      aria-label="Onboarding tutorial"
      aria-labelledby="onboarding-title"
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      {/* Progress bar */}
      <div className="flex items-center gap-1 px-5 pt-5 pb-2 flex-shrink-0">
        {steps.map((_, index) => (
          <div
            key={index}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{
              background: index <= stepIndex ? 'var(--vl-state-ready)' : 'var(--vl-surface-sunken)',
              boxShadow: 'none',
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-1 pb-2 flex-shrink-0">
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-mute">
          Step {stepIndex + 1} of {steps.length} · {trackHardware}
        </span>
        <button
          onClick={close}
          className="p-2 rounded-lg text-ink-soft hover:bg-brand-500/15 hover:text-ink-strong transition-colors"
          title="Skip tutorial"
          aria-label="Skip tutorial"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable step content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'var(--vl-surface-raised)',
            border: '1px solid var(--vl-hud-border-strong)',
            boxShadow: 'none',
          }}
        >
          {step.icon}
        </div>

        <h2 id="onboarding-title" className="text-lg font-bold text-ink-strong mb-2" style={{ color: 'var(--vl-purple-200)' }}>
          {step.title}
        </h2>
        <p className="text-sm text-ink-body leading-relaxed mb-3">{step.description}</p>

        {step.tip && (
          <div
            className="rounded-2xl p-3 text-sm mb-3 text-left"
            style={{
              background: 'var(--vl-surface-overlay)',
              border: '1px solid var(--vl-hud-border)',
              color: 'var(--vl-purple-200)',
            }}
          >
            <strong>Tip:</strong> {step.tip}
          </div>
        )}

        {step.verify === 'mic-virtual' && (
          <div
            className="rounded-2xl p-3 text-sm mb-4 text-left flex items-center gap-2"
            style={{
              background: micVerified ? 'var(--vl-state-success-bg)' : 'var(--vl-state-live-bg)',
              border: `1px solid ${micVerified ? 'var(--vl-state-success-border)' : 'var(--vl-state-live-border)'}`,
              color: micVerified ? 'var(--vl-state-success-text)' : 'var(--vl-state-live-text)',
            }}
          >
            {micVerified ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : polling ? (
              <Volume2 className="h-5 w-5 flex-shrink-0 animate-pulse" />
            ) : (
              <Volume2 className="h-5 w-5 flex-shrink-0" />
            )}
            <span>
              {micVerified
                ? 'Virtual microphone active. Discord/VRChat should hear you now.'
                : polling
                  ? 'Waiting for you to enable the virtual microphone ("Enable" button on the Speak tab)...'
                  : 'Virtual microphone not detected yet. You can continue and set it up later in Settings.'}
            </span>
          </div>
        )}
      </div>

      {/* Footer nav — always visible */}
      <div
        className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4"
        style={{ borderTop: '1px solid var(--vl-hud-border)' }}
      >
        <button
          onClick={prev}
          disabled={stepIndex === 0}
          className="px-4 py-2 text-sm text-ink-soft hover:text-ink-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>

        <div className="flex gap-2">
          {!isLast && (
            <button
              onClick={close}
              className="px-4 py-2 text-sm text-ink-soft hover:text-ink-strong flex items-center gap-1.5 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          )}

          <button onClick={next} className="btn-primary flex items-center gap-2 px-5">
            {isLast ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Get started
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

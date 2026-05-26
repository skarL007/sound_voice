import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToastStore } from './toastStore'

beforeEach(() => {
  vi.useFakeTimers()
  // Reset store state between tests
  useToastStore.setState({ toasts: [], pausedIds: new Set() })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('toastStore', () => {
  it('addToast adds a toast with generated id', () => {
    useToastStore.getState().addToast({ title: 'Hi', message: 'Hello', type: 'info' })
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].title).toBe('Hi')
    expect(toasts[0].id).toBeTruthy()
  })

  it('toast is auto-removed after duration expires', () => {
    useToastStore.getState().addToast({ title: 'T', message: 'M', type: 'success', duration: 2000 })
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(2001)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('removeToast removes immediately and clears timer', () => {
    useToastStore.getState().addToast({ title: 'T', message: 'M', type: 'info', duration: 4000 })
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().removeToast(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
    // Timer should have been cleared — advancing does not error
    vi.advanceTimersByTime(5000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('pauseToast stops the auto-dismiss timer', () => {
    useToastStore.getState().addToast({ title: 'T', message: 'M', type: 'warn', duration: 2000 })
    const id = useToastStore.getState().toasts[0].id
    vi.advanceTimersByTime(1000)   // consume half the duration
    useToastStore.getState().pauseToast(id)
    vi.advanceTimersByTime(5000)   // would have expired without pause
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().pausedIds.has(id)).toBe(true)
  })

  it('resumeToast restarts timer for remaining duration', () => {
    useToastStore.getState().addToast({ title: 'T', message: 'M', type: 'error', duration: 2000 })
    const id = useToastStore.getState().toasts[0].id
    vi.advanceTimersByTime(1000)   // 1000ms elapsed, 1000ms remain
    useToastStore.getState().pauseToast(id)
    useToastStore.getState().resumeToast(id)
    vi.advanceTimersByTime(999)    // 999ms — still alive
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(2)      // 1001ms total since resume — gone
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('duration 0 means persistent — never auto-removed', () => {
    useToastStore.getState().addToast({ title: 'T', message: 'M', type: 'info', duration: 0 })
    vi.advanceTimersByTime(60_000)
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })
})

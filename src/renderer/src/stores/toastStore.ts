import { create } from 'zustand'

export interface Toast {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  expiresAt?: number
}

interface ToastState {
  toasts: Toast[]
  pausedIds: Set<string>
  addToast: (toast: Omit<Toast, 'id' | 'expiresAt'>) => void
  removeToast: (id: string) => void
  pauseToast: (id: string) => void
  resumeToast: (id: string) => void
}

// Module-level timer map — kept outside Zustand state to avoid serialization
// issues with devtools and avoid triggering unnecessary re-renders.
const _timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  pausedIds: new Set(),

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = toast.duration !== undefined ? toast.duration : 4000
    const expiresAt = duration !== 0 ? Date.now() + duration : undefined

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, expiresAt }],
    }))

    if (duration !== 0) {
      const timer = setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        _timers.delete(id)
      }, duration)
      _timers.set(id, timer)
    }
  },

  removeToast: (id) => {
    const timer = _timers.get(id)
    if (timer) clearTimeout(timer)
    _timers.delete(id)
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
      pausedIds: new Set([...state.pausedIds].filter((pid) => pid !== id)),
    }))
  },

  pauseToast: (id) => {
    const timer = _timers.get(id)
    if (timer) {
      clearTimeout(timer)
      _timers.delete(id)
    }
    set((state) => ({ pausedIds: new Set([...state.pausedIds, id]) }))
  },

  resumeToast: (id) => {
    const toast = get().toasts.find((t) => t.id === id)
    if (!toast || !toast.expiresAt) return

    const remaining = toast.expiresAt - Date.now()
    if (remaining <= 0) {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
        pausedIds: new Set([...state.pausedIds].filter((pid) => pid !== id)),
      }))
      return
    }

    const timer = setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      _timers.delete(id)
    }, remaining)
    _timers.set(id, timer)

    set((state) => ({
      pausedIds: new Set([...state.pausedIds].filter((pid) => pid !== id)),
    }))
  },
}))

import { useToastStore } from '../stores/toastStore'

export function toast(title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  useToastStore.getState().addToast({ title, message, type })
}

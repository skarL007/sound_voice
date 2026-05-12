export function notify(title: string, body: string) {
  if (window.electronAPI?.showNotification) {
    window.electronAPI.showNotification(title, body)
  }
}

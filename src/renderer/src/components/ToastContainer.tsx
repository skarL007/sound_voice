import { useToastStore } from '../stores/toastStore'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

const iconMap = {
  success: <CheckCircle2 className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
}

const borderMap = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  warning: 'border-yellow-500/30',
}

const bgMap = {
  success: 'bg-green-500/10',
  error: 'bg-red-500/10',
  info: 'bg-blue-500/10',
  warning: 'bg-yellow-500/10',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto min-w-[280px] max-w-md p-4 rounded-xl border backdrop-blur-md shadow-lg animate-in slide-in-from-right-2 fade-in duration-200 ${borderMap[toast.type]} ${bgMap[toast.type]}`}
        >
          <div className="flex items-start gap-3">
            {iconMap[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-slate-700/50 rounded text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

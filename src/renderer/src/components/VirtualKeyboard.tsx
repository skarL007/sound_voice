import { useState } from 'react'
import { Keyboard, X, Delete, CornerDownLeft, Space } from 'lucide-react'

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void
  onBackspace: () => void
  onEnter: () => void
  onSpace: () => void
}

const rows = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ç'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  [',', '.', '!', '?', 'ã', 'õ', 'â', 'ê', 'ô', 'á', 'é', 'í', 'ó', 'ú'],
]

export function VirtualKeyboardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-secondary flex items-center gap-2 text-sm"
      title="Teclado virtual"
    >
      <Keyboard className="w-4 h-4" />
      Teclado
    </button>
  )
}

export default function VirtualKeyboard({ onKeyPress, onBackspace, onEnter, onSpace }: VirtualKeyboardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isShift, setIsShift] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-secondary flex items-center gap-2 text-sm"
        title="Abrir teclado virtual"
      >
        <Keyboard className="w-4 h-4" />
        Teclado Virtual
      </button>
    )
  }

  const handleKey = (key: string) => {
    onKeyPress(isShift ? key.toUpperCase() : key)
    if (isShift) setIsShift(false)
  }

  return (
    <div className="glass-panel p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Teclado Virtual</span>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-700 rounded text-slate-400 transition-colors"
          title="Fechar teclado"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="min-w-[2rem] h-10 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors active:bg-brand-600 active:border-brand-500 active:text-white"
              >
                {isShift ? key.toUpperCase() : key}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-center pt-1">
        <button
          onClick={() => setIsShift((s) => !s)}
          className={`h-10 px-4 rounded-lg font-medium text-sm border transition-colors ${
            isShift
              ? 'bg-brand-600 text-white border-brand-500'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          }`}
        >
          Shift
        </button>

        <button
          onClick={onSpace}
          className="h-10 px-8 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors active:bg-brand-600 active:border-brand-500"
        >
          <Space className="w-4 h-4" />
        </button>

        <button
          onClick={onBackspace}
          className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition-colors active:bg-red-600 active:border-red-500"
        >
          <Delete className="w-4 h-4" />
        </button>

        <button
          onClick={onEnter}
          className="h-10 px-4 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg border border-brand-500 transition-colors"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

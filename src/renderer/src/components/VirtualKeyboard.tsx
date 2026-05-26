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

const KEY_BASE_CLASS = 'min-w-[2rem] h-10 px-2 text-sm font-medium rounded-lg border transition-colors'
const KEY_BASE_STYLE: React.CSSProperties = {
  background: 'rgba(19,9,43,0.78)',
  borderColor: 'var(--vl-hud-border)',
  color: 'var(--vl-ink-strong)',
}

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
        aria-label="Abrir teclado virtual"
        aria-expanded={false}
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
    <div className="hud-frame p-3 space-y-2 animate-lift-in">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-ink-soft uppercase tracking-wider" id="vkb-label">Teclado Virtual</span>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded text-ink-soft hover:bg-brand-500/15 hover:text-ink-strong transition-colors"
          title="Fechar teclado"
          aria-label="Fechar teclado virtual"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5" role="group" aria-label="Teclas de caractere">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center">
            {row.map((key) => {
              const label = isShift ? key.toUpperCase() : key
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={KEY_BASE_CLASS}
                  style={KEY_BASE_STYLE}
                  aria-label={label}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-center pt-1">
        <button
          onClick={() => setIsShift((s) => !s)}
          className={`h-10 px-4 rounded-lg font-medium text-sm border transition-colors ${
            isShift ? 'btn-primary' : ''
          }`}
          style={isShift ? undefined : KEY_BASE_STYLE}
          aria-label={isShift ? 'Shift ativado' : 'Shift desativado'}
          aria-pressed={isShift}
        >
          Shift
        </button>

        <button
          onClick={onSpace}
          className="h-10 px-8 rounded-lg text-sm font-medium border transition-colors"
          style={KEY_BASE_STYLE}
          aria-label="Espaco"
        >
          <Space className="w-4 h-4" />
        </button>

        <button
          onClick={onBackspace}
          className="h-10 px-4 rounded-lg text-sm font-medium border transition-colors"
          style={{ ...KEY_BASE_STYLE, color: 'var(--vl-state-error)' }}
          aria-label="Apagar"
        >
          <Delete className="w-4 h-4" />
        </button>

        <button
          onClick={onEnter}
          className="btn-primary h-10 px-4 rounded-lg"
          aria-label="Enviar"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

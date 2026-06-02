import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import VirtualMicSetupPanel from './VirtualMicSetupPanel'

interface ButtonProps {
  onClick?: () => void
  disabled?: boolean
  children?: ReactNode
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (React.isValidElement<{ children?: ReactNode }>(node)) {
    if (typeof node.type === 'function') {
      return textOf((node.type as (props: Record<string, unknown>) => ReactNode)(node.props as Record<string, unknown>))
    }
    return textOf(node.props.children)
  }
  return ''
}

function findButtonByText(node: ReactNode, label: string): ReactElement<ButtonProps> | null {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (typeof node === 'string' || typeof node === 'number') return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButtonByText(child, label)
      if (found) return found
    }
    return null
  }
  if (!React.isValidElement<ButtonProps>(node)) return null
  if (typeof node.type === 'function') {
    return findButtonByText(
      (node.type as (props: Record<string, unknown>) => ReactNode)(node.props as Record<string, unknown>),
      label,
    )
  }
  if (node.type === 'button' && textOf(node).includes(label)) return node
  return findButtonByText(node.props.children, label)
}

describe('VirtualMicSetupPanel', () => {
  it('mostra acao de baixar/instalar quando o VB-Cable esta ausente', () => {
    const onInstall = vi.fn()
    const element = (
      <VirtualMicSetupPanel detected={false} installState="idle" onInstall={onInstall} onVerify={vi.fn()} />
    )

    expect(textOf(element)).toContain('Microfone virtual nao instalado')
    const button = findButtonByText(element, 'Baixar e instalar microfone virtual')
    expect(button).not.toBeNull()

    button?.props.onClick?.()
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('mostra a barra de progresso durante o download', () => {
    const element = (
      <VirtualMicSetupPanel
        detected={false}
        installState="downloading"
        progress={{ percent: 45, speed: '1.2 MB/s', eta: '3s' }}
        onInstall={vi.fn()}
        onVerify={vi.fn()}
      />
    )

    expect(textOf(element)).toContain('45%')
    expect(textOf(element)).toContain('1.2 MB/s')
  })

  it('mostra a verificacao depois que o instalador abre', () => {
    const onVerify = vi.fn()
    const element = (
      <VirtualMicSetupPanel
        detected={false}
        installState="launched"
        message='Instalador aberto. Clique em "Install Driver".'
        onInstall={vi.fn()}
        onVerify={onVerify}
      />
    )

    expect(textOf(element)).toContain('Instalador aberto')
    const button = findButtonByText(element, 'Verificar instalacao')
    expect(button).not.toBeNull()

    button?.props.onClick?.()
    expect(onVerify).toHaveBeenCalledTimes(1)
  })

  it('mostra orientacao de download manual quando nao automatizou', () => {
    const element = (
      <VirtualMicSetupPanel
        detected={false}
        installState="manual"
        message="Site oficial aberto."
        onInstall={vi.fn()}
        onVerify={vi.fn()}
      />
    )

    expect(textOf(element)).toContain('Site oficial aberto')
    expect(textOf(element)).toContain('Verificar instalacao')
  })

  it('mostra a acao de ativar quando o VB-Cable e detectado', () => {
    const onActivate = vi.fn()
    const element = (
      <VirtualMicSetupPanel
        detected
        installState="idle"
        onInstall={vi.fn()}
        onVerify={vi.fn()}
        onActivate={onActivate}
      />
    )

    expect(textOf(element)).toContain('VB-Cable detectado')
    const button = findButtonByText(element, 'Ativar microfone virtual')
    expect(button).not.toBeNull()

    button?.props.onClick?.()
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})

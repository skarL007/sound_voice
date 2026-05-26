import { describe, it, expect } from 'vitest'
import { alertConfig } from './alertConfig'
import type { AlertSeverity } from './alertConfig'

const severities: AlertSeverity[] = ['error', 'warn', 'info', 'success']

describe('alertConfig', () => {
  it('each severity has all CSS-variable fields', () => {
    for (const sev of severities) {
      const cfg = alertConfig[sev]
      expect(cfg.borderColor).toMatch(/^var\(--/)
      expect(cfg.background).toMatch(/^var\(--/)
      expect(cfg.iconColor).toMatch(/^var\(--/)
      expect(cfg.titleColor).toMatch(/^var\(--/)
    }
  })

  it('each severity uses a distinct icon component', () => {
    const icons = severities.map((s) => alertConfig[s].Icon)
    const unique = new Set(icons)
    expect(unique.size).toBe(severities.length)
  })

  it('error and warn CSS variables differ from each other', () => {
    const error = alertConfig['error']
    const warn = alertConfig['warn']
    expect(error.borderColor).not.toBe(warn.borderColor)
    expect(error.background).not.toBe(warn.background)
    expect(error.iconColor).not.toBe(warn.iconColor)
    expect(error.titleColor).not.toBe(warn.titleColor)
  })
})

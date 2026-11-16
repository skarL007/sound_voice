import { describe, expect, it } from 'vitest'
import { localeRank } from './ShortcutControls'

describe('localeRank', () => {
  it('keeps pt-BR first for English', () => {
    expect(localeRank('pt-BR')).toBe(0)
    expect(localeRank('pt-BR', 'en')).toBe(0)
    expect(localeRank('fr-FR', 'en')).toBe(9)
  })

  it('puts fr-FR first, then other fr-*, for a French interface', () => {
    expect(localeRank('fr-FR', 'fr')).toBe(0)
    expect(localeRank('fr-CA', 'fr')).toBe(1)
    expect(localeRank('en-US', 'fr')).toBeGreaterThan(localeRank('fr-CA', 'fr'))
    expect(localeRank('pt-BR', 'fr')).toBeGreaterThan(localeRank('fr-CA', 'fr'))
  })
})

import { describe, expect, it } from 'vitest'
import i18n, { buildResources, detectLanguage, isLanguage } from './index'

describe('i18n renderer', () => {
  it('detects fr from navigator.language, otherwise en', () => {
    expect(detectLanguage('fr-FR')).toBe('fr')
    expect(detectLanguage('FR')).toBe('fr')
    expect(detectLanguage('pt-BR')).toBe('en')
    expect(detectLanguage(undefined)).toBe('en')
  })

  it('is forced to en under test and resolves common keys', () => {
    expect(i18n.language).toBe('en')
    expect(i18n.t('cancel')).toBe('Cancel')
    expect(i18n.t('settings:language.title')).toBe('Language')
  })

  it('translates to fr and falls back to en for a missing key', async () => {
    i18n.addResource('en', 'common', 'onlyEn', 'English only')
    await i18n.changeLanguage('fr')
    try {
      expect(i18n.t('cancel')).toBe('Annuler')
      expect(i18n.t('onlyEn')).toBe('English only')
      expect(i18n.t('missing.key')).toBe('missing.key')
    } finally {
      await i18n.changeLanguage('en')
    }
  })

  it('validates supported languages', () => {
    expect(isLanguage('fr')).toBe(true)
    expect(isLanguage('de')).toBe(false)
  })

  it('builds resources from locales/<lng>/<ns>.json paths', () => {
    expect(buildResources({ './locales/fr/ui.json': { default: { a: 'b' } } })).toEqual({ fr: { ui: { a: 'b' } } })
  })
})

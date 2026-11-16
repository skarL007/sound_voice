import { afterEach, describe, expect, it } from 'vitest'
import { en } from './locales/en'
import { fr } from './locales/fr'
import { getMainLanguage, setMainLanguage, tMain } from './i18n'

describe('tMain', () => {
  afterEach(() => {
    delete en['t.hello']
    delete en['t.onlyEn']
    delete fr['t.hello']
    setMainLanguage('en')
  })

  it('interpolates {{var}} and falls back to en then to the key', () => {
    en['t.hello'] = 'Hello {{name}}, {{n}} new'
    fr['t.hello'] = 'Bonjour {{name}}, {{n}} nouveaux'
    en['t.onlyEn'] = 'English only'

    expect(tMain('t.hello', { name: 'Ana', n: 2 })).toBe('Hello Ana, 2 new')
    setMainLanguage('fr')
    expect(getMainLanguage()).toBe('fr')
    expect(tMain('t.hello', { name: 'Ana', n: 2 })).toBe('Bonjour Ana, 2 nouveaux')
    expect(tMain('t.onlyEn')).toBe('English only')
    expect(tMain('t.unknown')).toBe('t.unknown')
    expect(tMain('t.hello')).toBe('Bonjour {{name}}, {{n}} nouveaux')
  })

  it('treats unknown languages as en', () => {
    setMainLanguage('de')
    expect(getMainLanguage()).toBe('en')
  })
})

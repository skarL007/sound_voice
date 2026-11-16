import { en } from './locales/en'
import { fr } from './locales/fr'

export type MainLanguage = 'en' | 'fr'

const dictionaries: Record<MainLanguage, Record<string, string>> = { en, fr }

let current: MainLanguage = 'en'

export function setMainLanguage(lng: string): void {
  current = lng === 'fr' ? 'fr' : 'en'
}

export function getMainLanguage(): MainLanguage {
  return current
}

/** Repli : langue courante, puis en, puis la cle elle-meme. */
export function tMain(key: string, vars?: Record<string, string | number>): string {
  const template = dictionaries[current][key] ?? dictionaries.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

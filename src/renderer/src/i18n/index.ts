import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

/** 'fr', 'fr-FR'... -> 'fr'; anything else -> 'en'. */
export function detectLanguage(navigatorLanguage?: string): Language {
  return navigatorLanguage?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

/** Langue enregistree si valide, sinon celle deja detectee de maniere synchrone au demarrage. */
export function resolveLanguage(settings?: { language?: unknown } | null): Language {
  if (isLanguage(settings?.language)) return settings.language
  return isLanguage(i18n.language) ? i18n.language : 'en'
}

// locales/<lng>/<namespace>.json : le nom du fichier est le namespace.
type JsonModule = { default: Record<string, unknown> }
const modules = import.meta.glob<JsonModule>('./locales/*/*.json', { eager: true })

export function buildResources(
  mods: Record<string, JsonModule>,
): Record<string, Record<string, Record<string, unknown>>> {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {}
  for (const [path, mod] of Object.entries(mods)) {
    const match = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path)
    if (!match) continue
    const [, lng, ns] = match
    ;(resources[lng] ??= {})[ns] = mod.default
  }
  return resources
}

function pushLanguageToMain(lng: string): void {
  if (typeof window === 'undefined') return
  window.electronAPI?.setLanguage?.(lng)
}

i18n.use(initReactI18next).init({
  resources: buildResources(modules),
  lng: detectLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
})

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
  pushLanguageToMain(lng)
})

if (typeof document !== 'undefined') document.documentElement.lang = i18n.language
pushLanguageToMain(i18n.language)

// Reglage persistant (settings.json, cle `language`) : prioritaire sur la detection.
if (typeof window !== 'undefined') {
  void window.electronAPI
    ?.loadSettings?.()
    .then((saved) => {
      if (isLanguage(saved?.language) && saved.language !== i18n.language) {
        void i18n.changeLanguage(saved.language)
      }
    })
    .catch(() => undefined)
}

/** Change la langue de l'interface et la persiste. */
export function setLanguage(lng: Language): Promise<unknown> {
  window.electronAPI?.saveSettings?.({ language: lng })
  return i18n.changeLanguage(lng)
}

export default i18n

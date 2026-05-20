import type { AppSettings, TTSHistoryItem } from '../../../shared/types'

export const MAX_HISTORY_ITEMS = 20
export const MAX_QUICK_PHRASES = 12

export const DEFAULT_QUICK_PHRASES = [
  'Ola.',
  'Nao consigo falar agora.',
  'Por favor, leia o que eu digitei.',
  'Sim.',
  'Nao.',
  'Preciso de ajuda.',
  'Pode repetir, por favor?',
  'Preciso de agua.',
  'Onde fica o banheiro?',
  'Estou com dor.',
]

export interface CommunicationState {
  ttsDraft: string
  ttsHistory: TTSHistoryItem[]
  quickPhrases: string[]
  keepTextAfterSpeak: boolean
}

export const DEFAULT_COMMUNICATION_STATE: CommunicationState = {
  ttsDraft: '',
  ttsHistory: [],
  quickPhrases: DEFAULT_QUICK_PHRASES,
  keepTextAfterSpeak: true,
}

function normalizePhrase(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function sanitizeHistoryItem(value: unknown): TTSHistoryItem | null {
  if (!value || typeof value !== 'object') return null

  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || typeof item.text !== 'string' || typeof item.modelId !== 'string' || typeof item.timestamp !== 'number') {
    return null
  }

  const text = normalizePhrase(item.text)
  if (!text) return null

  return {
    id: item.id,
    text,
    modelId: item.modelId,
    voiceId: typeof item.voiceId === 'string' ? item.voiceId : undefined,
    timestamp: item.timestamp,
    audioPath: typeof item.audioPath === 'string' ? item.audioPath : undefined,
  }
}

export function sanitizeCommunicationState(settings: Partial<AppSettings> | null | undefined): CommunicationState {
  const rawQuickPhrases = Array.isArray(settings?.quickPhrases) ? settings.quickPhrases : []
  const quickPhrases = rawQuickPhrases
    .filter((value): value is string => typeof value === 'string')
    .map(normalizePhrase)
    .filter(Boolean)
    .filter((value, index, list) => list.findIndex((entry) => entry.toLowerCase() === value.toLowerCase()) === index)
    .slice(0, MAX_QUICK_PHRASES)

  const rawHistory = Array.isArray(settings?.ttsHistory) ? settings.ttsHistory : []
  const ttsHistory = rawHistory
    .map(sanitizeHistoryItem)
    .filter((item): item is TTSHistoryItem => item !== null)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_HISTORY_ITEMS)

  return {
    ttsDraft: typeof settings?.ttsDraft === 'string' ? settings.ttsDraft.slice(0, 5000) : '',
    ttsHistory,
    quickPhrases: quickPhrases.length > 0 ? quickPhrases : DEFAULT_QUICK_PHRASES,
    keepTextAfterSpeak: typeof settings?.keepTextAfterSpeak === 'boolean' ? settings.keepTextAfterSpeak : true,
  }
}

function generateHistoryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function buildHistoryItem(input: {
  text: string
  modelId: string
  voiceId?: string
  audioPath?: string
}): TTSHistoryItem {
  return {
    id: generateHistoryId(),
    text: normalizePhrase(input.text),
    modelId: input.modelId,
    voiceId: input.voiceId,
    timestamp: Date.now(),
    audioPath: input.audioPath,
  }
}

export function pushHistoryItem(history: TTSHistoryItem[], item: TTSHistoryItem): TTSHistoryItem[] {
  const textKey = item.text.toLowerCase()
  const next = [
    item,
    ...history.filter((entry) => !(entry.text.toLowerCase() === textKey && entry.modelId === item.modelId && entry.voiceId === item.voiceId)),
  ]

  return next.slice(0, MAX_HISTORY_ITEMS)
}

export function upsertQuickPhrase(phrases: string[], phrase: string): string[] {
  const normalized = normalizePhrase(phrase)
  if (!normalized) return phrases

  return [
    normalized,
    ...phrases.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, MAX_QUICK_PHRASES)
}

export function removeQuickPhrase(phrases: string[], phrase: string): string[] {
  const normalized = normalizePhrase(phrase)
  const next = phrases.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase())
  return next.length > 0 ? next : DEFAULT_QUICK_PHRASES
}

export function serializeCommunicationState(state: CommunicationState): Pick<AppSettings, 'ttsDraft' | 'ttsHistory' | 'quickPhrases' | 'keepTextAfterSpeak'> {
  return {
    ttsDraft: state.ttsDraft,
    ttsHistory: state.ttsHistory,
    quickPhrases: state.quickPhrases,
    keepTextAfterSpeak: state.keepTextAfterSpeak,
  }
}

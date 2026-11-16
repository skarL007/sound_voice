/**
 * Intelligent TTS engine routing — the "Auto" voice source.
 *
 * Pure decision function: given connectivity, Edge TTS health, hardware tier,
 * installed local models and the text to speak, decide which engine should
 * synthesize. Online-first: Edge wins whenever it is reachable and healthy;
 * local engines (Kokoro > Piper) are the offline/degraded fallback. An explicit
 * user choice ('cloud' | 'local') always wins over routing.
 *
 * Lives in the renderer on purpose: the cloud path never touches the Python
 * backend, and every input needed for the decision is already here.
 */

import i18n from '../i18n'

export type RoutedEngine = 'edge' | 'kokoro' | 'piper' | null

export type RoutingReason =
  | 'explicit-cloud'
  | 'explicit-local'
  | 'online'
  | 'offline'
  | 'edge-unhealthy'
  | 'offline-no-local-voice'

export interface EngineRouteInput {
  /** User voice source: 'auto' routes, anything else is a passthrough. */
  mode: 'auto' | 'cloud' | 'local'
  /** navigator.onLine (or equivalent) at speak time. */
  online: boolean
  /** False while Edge TTS is in the failure cooldown window. */
  edgeHealthy: boolean
  /** hardware_probe recommendedTier: edge|cpu|entry|mid|high|enthusiast. */
  hardwareTier?: string
  /** Registry ids of installed local models (e.g. ['piper', 'kokoro']). */
  installedModels: string[]
  /** Length of the text about to be spoken. */
  textLength: number
  /** Preferred local model when the user explicitly picked 'local'. */
  preferredLocalModelId?: string
}

export interface EngineDecision {
  engine: RoutedEngine
  /** Registry model id for local engines ('kokoro' | 'piper'). */
  modelId?: string
  reason: RoutingReason
  /** Short human-readable status, e.g. "Auto → Edge (online)". */
  label: string
}

/** Hardware tiers in ascending capability order (from hardware_probe). */
const TIER_ORDER = ['edge', 'cpu', 'entry', 'mid', 'high', 'enthusiast']

/** Above this length, weak (edge-tier) hardware prefers Piper for latency. */
export const LONG_TEXT_THRESHOLD = 500

/** Cooldown after an Edge TTS failure before Auto tries it again. */
export const EDGE_FAILURE_COOLDOWN_MS = 60_000

function tierRank(tier?: string): number {
  const rank = TIER_ORDER.indexOf((tier ?? '').toLowerCase())
  // Unknown tier: assume mid-range CPU-capable hardware rather than punishing it.
  return rank === -1 ? TIER_ORDER.indexOf('cpu') : rank
}

function pickLocalEngine(input: EngineRouteInput): { engine: 'kokoro' | 'piper'; modelId: string } | null {
  const hasKokoro = input.installedModels.includes('kokoro')
  const hasPiper = input.installedModels.includes('piper')

  // Kokoro sounds better (MOS 4.2) but is heavier; on weak hardware with long
  // text, Piper answers faster and latency beats fidelity in a conversation.
  const weakHardware = tierRank(input.hardwareTier) <= TIER_ORDER.indexOf('edge')
  const longText = input.textLength > LONG_TEXT_THRESHOLD
  const preferPiperForLatency = weakHardware || (longText && tierRank(input.hardwareTier) <= TIER_ORDER.indexOf('cpu'))

  if (hasKokoro && !(preferPiperForLatency && hasPiper)) {
    return { engine: 'kokoro', modelId: 'kokoro' }
  }
  if (hasPiper) return { engine: 'piper', modelId: 'piper' }
  if (hasKokoro) return { engine: 'kokoro', modelId: 'kokoro' }
  return null
}

export function routeEngine(input: EngineRouteInput): EngineDecision {
  if (input.mode === 'cloud') {
    return { engine: 'edge', reason: 'explicit-cloud', label: i18n.t('utils:router.explicitCloud') }
  }

  if (input.mode === 'local') {
    const preferred = input.preferredLocalModelId
    if (preferred && input.installedModels.includes(preferred) && (preferred === 'kokoro' || preferred === 'piper')) {
      return { engine: preferred, modelId: preferred, reason: 'explicit-local', label: i18n.t('utils:router.explicitLocal', { engine: preferred }) }
    }
    const local = pickLocalEngine(input)
    if (local) {
      return { ...local, reason: 'explicit-local', label: i18n.t('utils:router.explicitLocal', { engine: local.engine }) }
    }
    return { engine: null, reason: 'offline-no-local-voice', label: i18n.t('utils:router.noLocal') }
  }

  // Auto
  if (input.online && input.edgeHealthy) {
    return { engine: 'edge', reason: 'online', label: i18n.t('utils:router.autoOnline') }
  }

  const reason: RoutingReason = input.online ? 'edge-unhealthy' : 'offline'
  const local = pickLocalEngine(input)
  if (local) {
    const why = i18n.t(reason === 'offline' ? 'utils:router.whyOffline' : 'utils:router.whyEdgeUnavailable')
    return { ...local, reason, label: i18n.t('utils:router.autoLocal', { engine: capitalize(local.engine), why }) }
  }

  return {
    engine: null,
    reason: 'offline-no-local-voice',
    label: i18n.t(input.online ? 'utils:router.edgeUnavailableNoLocal' : 'utils:router.offlineNoLocal'),
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

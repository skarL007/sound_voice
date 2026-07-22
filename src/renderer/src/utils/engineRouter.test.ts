import { describe, expect, it } from 'vitest'
import { LONG_TEXT_THRESHOLD, routeEngine, type EngineRouteInput } from './engineRouter'

const base: EngineRouteInput = {
  mode: 'auto',
  online: true,
  edgeHealthy: true,
  hardwareTier: 'mid',
  installedModels: ['piper', 'kokoro'],
  textLength: 40,
}

describe('routeEngine — passthrough explicito', () => {
  it('cloud explicito sempre vai para o Edge, mesmo offline', () => {
    const decision = routeEngine({ ...base, mode: 'cloud', online: false })
    expect(decision.engine).toBe('edge')
    expect(decision.reason).toBe('explicit-cloud')
  })

  it('local explicito usa o modelo preferido quando instalado', () => {
    const decision = routeEngine({ ...base, mode: 'local', preferredLocalModelId: 'piper' })
    expect(decision).toMatchObject({ engine: 'piper', modelId: 'piper', reason: 'explicit-local' })
  })

  it('local explicito sem modelo instalado retorna engine null', () => {
    const decision = routeEngine({ ...base, mode: 'local', installedModels: [] })
    expect(decision.engine).toBeNull()
    expect(decision.reason).toBe('offline-no-local-voice')
  })
})

describe('routeEngine — auto', () => {
  const cases: Array<{
    name: string
    input: Partial<EngineRouteInput>
    engine: string | null
    reason: string
  }> = [
    { name: 'online e saudavel → Edge', input: {}, engine: 'edge', reason: 'online' },
    {
      name: 'offline com kokoro instalado → Kokoro',
      input: { online: false },
      engine: 'kokoro',
      reason: 'offline',
    },
    {
      name: 'online mas Edge em cooldown → local',
      input: { edgeHealthy: false },
      engine: 'kokoro',
      reason: 'edge-unhealthy',
    },
    {
      name: 'offline sem kokoro → Piper',
      input: { online: false, installedModels: ['piper'] },
      engine: 'piper',
      reason: 'offline',
    },
    {
      name: 'offline sem nenhum modelo → null com CTA',
      input: { online: false, installedModels: [] },
      engine: null,
      reason: 'offline-no-local-voice',
    },
    {
      name: 'tier edge (hardware fraco) offline → Piper mesmo com kokoro',
      input: { online: false, hardwareTier: 'edge' },
      engine: 'piper',
      reason: 'offline',
    },
    {
      name: 'texto longo em tier cpu offline → Piper (latencia)',
      input: { online: false, hardwareTier: 'cpu', textLength: LONG_TEXT_THRESHOLD + 1 },
      engine: 'piper',
      reason: 'offline',
    },
    {
      name: 'texto longo em tier alto offline → Kokoro (aguenta)',
      input: { online: false, hardwareTier: 'high', textLength: LONG_TEXT_THRESHOLD + 1 },
      engine: 'kokoro',
      reason: 'offline',
    },
    {
      name: 'tier desconhecido tratado como cpu-capaz',
      input: { online: false, hardwareTier: undefined },
      engine: 'kokoro',
      reason: 'offline',
    },
    {
      name: 'hardware fraco offline so com kokoro → usa kokoro (melhor que nada)',
      input: { online: false, hardwareTier: 'edge', installedModels: ['kokoro'] },
      engine: 'kokoro',
      reason: 'offline',
    },
  ]

  for (const testCase of cases) {
    it(testCase.name, () => {
      const decision = routeEngine({ ...base, ...testCase.input })
      expect(decision.engine).toBe(testCase.engine)
      expect(decision.reason).toBe(testCase.reason)
      expect(decision.label.length).toBeGreaterThan(0)
    })
  }
})

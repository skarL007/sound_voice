import { describe, expect, it } from 'vitest'
import { buildAudioOutputs } from './cloudAudio'

describe('buildAudioOutputs', () => {
  it('plays only on the default speaker when there is no cable (preview)', () => {
    expect(buildAudioOutputs()).toEqual([{}])
    // sem cabo, o monitor nao importa: a voz ja toca no padrao
    expect(buildAudioOutputs({ monitorDeviceId: 'headset-id' })).toEqual([{}])
    expect(buildAudioOutputs({ monitorDeviceId: null })).toEqual([{}])
  })

  it('routes to cable plus the default-system monitor', () => {
    expect(buildAudioOutputs({ cableDeviceId: 'cable-id', monitorDeviceId: 'default' })).toEqual([
      { sinkId: 'cable-id' },
      {},
    ])
    expect(buildAudioOutputs({ cableDeviceId: 'cable-id' })).toEqual([{ sinkId: 'cable-id' }, {}])
    expect(buildAudioOutputs({ cableDeviceId: 'cable-id', monitorDeviceId: undefined })).toEqual([
      { sinkId: 'cable-id' },
      {},
    ])
  })

  it('routes to cable plus a specific monitor device', () => {
    expect(buildAudioOutputs({ cableDeviceId: 'cable-id', monitorDeviceId: 'headset-id' })).toEqual([
      { sinkId: 'cable-id' },
      { sinkId: 'headset-id' },
    ])
  })

  it('routes to cable only when the monitor is muted (null)', () => {
    expect(buildAudioOutputs({ cableDeviceId: 'cable-id', monitorDeviceId: null })).toEqual([
      { sinkId: 'cable-id' },
    ])
  })

  it('never duplicates the cable when the monitor equals the cable', () => {
    expect(buildAudioOutputs({ cableDeviceId: 'cable-id', monitorDeviceId: 'cable-id' })).toEqual([
      { sinkId: 'cable-id' },
    ])
  })

  it('honors monitor:false (no monitor even with a cable)', () => {
    expect(buildAudioOutputs({ cableDeviceId: 'cable-id', monitorDeviceId: 'default', monitor: false })).toEqual([
      { sinkId: 'cable-id' },
    ])
  })
})

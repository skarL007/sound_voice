// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { buildCsv, downloadCsv } from './historyExport'

describe('buildCsv', () => {
  it('returns header row when entries is empty', () => {
    const csv = buildCsv([])
    expect(csv).toBe('timestamp,voice,text\r\n')
  })

  it('formats a single entry as CSV row', () => {
    const csv = buildCsv([{ timestamp: 0, voice: 'pt_BR-faber-medium', text: 'Ola mundo' }])
    const rows = csv.split('\r\n').filter(Boolean)
    expect(rows).toHaveLength(2)
    expect(rows[1]).toBe('1970-01-01T00:00:00.000Z,pt_BR-faber-medium,Ola mundo')
  })

  it('escapes double-quotes in text field', () => {
    const csv = buildCsv([{ timestamp: 0, voice: 'v', text: 'say "hello"' }])
    expect(csv).toContain('"say ""hello"""')
  })

  it('wraps text containing commas in double-quotes', () => {
    const csv = buildCsv([{ timestamp: 0, voice: 'v', text: 'hello, world' }])
    expect(csv).toContain('"hello, world"')
  })

  it('uses UTC timestamp regardless of local timezone', () => {
    // timestamp = 2024-01-15T12:00:00.000Z exactly
    const ts = Date.UTC(2024, 0, 15, 12, 0, 0)
    const csv = buildCsv([{ timestamp: ts, voice: 'v', text: 't' }])
    expect(csv).toContain('2024-01-15T12:00:00.000Z')
  })
})

describe('downloadCsv', () => {
  it('creates and immediately revokes an object URL', () => {
    const urls: string[] = []
    const revoked: string[] = []
    globalThis.URL.createObjectURL = (_blob) => {
      const url = `blob:mock-${urls.length}`
      urls.push(url)
      return url
    }
    globalThis.URL.revokeObjectURL = (url) => revoked.push(url)

    const clicks: string[] = []
    const origCreate = document.createElement.bind(document)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).createElement = (tag: string) => {
      const el = origCreate(tag)
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: () => clicks.push((el as HTMLAnchorElement).href) })
      }
      return el
    }

    downloadCsv('id,name\r\n1,test\r\n', 'export.csv')

    expect(urls).toHaveLength(1)
    expect(revoked).toHaveLength(1)
    expect(revoked[0]).toBe(urls[0])
  })
})

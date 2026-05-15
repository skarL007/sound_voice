import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

describe('release metadata', () => {
  it('keeps package repository and electron-builder publish target aligned', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
      repository?: { url?: string }
    }
    const electronBuilder = readFileSync(join(process.cwd(), 'electron-builder.yml'), 'utf-8')

    expect(packageJson.repository?.url).toContain('skarL007/sound_voice')
    expect(electronBuilder).toMatch(/owner:\s*skarL007/)
    expect(electronBuilder).toMatch(/repo:\s*sound_voice/)
  })
})

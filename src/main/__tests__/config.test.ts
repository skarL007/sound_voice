import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

function parseRepositorySlug(repositoryUrl: string): { owner: string, repo: string } {
  const normalizedUrl = repositoryUrl.trim().replace(/\.git$/, '')
  const match = normalizedUrl.match(/github\.com[/:]([^/]+)\/([^/]+)$/i)

  if (!match) {
    throw new Error(`Unsupported repository URL: ${repositoryUrl}`)
  }

  return {
    owner: match[1],
    repo: match[2],
  }
}

function parsePublishConfig(electronBuilder: string): { owner: string, repo: string } {
  const ownerMatch = electronBuilder.match(/^\s*owner:\s*([^\s]+)\s*$/m)
  const repoMatch = electronBuilder.match(/^\s*repo:\s*([^\s]+)\s*$/m)

  if (!ownerMatch || !repoMatch) {
    throw new Error('Missing publish.owner or publish.repo in electron-builder.yml')
  }

  return {
    owner: ownerMatch[1],
    repo: repoMatch[1],
  }
}

describe('release metadata', () => {
  it('keeps package repository and electron-builder publish target aligned', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
      repository?: { url?: string }
    }
    const electronBuilder = readFileSync(join(process.cwd(), 'electron-builder.yml'), 'utf-8')
    const repositoryUrl = packageJson.repository?.url

    expect(repositoryUrl).toBeTruthy()

    const repository = parseRepositorySlug(repositoryUrl as string)
    const publishConfig = parsePublishConfig(electronBuilder)

    expect(repository).toEqual({
      owner: 'skarL007',
      repo: 'sound_voice',
    })
    expect(publishConfig).toEqual(repository)
  })
})

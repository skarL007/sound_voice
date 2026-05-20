import { BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { createHash } from 'crypto'
import https from 'https'
import http from 'http'

export interface ModelDownloadTask {
  modelId: string
  url: string
  destination: string
  checksum?: string
  size?: number
  redirectDepth?: number
}

const MAX_REDIRECTS = 5

interface DownloadState {
  controller: AbortController
  startTime: number
  downloaded: number
  totalSize: number
}

const activeDownloads = new Map<string, DownloadState>()

export async function downloadModelWithProgress(
  task: ModelDownloadTask,
  window: BrowserWindow
): Promise<boolean> {
  const { modelId, url, destination, checksum } = task

  // Ensure directory exists
  const dir = join(destination, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const controller = new AbortController()
  const startTime = Date.now()

  activeDownloads.set(modelId, {
    controller,
    startTime,
    downloaded: 0,
    totalSize: 0,
  })

  const redirectDepth = task.redirectDepth ?? 0
  if (redirectDepth > MAX_REDIRECTS) {
    activeDownloads.delete(modelId)
    const err = new Error(`Excedido limite de ${MAX_REDIRECTS} redirects (possivel SSRF)`)
    window.webContents.send('model:download:complete', { modelId, success: false, error: err.message })
    return false
  }

  try {
    // Apenas https eh aceito pra evitar SSRF/downgrade. http vira erro.
    if (url.startsWith('http://')) {
      const allowLocalhost = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(url)
      if (!allowLocalhost) {
        activeDownloads.delete(modelId)
        const err = new Error('Apenas https eh permitido em downloads externos')
        window.webContents.send('model:download:complete', { modelId, success: false, error: err.message })
        return false
      }
    }
    const protocol = url.startsWith('https:') ? https : http

    await new Promise<boolean>((resolve, reject) => {
      const request = protocol.get(url, { signal: controller.signal as any }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
          if (response.headers.location) {
            activeDownloads.delete(modelId)
            // Mantemos o usuario no mesmo modelId mas incrementamos depth.
            downloadModelWithProgress(
              { ...task, url: response.headers.location, redirectDepth: redirectDepth + 1 },
              window,
            )
              .then(resolve)
              .catch(reject)
            return
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        const state = activeDownloads.get(modelId)
        if (state) state.totalSize = totalSize

        const fileStream = createWriteStream(destination)
        let downloaded = 0
        let lastPercent = -1
        let lastReportTime = startTime
        let lastReportedBytes = 0

        response.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          const now = Date.now()
          // const elapsed = (now - startTime) / 1000

          if (state) {
            state.downloaded = downloaded
          }

          if (totalSize > 0) {
            const percent = Math.floor((downloaded / totalSize) * 100)
            if (percent !== lastPercent || now - lastReportTime > 500) {
              lastPercent = percent

              // Calculate speed (bytes/sec) over last window
              const windowElapsed = (now - lastReportTime) / 1000
              const windowBytes = downloaded - lastReportedBytes
              const speedBps = windowElapsed > 0 ? windowBytes / windowElapsed : 0
              const speed = formatSpeed(speedBps)

              // Calculate ETA
              const remainingBytes = totalSize - downloaded
              const eta = speedBps > 0 ? formatTime(remainingBytes / speedBps) : 'N/A'

              window.webContents.send('model:download:progress', {
                modelId,
                percent,
                speed,
                eta,
              })

              lastReportTime = now
              lastReportedBytes = downloaded
            }
          }
        })

        response.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          resolve(true)
        })
        fileStream.on('error', reject)
      })

      request.on('error', (err: Error) => {
        if ((err as any).code === 'ABORT_ERR') {
          reject(new Error('Download cancelled'))
        } else {
          reject(err)
        }
      })
    })

    // Validate checksum if provided
    if (checksum) {
      const fileHash = await hashFile(destination)
      if (fileHash !== checksum) {
        throw new Error('Checksum mismatch')
      }
    }

    window.webContents.send('model:download:complete', { modelId, success: true })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    window.webContents.send('model:download:complete', { modelId, success: false, error: message })
    return false
  } finally {
    activeDownloads.delete(modelId)
  }
}

export function cancelDownload(modelId: string): boolean {
  const state = activeDownloads.get(modelId)
  if (state) {
    state.controller.abort()
    activeDownloads.delete(modelId)
    return true
  }
  return false
}

async function hashFile(filePath: string): Promise<string> {
  const { createReadStream } = await import('fs')
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)
  for await (const chunk of stream) {
    hash.update(chunk)
  }
  return hash.digest('hex')
}

function formatSpeed(bps: number): string {
  if (bps > 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
  if (bps > 1024) return `${(bps / 1024).toFixed(1)} KB/s`
  return `${Math.round(bps)} B/s`
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

import { BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { createHash } from 'crypto'
import https from 'https'
import http from 'http'

export interface FileDownloadTask {
  /** Chave usada para progresso e cancelamento (modelId, 'vbcable', etc.). */
  id: string
  url: string
  destination: string
  checksum?: string
  redirectDepth?: number
}

export interface DownloadProgressInfo {
  percent: number
  speed: string
  eta: string
}

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

/**
 * Core de download generico e agnostico de UI: HTTPS-only (anti-SSRF), trata
 * redirects (<= 5), reporta progresso via callback e valida checksum SHA-256
 * opcional. Lanca em erro. Cancelavel via cancelDownload(task.id).
 */
export async function downloadFileWithProgress(
  task: FileDownloadTask,
  onProgress: (info: DownloadProgressInfo) => void,
): Promise<void> {
  const { id, destination, checksum } = task

  const dir = join(destination, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const state: DownloadState = {
    controller: new AbortController(),
    startTime: Date.now(),
    downloaded: 0,
    totalSize: 0,
  }
  activeDownloads.set(id, state)

  try {
    await doDownload(task.url, task.redirectDepth ?? 0)
    if (checksum) {
      const fileHash = await hashFile(destination)
      if (fileHash !== checksum) {
        throw new Error('Checksum mismatch')
      }
    }
  } finally {
    activeDownloads.delete(id)
  }

  function doDownload(url: string, depth: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (depth > MAX_REDIRECTS) {
        reject(new Error(`Excedido limite de ${MAX_REDIRECTS} redirects (possivel SSRF)`))
        return
      }

      // Apenas https eh aceito pra evitar SSRF/downgrade (localhost http e ok).
      if (url.startsWith('http://')) {
        const allowLocalhost = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(url)
        if (!allowLocalhost) {
          reject(new Error('Apenas https eh permitido em downloads externos'))
          return
        }
      }

      const protocol = url.startsWith('https:') ? https : http
      const request = protocol.get(url, { signal: state.controller.signal as any }, (response) => {
        const status = response.statusCode ?? 0
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          doDownload(response.headers.location, depth + 1).then(resolve).catch(reject)
          return
        }

        if (status !== 200) {
          reject(new Error(`HTTP ${status}`))
          return
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        state.totalSize = totalSize

        const fileStream = createWriteStream(destination)
        let downloaded = 0
        let lastPercent = -1
        let lastReportTime = state.startTime
        let lastReportedBytes = 0

        response.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          const now = Date.now()
          state.downloaded = downloaded

          if (totalSize > 0) {
            const percent = Math.floor((downloaded / totalSize) * 100)
            if (percent !== lastPercent || now - lastReportTime > 500) {
              lastPercent = percent

              const windowElapsed = (now - lastReportTime) / 1000
              const windowBytes = downloaded - lastReportedBytes
              const speedBps = windowElapsed > 0 ? windowBytes / windowElapsed : 0
              const remainingBytes = totalSize - downloaded
              const eta = speedBps > 0 ? formatTime(remainingBytes / speedBps) : 'N/A'

              onProgress({ percent, speed: formatSpeed(speedBps), eta })

              lastReportTime = now
              lastReportedBytes = downloaded
            }
          }
        })

        response.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close()
          resolve()
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
  }
}

/**
 * Wrapper de compatibilidade para modelos: emite os eventos `model:download:*`
 * que a ModelsPage ja consome.
 */
export async function downloadModelWithProgress(
  task: ModelDownloadTask,
  window: BrowserWindow,
): Promise<boolean> {
  try {
    await downloadFileWithProgress(
      {
        id: task.modelId,
        url: task.url,
        destination: task.destination,
        checksum: task.checksum,
        redirectDepth: task.redirectDepth,
      },
      (info) => window.webContents.send('model:download:progress', { modelId: task.modelId, ...info }),
    )
    window.webContents.send('model:download:complete', { modelId: task.modelId, success: true })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    window.webContents.send('model:download:complete', { modelId: task.modelId, success: false, error: message })
    return false
  }
}

export function cancelDownload(id: string): boolean {
  const state = activeDownloads.get(id)
  if (state) {
    state.controller.abort()
    activeDownloads.delete(id)
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

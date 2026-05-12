import { spawn, ChildProcess, execSync } from 'child_process'
import { app } from 'electron'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { logMain, logPython } from './logger'
import { request } from 'http'
import { createServer } from 'net'

const BACKEND_PORT = 9472
const STARTUP_TIMEOUT_MS = 120000
const POLL_INTERVAL_MS = 2000

export class PythonBackendManager {
  private process: ChildProcess | null = null
  private port: number = BACKEND_PORT
  private isRunning: boolean = false
  private startTime: number = 0
  private phase: 'idle' | 'starting' | 'running' | 'error' = 'idle'
  private lastError: string | undefined
  private startPromise: Promise<boolean> | null = null

  async start(): Promise<boolean> {
    if (this.isRunning) return true
    if (this.startPromise) return this.startPromise

    this.phase = 'starting'
    this.lastError = undefined

    this.port = await this.resolvePort(BACKEND_PORT)
    const pythonExecutable = this.findPythonExecutable()
    const mainScript = this.findMainScript()
    const usingBundledBackendExe = this.isBundledBackendExecutable(pythonExecutable)

    // Verify Python works when we are using an interpreter. Standalone packaged backends
    // are regular executables and do not need a `--version` probe.
    if (!usingBundledBackendExe) {
      try {
        execSync(`"${pythonExecutable}" --version`, { encoding: 'utf-8' })
      } catch {
        this.phase = 'error'
        this.lastError = `Python executable not working: ${pythonExecutable}`
        logMain('ERROR', this.lastError)
        return false
      }
    }

    if (mainScript && !existsSync(mainScript)) {
      this.phase = 'error'
      this.lastError = `Python main script not found: ${mainScript}`
      logMain('ERROR', this.lastError)
      return false
    }

    logMain('INFO', `Starting Python backend: ${pythonExecutable} ${mainScript}`)

    this.startPromise = new Promise((resolve) => {
      const args = mainScript ? [mainScript, '--port', String(this.port)] : ['--port', String(this.port)]
      const cwd = mainScript ? join(__dirname, '../../src/python') : dirname(pythonExecutable)
      const pythonPath = mainScript ? join(__dirname, '../../src/python') : ''

      const env: NodeJS.ProcessEnv = { ...process.env }
      env.PYTHONIOENCODING = 'utf-8'
      if (pythonPath) env.PYTHONPATH = pythonPath
      if (!mainScript) {
        env.VOICELAUNCH_MODEL_REGISTRY_PATH = join(process.resourcesPath, 'assets', 'model-registry.json')
      }

      this.process = spawn(pythonExecutable, args, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        windowsHide: true
      })

      let stdoutBuffer = ''
      let stderrBuffer = ''
      let resolved = false

      this.process.stdout?.on('data', (data) => {
        const text = data.toString()
        stdoutBuffer += text
        // Log line by line
        const lines = stdoutBuffer.split('\n')
        stdoutBuffer = lines.pop() || ''
        lines.forEach((line) => {
          if (line.trim()) logPython('INFO', line.trim())
        })
      })

      this.process.stderr?.on('data', (data) => {
        const text = data.toString()
        stderrBuffer += text
        const lines = stderrBuffer.split('\n')
        stderrBuffer = lines.pop() || ''
        lines.forEach((line) => {
          if (line.trim()) logPython('ERROR', line.trim())
        })
      })

      this.process.on('error', (err) => {
        logMain('ERROR', `Failed to start Python backend: ${err.message}`)
        this.phase = 'error'
        this.lastError = err.message
        if (!resolved) {
          resolved = true
          this.startPromise = null
          resolve(false)
        }
      })

      this.process.on('exit', (code) => {
        logMain('INFO', `Python backend exited with code ${code}`)
        this.isRunning = false
        this.phase = code === 0 || code === null ? 'idle' : 'error'
        this.lastError = code === 0 || code === null ? undefined : `Python backend exited with code ${code}`
        this.startPromise = null
        if (!resolved) {
          resolved = true
          resolve(false)
        }
      })

      // Poll HTTP port instead of relying on stdout (fixes Windows Store Python stub issues)
      const startTime = Date.now()
      const pollInterval = setInterval(() => {
        if (resolved) {
          clearInterval(pollInterval)
          return
        }

        const req = request(
          { hostname: '127.0.0.1', port: this.port, path: '/health', method: 'GET', timeout: 3000 },
          (res) => {
            if (!resolved && res.statusCode === 200) {
              this.isRunning = true
              this.startTime = Date.now()
              this.phase = 'running'
              this.lastError = undefined
              logMain('INFO', 'Python backend started successfully (HTTP poll confirmed)')
              resolved = true
              clearInterval(pollInterval)
              clearTimeout(timeoutHandle)
              this.startPromise = null
              resolve(true)
            }
          }
        )
        req.on('error', () => {
          // Backend not ready yet, keep polling
        })
        req.on('timeout', () => {
          req.destroy()
        })
        req.end()

        // Total timeout check
        if (Date.now() - startTime > STARTUP_TIMEOUT_MS) {
          clearInterval(pollInterval)
        }
      }, POLL_INTERVAL_MS)

      // Hard timeout
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          logMain('ERROR', 'Python backend startup timeout')
          this.phase = 'error'
          this.lastError = 'Python backend startup timeout'
          resolved = true
          clearInterval(pollInterval)
          this.process?.kill()
          this.startPromise = null
          resolve(false)
        }
      }, STARTUP_TIMEOUT_MS)
    })

    return this.startPromise
  }

  async stop(): Promise<void> {
    logMain('INFO', 'Stopping Python backend...')
    this.startPromise = null
    const runningProcess = this.process
    if (runningProcess && !runningProcess.killed) {
      await new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          resolve()
        }

        runningProcess.once('exit', () => finish())
        runningProcess.kill('SIGTERM')

        setTimeout(() => {
          if (!runningProcess.killed) {
            runningProcess.kill('SIGKILL')
          }
          finish()
        }, 5000)
      })
    }
    this.process = null
    this.isRunning = false
    this.phase = 'idle'
    this.lastError = undefined
  }

  restart(): Promise<boolean> {
    return this.stop().then(() => this.start())
  }

  getStatus() {
    return {
      running: this.isRunning,
      port: this.port,
      version: '1.0.0',
      uptime: this.isRunning ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      phase: this.phase,
      lastError: this.lastError,
    }
  }

  private isDev(): boolean {
    return !app.isPackaged
  }

  private findPythonExecutable(): string {
    if (this.isDev()) {
      const realPython = 'C:\\Users\\zpka2\\AppData\\Local\\Microsoft\\WindowsApps\\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\\python.exe'
      if (existsSync(realPython)) return realPython

      const stub = 'C:\\Users\\zpka2\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe'
      try {
        execSync(`"${stub}" --version`, { encoding: 'utf-8' })
        return stub
      } catch {
        // ignore
      }

      return 'python.exe'
    }

    const prodPath = join(process.resourcesPath, 'python_dist', 'voicelaunch-backend', 'voicelaunch-backend.exe')
    if (existsSync(prodPath)) return prodPath

    return 'python'
  }

  private findMainScript(): string {
    if (this.isDev()) {
      const paths = [
        join(app.getAppPath(), 'src/python/main.py'),
        join(__dirname, '../../src/python/main.py'),
      ]
      for (const p of paths) {
        if (existsSync(p)) return p
      }
      return join(__dirname, '../../src/python/main.py')
    }

    const backendExe = this.findPythonExecutable()
    if (backendExe.endsWith('voicelaunch-backend.exe')) {
      return ''
    }

    return ''
  }

  private isBundledBackendExecutable(pythonExecutable: string): boolean {
    return pythonExecutable.toLowerCase().endsWith('voicelaunch-backend.exe')
  }

  private async resolvePort(preferredPort: number): Promise<number> {
    let candidate = preferredPort

    while (!(await this.isPortFree(candidate))) {
      candidate += 1
    }

    if (candidate !== preferredPort) {
      logMain('WARN', `Preferred backend port ${preferredPort} is busy. Falling back to ${candidate}.`)
    }

    return candidate
  }

  private isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer()

      server.once('error', () => {
        resolve(false)
      })

      server.once('listening', () => {
        server.close(() => resolve(true))
      })

      server.listen(port, '127.0.0.1')
    })
  }
}

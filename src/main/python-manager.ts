import { spawn, ChildProcess, execFileSync } from 'child_process'
import { randomBytes } from 'crypto'
import { app } from 'electron'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { logMain, logPython } from './logger'
import { request } from 'http'
import { createServer } from 'net'
import { APP_CONFIG, VOICELAUNCH_ENV } from './app-config'
import type { BackendDiagnostics } from '../shared/types'

const BACKEND_PORT = 9472
const STARTUP_TIMEOUT_MS = 120000
const POLL_INTERVAL_MS = 2000

interface BackendLaunchPlan {
  executable: string
  args: string[]
  cwd: string
  pythonPath?: string
  executor: 'python-interpreter' | 'bundled-backend'
}

export class PythonBackendManager {
  // Segredo compartilhado por sessao: injetado no backend via env e exigido em
  // toda requisicao HTTP/WS (exceto /health). Nunca sai do processo main.
  private readonly authToken: string = randomBytes(32).toString('hex')
  private process: ChildProcess | null = null
  private port: number = BACKEND_PORT
  private isRunning: boolean = false
  private startTime: number = 0
  private phase: 'idle' | 'starting' | 'running' | 'error' = 'idle'
  private lastError: string | undefined
  private startPromise: Promise<boolean> | null = null
  private diagnostics: BackendDiagnostics = this.createDiagnostics({
    executable: 'python',
    args: ['--port', String(BACKEND_PORT)],
    cwd: process.cwd(),
    executor: 'python-interpreter',
  })

  async start(): Promise<boolean> {
    if (this.isRunning) return true
    if (this.startPromise) return this.startPromise

    this.phase = 'starting'
    this.lastError = undefined

    this.port = await this.resolvePort(BACKEND_PORT)
    const launchPlan = this.createLaunchPlan(this.port)
    const usingBundledBackendExe = launchPlan.executor === 'bundled-backend'
    this.diagnostics = this.createDiagnostics(launchPlan, {
      cliAvailable: existsSync(launchPlan.executable) || !launchPlan.executable.includes('\\') && !launchPlan.executable.includes('/'),
      runnable: false,
      detail: 'Backend launch plan created; runnable probe pending.',
    })

    // Verify Python works when we are using an interpreter. Standalone packaged backends
    // are regular executables and do not need a `--version` probe.
    if (!usingBundledBackendExe) {
      try {
        execFileSync(launchPlan.executable, ['--version'], { encoding: 'utf-8' })
        this.diagnostics = this.createDiagnostics(launchPlan, {
          cliAvailable: true,
          runnable: true,
          detail: 'Python interpreter responded to --version.',
        })
      } catch (error) {
        this.phase = 'error'
        this.lastError = `Python executable not runnable: ${launchPlan.executable}`
        this.diagnostics = this.createDiagnostics(launchPlan, {
          cliAvailable: false,
          runnable: false,
          detail: error instanceof Error ? error.message : String(error),
        })
        logMain('ERROR', `${this.lastError}. Configure ${VOICELAUNCH_ENV.pythonPath} with a Python 3.10+ executable.`)
        return false
      }
    } else {
      this.diagnostics = this.createDiagnostics(launchPlan, {
        cliAvailable: existsSync(launchPlan.executable),
        runnable: existsSync(launchPlan.executable),
        detail: 'Using bundled backend executable; Python interpreter auth/probe not required.',
      })
    }

    if (!usingBundledBackendExe && launchPlan.args.length > 0 && !existsSync(launchPlan.args[0])) {
      this.phase = 'error'
      this.lastError = `Python main script not found: ${launchPlan.args[0]}`
      this.diagnostics = this.createDiagnostics(launchPlan, {
        cliAvailable: true,
        runnable: false,
        detail: this.lastError,
      })
      logMain('ERROR', this.lastError)
      return false
    }

    logMain('INFO', `Starting Python backend via ${launchPlan.executor}: ${this.formatCommand(launchPlan)}`)

    this.startPromise = new Promise((resolve) => {
      const env: NodeJS.ProcessEnv = { ...process.env }
      env.PYTHONIOENCODING = 'utf-8'
      if (launchPlan.pythonPath) env.PYTHONPATH = launchPlan.pythonPath
      env[VOICELAUNCH_ENV.userData] = APP_CONFIG.userDataPath
      env[VOICELAUNCH_ENV.modelRegistryPath] = APP_CONFIG.modelRegistryPath
      env[VOICELAUNCH_ENV.backendToken] = this.authToken

      this.process = spawn(launchPlan.executable, launchPlan.args, {
        cwd: launchPlan.cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        windowsHide: true
      })

      let stdoutBuffer = ''
      let stderrBuffer = ''
      let resolved = false

      this.process.stdout?.on('data', (data) => {
        const text = data.toString()
        stdoutBuffer += text
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
        this.diagnostics = this.createDiagnostics(launchPlan, {
          cliAvailable: existsSync(launchPlan.executable),
          runnable: false,
          detail: err.message,
        })
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
        this.diagnostics = this.createDiagnostics(launchPlan, {
          cliAvailable: this.diagnostics.cliAvailable,
          runnable: code === 0 || code === null,
          detail: this.lastError,
        })
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
          { hostname: APP_CONFIG.backendHost, port: this.port, path: '/health', method: 'GET', timeout: 3000 },
          (res) => {
            if (!resolved && res.statusCode === 200) {
              this.isRunning = true
              this.startTime = Date.now()
              this.phase = 'running'
              this.lastError = undefined
              this.diagnostics = this.createDiagnostics(launchPlan, {
                cliAvailable: true,
                runnable: true,
                detail: 'HTTP /health returned 200.',
              })
              logMain('INFO', `Python backend started successfully at ${this.diagnostics.url}`)
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

        if (Date.now() - startTime > STARTUP_TIMEOUT_MS) {
          clearInterval(pollInterval)
        }
      }, POLL_INTERVAL_MS)

      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          logMain('ERROR', 'Python backend startup timeout')
          this.phase = 'error'
          this.lastError = 'Python backend startup timeout'
          this.diagnostics = this.createDiagnostics(launchPlan, {
            cliAvailable: this.diagnostics.cliAvailable,
            runnable: false,
            detail: `Timed out waiting for ${this.diagnostics.url}/health`,
          })
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

  getAuthToken(): string {
    return this.authToken
  }

  getStatus() {
    return {
      running: this.isRunning,
      port: this.port,
      version: '1.0.0',
      uptime: this.isRunning ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      phase: this.phase,
      lastError: this.lastError,
      diagnostics: this.diagnostics,
    }
  }

  private isDev(): boolean {
    return !app.isPackaged
  }

  private createLaunchPlan(port: number): BackendLaunchPlan {
    const executable = this.findPythonExecutable()
    const bundledBackend = this.isBundledBackendExecutable(executable)

    if (bundledBackend) {
      return {
        executable,
        args: ['--port', String(port)],
        cwd: dirname(executable),
        executor: 'bundled-backend',
      }
    }

    const mainScript = this.findMainScript()
    return {
      executable,
      args: [mainScript, '--port', String(port)],
      cwd: dirname(mainScript),
      pythonPath: dirname(mainScript),
      executor: 'python-interpreter',
    }
  }

  private findPythonExecutable(): string {
    const configuredPython = process.env[VOICELAUNCH_ENV.pythonPath] || process.env.PYTHON
    if (configuredPython) return configuredPython

    // Prefere o backend standalone (PyInstaller) quando presente — dispensa um
    // Python instalado. No pacote fica em resources/; em dev fica na raiz do
    // projeto. Configure VOICELAUNCH_PYTHON_PATH para forcar um interpretador
    // proprio (ex.: ao desenvolver o backend Python a partir do fonte).
    const bundledCandidates = [
      join(process.resourcesPath || '', 'python_dist', 'voicelaunch-backend', 'voicelaunch-backend.exe'),
      join(app.getAppPath(), 'python_dist', 'voicelaunch-backend', 'voicelaunch-backend.exe'),
      join(__dirname, '..', '..', 'python_dist', 'voicelaunch-backend', 'voicelaunch-backend.exe'),
    ]
    const bundled = bundledCandidates.find((candidate) => candidate && existsSync(candidate))
    if (bundled) {
      if (this.isDev()) {
        logMain('INFO', `Using bundled backend in dev: ${bundled}. Set ${VOICELAUNCH_ENV.pythonPath} to use your own Python.`)
      }
      return bundled
    }

    return process.platform === 'win32' ? 'python.exe' : 'python3'
  }

  private findMainScript(): string {
    const paths = [
      join(app.getAppPath(), 'src/python/main.py'),
      join(__dirname, '../../src/python/main.py'),
      join(process.resourcesPath || '', 'src/python/main.py'),
    ]

    for (const p of paths) {
      if (existsSync(p)) return p
    }

    return join(__dirname, '../../src/python/main.py')
  }

  private isBundledBackendExecutable(pythonExecutable: string): boolean {
    return pythonExecutable.toLowerCase().endsWith('voicelaunch-backend.exe')
  }

  private createDiagnostics(
    plan: BackendLaunchPlan,
    overrides: Partial<Pick<BackendDiagnostics, 'cliAvailable' | 'runnable' | 'detail'>> = {}
  ): BackendDiagnostics {
    return {
      authMode: 'token',
      authenticated: true,
      cliAvailable: overrides.cliAvailable ?? false,
      runnable: overrides.runnable ?? false,
      command: this.formatCommand(plan),
      url: `http://${APP_CONFIG.backendHost}:${this.port}`,
      executor: plan.executor,
      detail: overrides.detail,
    }
  }

  private formatCommand(plan: BackendLaunchPlan): string {
    return [plan.executable, ...plan.args].map((part) => this.quoteForDisplay(part)).join(' ')
  }

  private quoteForDisplay(value: string): string {
    if (!/[\s"]/u.test(value)) return value
    return `"${value.replace(/"/g, '\\"')}"`
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

      server.listen(port, APP_CONFIG.backendHost)
    })
  }
}

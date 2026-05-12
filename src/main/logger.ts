import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs'

const LOGS_DIR = join(app.getPath('userData'), 'logs')
const MAIN_LOG = join(LOGS_DIR, 'main.log')
const PYTHON_LOG = join(LOGS_DIR, 'python.log')

function ensureDir() {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true })
  }
}

function formatLine(level: string, source: string, message: string): string {
  const ts = new Date().toISOString()
  return `[${ts}] [${level}] [${source}] ${message}\n`
}

export function logMain(level: 'INFO' | 'WARN' | 'ERROR', message: string) {
  ensureDir()
  const line = formatLine(level, 'main', message)
  appendFileSync(MAIN_LOG, line)
  console.log(`[${level}] ${message}`)
}

export function logPython(level: 'INFO' | 'WARN' | 'ERROR', message: string) {
  ensureDir()
  const line = formatLine(level, 'python', message)
  appendFileSync(PYTHON_LOG, line)
}

export function getLogs(): { main: string; python: string } {
  ensureDir()
  let main = ''
  let python = ''
  try {
    main = readFileSync(MAIN_LOG, 'utf-8')
  } catch { /* no log yet */ }
  try {
    python = readFileSync(PYTHON_LOG, 'utf-8')
  } catch { /* no log yet */ }
  return { main, python }
}

export function clearLogs() {
  ensureDir()
  try {
    writeFileSync(MAIN_LOG, '', 'utf-8')
    writeFileSync(PYTHON_LOG, '', 'utf-8')
  } catch { /* ignore */ }
}

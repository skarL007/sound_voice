import { useEffect, useMemo, useState, useRef } from 'react'
import { Terminal, Trash2, RefreshCw, Download, Search } from 'lucide-react'

const MAX_LINES = 2000

type LogLevel = 'info' | 'warn' | 'error' | 'plain'

interface ParsedLine {
  raw: string
  level: LogLevel
}

function detectLevel(line: string): LogLevel {
  if (line.includes('[ERROR]')) return 'error'
  if (line.includes('[WARN]')) return 'warn'
  if (line.includes('[INFO]')) return 'info'
  return 'plain'
}

const levelStyle: Record<LogLevel, string> = {
  info: 'var(--vl-state-live)',
  warn: 'var(--vl-state-warn)',
  error: 'var(--vl-state-error)',
  plain: 'var(--vl-ink-body)',
}

export default function LogsPage() {
  const [mainLogs, setMainLogs] = useState('')
  const [pythonLogs, setPythonLogs] = useState('')
  const [activeTab, setActiveTab] = useState<'main' | 'python'>('main')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<Exclude<LogLevel, 'plain'>, boolean>>({
    info: true,
    warn: true,
    error: true,
  })
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadLogs = async () => {
    const logs = await window.electronAPI.getLogs()
    setMainLogs(logs.main)
    setPythonLogs(logs.python)
  }

  useEffect(() => {
    loadLogs()
    if (!autoRefresh) return
    const interval = setInterval(loadLogs, 2000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const currentLogs = activeTab === 'main' ? mainLogs : pythonLogs

  const parsedLines = useMemo<ParsedLine[]>(() => {
    const lines = currentLogs.split('\n').filter(Boolean)
    const tail = lines.length > MAX_LINES ? lines.slice(-MAX_LINES) : lines
    return tail.map((raw) => ({ raw, level: detectLevel(raw) }))
  }, [currentLogs])

  const filteredLines = useMemo(() => {
    const query = search.trim().toLowerCase()
    return parsedLines.filter((entry) => {
      if (entry.level !== 'plain' && !filters[entry.level]) return false
      if (query && !entry.raw.toLowerCase().includes(query)) return false
      return true
    })
  }, [parsedLines, filters, search])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredLines, activeTab])

  const handleClear = async () => {
    await window.electronAPI.clearLogs()
    loadLogs()
  }

  const handleExport = () => {
    const content = currentLogs
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voicelaunch-${activeTab}-logs.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalLines = parsedLines.length
  const showingLines = filteredLines.length
  const truncated = currentLogs.split('\n').filter(Boolean).length > MAX_LINES

  return (
    <div className="max-w-5xl mx-auto space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-7 h-7" style={{ color: 'var(--vl-state-ready)' }} />
          <h1 className="text-2xl font-bold text-ink-strong">Logs</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`status-pill ${autoRefresh ? 'status-pill--live' : 'status-pill--ready'}`}
            aria-label={autoRefresh ? 'Desativar atualizacao automatica' : 'Ativar atualizacao automatica'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto
          </button>
          <button onClick={loadLogs} className="btn-secondary text-sm flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
          <button
            onClick={handleClear}
            className="btn-secondary text-sm flex items-center gap-1.5"
            style={{ color: 'var(--vl-state-error)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('main')}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
            activeTab === 'main' ? 'btn-primary' : 'btn-secondary'
          }`}
          aria-label="Mostrar logs do processo principal"
        >
          Main Process
        </button>
        <button
          onClick={() => setActiveTab('python')}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
            activeTab === 'python' ? 'btn-primary' : 'btn-secondary'
          }`}
          aria-label="Mostrar logs do backend Python"
        >
          Python Backend
        </button>

        <div className="flex items-center gap-1 ml-2">
          {(['info', 'warn', 'error'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilters((prev) => ({ ...prev, [level]: !prev[level] }))}
              className="status-pill"
              style={{
                background: filters[level] ? `${levelStyle[level]}22` : 'rgba(19,9,43,0.4)',
                color: filters[level] ? levelStyle[level] : 'var(--vl-ink-mute)',
                borderColor: filters[level] ? `${levelStyle[level]}66` : 'var(--vl-hud-border)',
                cursor: 'pointer',
              }}
              aria-pressed={filters[level]}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[180px] flex items-center gap-2 ml-auto">
          <Search className="w-4 h-4 text-ink-soft" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar..."
            className="input-field text-xs py-1.5"
            aria-label="Buscar nos logs"
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="hud-frame flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed"
      >
        <p className="text-ink-mute text-[10px] mb-2">
          Mostrando {showingLines}/{totalLines} linhas{truncated ? ' (truncado para as 2000 mais recentes)' : ''}.
        </p>
        {filteredLines.length === 0 ? (
          <p className="text-ink-mute">Nenhum log corresponde aos filtros.</p>
        ) : (
          <div className="space-y-0.5">
            {filteredLines.map((entry, i) => (
              <div
                key={i}
                className="break-all"
                style={{ color: levelStyle[entry.level] }}
              >
                {entry.raw}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

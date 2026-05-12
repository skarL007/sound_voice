import { useEffect, useState, useRef } from 'react'
import { Terminal, Trash2, RefreshCw, Download } from 'lucide-react'

export default function LogsPage() {
  const [mainLogs, setMainLogs] = useState('')
  const [pythonLogs, setPythonLogs] = useState('')
  const [activeTab, setActiveTab] = useState<'main' | 'python'>('main')
  const [autoRefresh, setAutoRefresh] = useState(true)
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mainLogs, pythonLogs, activeTab])

  const handleClear = async () => {
    await window.electronAPI.clearLogs()
    loadLogs()
  }

  const handleExport = () => {
    const content = activeTab === 'main' ? mainLogs : pythonLogs
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voicelaunch-${activeTab}-logs.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentLogs = activeTab === 'main' ? mainLogs : pythonLogs
  const lines = currentLogs.split('\n').filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-7 h-7 text-brand-400" />
          <h1 className="text-2xl font-bold text-white">Logs</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            aria-label={autoRefresh ? 'Desativar atualização automática' : 'Ativar atualização automática'}
          >
            <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
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
            className="btn-secondary text-sm flex items-center gap-1.5 text-red-300 hover:text-red-200 hover:bg-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('main')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'main'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          aria-label="Mostrar logs do processo principal"
        >
          Main Process ({lines.length} linhas)
        </button>
        <button
          onClick={() => setActiveTab('python')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'python'
              ? 'bg-brand-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          aria-label="Mostrar logs do backend Python"
        >
          Python Backend
        </button>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        className="flex-1 glass-panel p-4 overflow-auto font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-slate-600">Nenhum log ainda.</p>
        ) : (
          <div className="space-y-0.5">
            {lines.map((line, i) => {
              const isError = line.includes('[ERROR]')
              const isWarn = line.includes('[WARN]')
              return (
                <div
                  key={i}
                  className={`break-all ${
                    isError ? 'text-red-400' : isWarn ? 'text-yellow-400' : 'text-slate-300'
                  }`}
                >
                  {line}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

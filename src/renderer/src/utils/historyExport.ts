export interface HistoryEntry {
  timestamp: number
  voice: string
  text: string
}

/**
 * Escape a CSV field value: wrap in double-quotes if it contains
 * commas, newlines, or double-quotes; double any embedded double-quotes.
 */
function escapeCsvField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Build a RFC 4180-compliant CSV string from history entries.
 * Uses UTC timestamps to ensure deterministic output across timezones.
 */
export function buildCsv(entries: HistoryEntry[]): string {
  const header = 'timestamp,voice,text\r\n'
  const rows = entries.map((e) => {
    const ts = new Date(e.timestamp).toISOString()
    const voice = escapeCsvField(e.voice)
    const text = escapeCsvField(e.text)
    return `${ts},${voice},${text}`
  })
  return header + rows.join('\r\n') + (rows.length > 0 ? '\r\n' : '')
}

/**
 * Trigger a browser download of a CSV string.
 * Creates a temporary <a> element, clicks it, then revokes the object URL.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// electron-builder beforePack hook: garante que o instalador do VB-Audio Virtual
// Cable esteja em assets/vbcable antes de empacotar. Os .exe sao donationware e
// nao versionados (ver .gitignore); aqui sao buscados quando ausentes (CI/maquina nova).
const { existsSync } = require('fs')
const { join } = require('path')
const { execFileSync } = require('child_process')

exports.default = async function beforePack() {
  const exe = join(__dirname, '..', 'assets', 'vbcable', 'VBCABLE_Setup_x64.exe')
  if (existsSync(exe)) return
  console.log('[before-pack] VB-Cable ausente; baixando via scripts/fetch-vbcable.ps1...')
  execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(__dirname, 'fetch-vbcable.ps1')],
    { stdio: 'inherit' },
  )
}

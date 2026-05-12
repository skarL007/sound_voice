import { execSync } from 'child_process'
import { platform, totalmem, cpus } from 'os'

export interface HardwareProfile {
  cpu: string
  cpuCores: number
  cpuThreads: number
  ramGB: number
  gpu: string
  gpuVRAM: number
  gpuVendor: string
  os: string
  osVersion: string
  isCudaAvailable: boolean
  cudaVersion: string
  isRocmAvailable: boolean
  rocmVersion: string
  isDirectMLAvailable: boolean
  recommendedTier: string
}

let cachedHardware: HardwareProfile | null = null
let cacheTime = 0
const CACHE_TTL_MS = 300000

export function detectHardware(): HardwareProfile {
  if (cachedHardware && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedHardware
  }

  const cpuInfo = cpus()[0]
  const ramBytes = totalmem()
  const ramGB = Math.round(ramBytes / 1024 / 1024 / 1024)

  // GPU detection via WMIC
  let gpu = 'Unknown'
  let gpuVRAM = 0
  let gpuVendor = 'unknown'

  try {
    const psOutput = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Csv -NoTypeInformation"',
      { encoding: 'utf-8' }
    )
    const lines = psOutput.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('"Name"'))
    if (lines.length > 0) {
      const parts = lines[0].split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      gpu = parts[0] || 'Unknown'
      const vramBytes = parseInt(parts[1] || '0', 10)
      gpuVRAM = Math.round(vramBytes / 1024 / 1024)

      const gpuLower = gpu.toLowerCase()
      if (gpuLower.includes('nvidia') || gpuLower.includes('geforce') || gpuLower.includes('rtx') || gpuLower.includes('gtx')) {
        gpuVendor = 'nvidia'
      } else if (gpuLower.includes('amd') || gpuLower.includes('radeon')) {
        gpuVendor = 'amd'
      } else if (gpuLower.includes('intel')) {
        gpuVendor = 'intel'
      }
    }
  } catch (e) {
    console.error('GPU detection failed:', e)
  }

  // CUDA check (NVIDIA)
  let isCudaAvailable = false
  let cudaVersion = ''
  try {
    const nvccOutput = execSync('nvcc --version', { encoding: 'utf-8' })
    const match = nvccOutput.match(/release (\d+\.\d+)/)
    if (match) {
      isCudaAvailable = true
      cudaVersion = match[1]
    }
  } catch {
    isCudaAvailable = false
  }

  // Also check for nvidia-smi
  if (!isCudaAvailable) {
    try {
      execSync('nvidia-smi', { encoding: 'utf-8' })
      isCudaAvailable = true
      cudaVersion = 'unknown'
    } catch {
      // no CUDA
    }
  }

  // ROCm check (AMD on Linux primarily)
  let isRocmAvailable = false
  let rocmVersion = ''
  try {
    const rocmOutput = execSync('rocm-smi --showproductname', { encoding: 'utf-8' })
    if (rocmOutput) {
      isRocmAvailable = true
    }
  } catch {
    // no ROCm
  }
  try {
    const hipOutput = execSync('hipcc --version', { encoding: 'utf-8' })
    if (hipOutput) {
      isRocmAvailable = true
      const match = hipOutput.match(/HIP version[:\s]*(\S+)/)
      if (match) rocmVersion = match[1]
    }
  } catch {
    // no HIP
  }

  // DirectML is only treated as available after runtime validation in Python.
  let isDirectMLAvailable = false

  const osName = platform()
  let osVersion = ''
  try {
    const psOutput = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).Caption"',
      { encoding: 'utf-8' }
    )
    osVersion = psOutput.trim() || osName
  } catch {
    osVersion = osName
  }

  const recommendedTier = computeTier(ramGB, gpuVRAM, isCudaAvailable, isRocmAvailable, isDirectMLAvailable)

  const result = {
    cpu: cpuInfo.model,
    cpuCores: cpus().filter((c, i, arr) => arr.findIndex(x => x.model === c.model) === i).length,
    cpuThreads: cpus().length,
    ramGB,
    gpu,
    gpuVRAM,
    gpuVendor,
    os: osName,
    osVersion,
    isCudaAvailable,
    cudaVersion,
    isRocmAvailable,
    rocmVersion,
    isDirectMLAvailable,
    recommendedTier
  }

  cachedHardware = result
  cacheTime = Date.now()
  return result
}

function computeTier(ramGB: number, gpuVRAM: number, hasCuda: boolean, hasRocm: boolean, hasDirectML: boolean): string {
  const hasGpuAccel = hasCuda || hasRocm || hasDirectML
  if (!hasGpuAccel || gpuVRAM === 0) {
    if (ramGB < 4) return 'edge'
    return 'cpu'
  }
  if (gpuVRAM < 4096) return 'entry'
  if (gpuVRAM < 8192) return 'mid'
  if (gpuVRAM < 16384) return 'high'
  return 'enthusiast'
}

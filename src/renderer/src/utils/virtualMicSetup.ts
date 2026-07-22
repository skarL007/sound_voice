import type { AudioDevice, VBCableDownloadProgress, VBCableInstallResult } from '../../../shared/types'

export type { VBCableDownloadProgress, VBCableInstallResult }

/**
 * Estados do fluxo de instalacao do microfone virtual (VB-Cable).
 * - idle: ainda nao iniciado / nada a mostrar
 * - downloading: baixando o instalador oficial (com barra de progresso)
 * - launching: preparando/abrindo o instalador
 * - launched: instalador aberto; aguardando o usuario concluir
 * - manual: nao foi possivel automatizar; site oficial aberto
 * - error: falha ao baixar ou abrir o instalador
 */
export type VBCableInstallState =
  | 'idle'
  | 'downloading'
  | 'launching'
  | 'launched'
  | 'manual'
  | 'error'

export interface VBCableInstallResolution {
  state: Extract<VBCableInstallState, 'launched' | 'manual' | 'error'>
  message: string
}

const CABLE_KEYWORD = 'cable'

/**
 * Detecta a presenca do VB-Cable pela lista de dispositivos de audio.
 * Regra alinhada com a spec: qualquer dispositivo cujo nome contenha "cable".
 */
export function detectVBCable(devices: Array<Pick<AudioDevice, 'name'>>): boolean {
  return devices.some((device) => device.name.toLowerCase().includes(CABLE_KEYWORD))
}

/**
 * Resultado da resolucao do sink do cabo. Todo chamador precisa lidar com os
 * estados de falha explicitamente — a regra do produto e "nunca falhar em
 * silencio": sem cabo resolvido, a voz NAO chega ao Discord/jogo.
 */
export type CableSinkResult =
  | { status: 'found'; id: string; label: string }
  | { status: 'not-found' }
  | { status: 'permission-denied' }
  | { status: 'unsupported' }

/** Escolhe o melhor sink de saida entre os devices: "CABLE Input" > "cable". */
export function pickCableOutput(
  devices: Array<Pick<MediaDeviceInfo, 'kind' | 'label' | 'deviceId'>>,
): { id: string; label: string } | null {
  const outs = devices.filter((d) => d.kind === 'audiooutput')
  const found =
    outs.find((d) => /cable input/i.test(d.label)) || outs.find((d) => /cable/i.test(d.label)) || null
  return found ? { id: found.deviceId, label: found.label || 'CABLE Input' } : null
}

/**
 * Resolve o dispositivo de saida "CABLE Input" para rotear a voz online
 * (Edge TTS) via setSinkId. Ponto UNICO de resolucao — usado pelo boot do app,
 * pelo toggle do mic e pelos atalhos globais.
 *
 * Com `requestPermission`, pede permissao de microfone quando os labels vierem
 * vazios (necessario para enxergar os nomes dos devices). Sem ela, so tenta a
 * enumeracao direta (uso em boot, sem prompt inesperado).
 */
export async function resolveCableSink(
  opts: { requestPermission?: boolean } = {},
): Promise<CableSinkResult> {
  if (!navigator.mediaDevices?.enumerateDevices) return { status: 'unsupported' }

  let devices: MediaDeviceInfo[]
  try {
    devices = await navigator.mediaDevices.enumerateDevices()
  } catch {
    return { status: 'unsupported' }
  }

  let found = pickCableOutput(devices)
  if (!found && opts.requestPermission && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      found = pickCableOutput(await navigator.mediaDevices.enumerateDevices())
    } catch {
      return { status: 'permission-denied' }
    }
  }

  return found ? { status: 'found', ...found } : { status: 'not-found' }
}

/**
 * Traduz o resultado do IPC de instalacao em um estado de UI + mensagem.
 */
export function resolveVBCableInstallState(result: VBCableInstallResult): VBCableInstallResolution {
  if (result.success && result.launched) {
    return {
      state: 'launched',
      message:
        result.message ||
        (result.downloaded
          ? 'Baixado e instalador aberto. Clique em "Install Driver" e, se pedir, reinicie o Windows.'
          : 'Instalador aberto. Siga o VB-Cable e reinicie o Windows se ele pedir.'),
    }
  }

  if (result.success) {
    return {
      state: 'manual',
      message:
        result.message ||
        'Nao foi possivel instalar automaticamente. Baixe o VB-Cable pelo site oficial e volte para verificar.',
    }
  }

  return {
    state: 'error',
    message: result.error || 'Nao foi possivel instalar o VB-Cable. Tente novamente ou use o site oficial.',
  }
}

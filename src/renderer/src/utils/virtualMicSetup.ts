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

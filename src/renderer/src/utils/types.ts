import { WhisperModelSizes, WhisperRuntimeTypes } from './constants'

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

export interface CaptionsConfig {
  modelSize: WhisperModelSizes
  nodeWorkerModel: string
  task: 'translate' | 'transcribe'
  runtime: WhisperRuntimeTypes
  usingGPU: boolean
  language?: string | null
  inputDeviceId: string | null
}

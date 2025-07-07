import { WhisperModelSizes } from './constants'

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]

export interface CaptionsConfig {
  modelSize: WhisperModelSizes
  task: 'translate' | 'transcribe'
  usingGPU: boolean
  language?: string | null
}

import { Worker } from 'worker_threads'

declare global {
  interface Window {
    api: {
      setHotkeyListeners: (primaryHotkey: string, secondaryHotkey: string) => void
      onHotkeyEvent: (callback: (state: 'DOWN' | 'UP') => void) => void
      openCaptions: () => void
      enableLoopbackAudio: () => Promise<void>
      disableLoopbackAudio: () => Promise<void>
      createCaptionsNodeWorker: () => void
      onCaptionsNodeWorkerMessage: (callback: Parameters<Worker['on']>[1]) => void
      sendCaptionsNodeWorkerMessage: (...params: Parameters<Parameters<Worker['on']>[1]>) => void
    }
  }
}

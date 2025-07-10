import { contextBridge, ipcRenderer } from 'electron'
import { IGlobalKey, IGlobalKeyEvent } from 'node-global-key-listener'

let hotkeyEventListener: (event: Electron.IpcRendererEvent, state: IGlobalKeyEvent['state']) => void
let captionsCPUWorkerMessageListener: (event: Electron.IpcRendererEvent, message) => void

// Custom APIs for renderer
const api = {
  openCaptions: () => {
    ipcRenderer.send('open-captions')
  },
  setHotkeyListeners: (primaryHotkey: IGlobalKey, secondaryHotkey: IGlobalKey) =>
    ipcRenderer.send('set-hotkey-listeners', primaryHotkey, secondaryHotkey),
  onHotkeyEvent: (callback: (state: IGlobalKeyEvent['state']) => void) => {
    if (hotkeyEventListener) {
      ipcRenderer.off('hotkey-event', hotkeyEventListener)
    }
    hotkeyEventListener = (_: Electron.IpcRendererEvent, state: IGlobalKeyEvent['state']) =>
      callback(state)
    ipcRenderer.on('hotkey-event', hotkeyEventListener)
  },
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),
  createCaptionsCPUWorker: () => ipcRenderer.send('create-captions-cpu-worker'),
  onCaptionsCPUWorkerMessage: (callback) => {
    if (captionsCPUWorkerMessageListener) {
      ipcRenderer.off('captions-cpu-worker-sending-message', captionsCPUWorkerMessageListener)
    }
    captionsCPUWorkerMessageListener = (_, message) => callback(message)
    ipcRenderer.on('captions-cpu-worker-sending-message', captionsCPUWorkerMessageListener)
  },
  sendCaptionsCPUWorkerMessage: (message) => {
    ipcRenderer.send('captions-cpu-worker-receiving-message', message)
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}

import { contextBridge, ipcRenderer } from 'electron'
import { IGlobalKey, IGlobalKeyEvent } from 'node-global-key-listener'

let hotkeyEventListener: (event: Electron.IpcRendererEvent, state: IGlobalKeyEvent['state']) => void
let captionsNodeWorkerMessageListener: (event: Electron.IpcRendererEvent, message) => void
let captionsWindowMoveListener: (
  event: Electron.IpcRendererEvent,
  width: number,
  height: number,
  scaleFactor: number
) => void

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
  createCaptionsNodeWorker: () => ipcRenderer.send('create-captions-cpu-worker'),
  onCaptionsNodeWorkerMessage: (callback) => {
    if (captionsNodeWorkerMessageListener) {
      ipcRenderer.off('captions-cpu-worker-sending-message', captionsNodeWorkerMessageListener)
    }
    captionsNodeWorkerMessageListener = (_, message) => callback(message)
    ipcRenderer.on('captions-cpu-worker-sending-message', captionsNodeWorkerMessageListener)
  },
  sendCaptionsNodeWorkerMessage: (message) => {
    ipcRenderer.send('captions-cpu-worker-receiving-message', message)
  },
  onCaptionsWindowMove: (
    callback: (width: number, height: number, scaleFactor: number) => void
  ) => {
    if (captionsWindowMoveListener) {
      ipcRenderer.off('captions-window-move', captionsWindowMoveListener)
    }
    captionsWindowMoveListener = (
      _: Electron.IpcRendererEvent,
      _width: number,
      _height: number,
      _scaleFactor: number
    ) => callback(_width, _height, _scaleFactor)
    ipcRenderer.on('captions-window-move', captionsWindowMoveListener)
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}

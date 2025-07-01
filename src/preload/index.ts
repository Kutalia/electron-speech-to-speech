import { contextBridge, ipcRenderer } from 'electron'
import { IGlobalKey, IGlobalKeyEvent } from 'node-global-key-listener'

// Custom APIs for renderer
const api = {
  openCaptions: () => {
    ipcRenderer.send('open-captions')
  },
  setHotkeyListeners: (primaryHotkey: IGlobalKey, secondaryHotkey: IGlobalKey) =>
    ipcRenderer.send('set-hotkey-listeners', primaryHotkey, secondaryHotkey),
  onHotkeyEvent: (callback: (state: IGlobalKeyEvent['state']) => void) => {
    ipcRenderer.on('hotkey-event', (_, state: IGlobalKeyEvent['state']) => callback(state))
  },
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio')
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}

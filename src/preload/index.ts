import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import { IGlobalKeyEvent } from 'node-global-key-listener'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('electronAPI', {
      setHotkeyListeners: (hotkey: string) => ipcRenderer.send('set-hotkey-listeners', hotkey),
      onHotkeyEvent: (callback: (state: IGlobalKeyEvent['state']) => void) => {
        ipcRenderer.on('hotkey-event', (_, state: IGlobalKeyEvent['state']) => callback(state))
      },
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

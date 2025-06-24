import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    electronAPI: {
      setHotkeyListeners: (hotkey: string) => void
      onHotkeyEvent: (callback: (state: 'DOWN' | 'UP') => void) => void
    }
  }
}

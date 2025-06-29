import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      setHotkeyListeners: (primaryHotkey: string, secondaryHotkey: string) => void
      onHotkeyEvent: (callback: (state: 'DOWN' | 'UP') => void) => void
    }
  }
}

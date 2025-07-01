declare global {
  interface Window {
    api: {
      setHotkeyListeners: (primaryHotkey: string, secondaryHotkey: string) => void
      onHotkeyEvent: (callback: (state: 'DOWN' | 'UP') => void) => void
      openCaptions: () => void
      enableLoopbackAudio: () => Promise<void>
      disableLoopbackAudio: () => Promise<void>
    }
  }
}

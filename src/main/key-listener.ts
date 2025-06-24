import { GlobalKeyboardListener, IGlobalKeyEvent, IGlobalKeyListener } from "node-global-key-listener"

type Callbacks = Record<IGlobalKeyEvent['state'], () => void>
export type AddHotkeyListenersParams = { hotkey: string, callbacks: Callbacks }

type AddListeners = (params: AddHotkeyListenersParams) => void

const v = new GlobalKeyboardListener()

let removeListeners: () => void

export const addHotkeyListeners: AddListeners = ({ hotkey, callbacks }) => {
  if (removeListeners) {
    removeListeners()
  }

  const listeners: IGlobalKeyListener[] = []

  for (const state in callbacks) {
    listeners.push((e) => {
      if (
        e.state == state &&
        e.name === hotkey.toUpperCase()
      ) {
        callbacks[state]()
      }
    })
  }

  listeners.forEach((l) => v.addListener(l))

  removeListeners = () => listeners.forEach((l) => v.removeListener(l))
}

import {
  GlobalKeyboardListener,
  IGlobalKey,
  IGlobalKeyEvent,
  IGlobalKeyListener
} from 'node-global-key-listener'

type Callbacks = Record<IGlobalKeyEvent['state'], () => void>
export type AddHotkeyListenersParams = {
  primaryHotkey: IGlobalKey
  secondaryHotkey: IGlobalKey
  callbacks: Callbacks
}

type AddListeners = (params: AddHotkeyListenersParams) => void

const v = new GlobalKeyboardListener()

let removeListeners: () => void

export const addHotkeyListeners: AddListeners = ({ primaryHotkey, secondaryHotkey, callbacks }) => {
  if (removeListeners) {
    removeListeners()
  }

  const listeners: IGlobalKeyListener[] = []

  for (const state in callbacks) {
    listeners.push((e, down) => {
      if (
        e.state == state &&
        (e.state === 'UP' || secondaryHotkey === '' || down[secondaryHotkey]) &&
        e.name === primaryHotkey
      ) {
        callbacks[state]()
      }
    })
  }

  listeners.forEach((l) => v.addListener(l))

  removeListeners = () => listeners.forEach((l) => v.removeListener(l))
}

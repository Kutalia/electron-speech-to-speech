import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  BrowserWindowConstructorOptions,
  screen
} from 'electron'
import { IGlobalKey } from 'node-global-key-listener'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { addHotkeyListeners } from './key-listener'
import { checkAndApplyUpdates } from './updater'
import { initMain as initAudioLoopback } from 'electron-audio-loopback'
import { Worker } from 'node:worker_threads'
import captionsNodeWorkerPath from './captionsNodeWorker?modulePath'

app.commandLine.appendSwitch('disable-renderer-backgrounding')

// Create captions CPU worker on demand and handle hooking and clearing all listeners
const hookCaptionsWorker = (win: BrowserWindow) => {
  const onRequestCreateCaptionsWorker = () => {
    const captionsWorker = new Worker(captionsNodeWorkerPath)

    const onCaptionsWorkerSendingMessage = (message) => {
      if (message.status === 'initialized') {
        captionsWorker.postMessage({
          type: 'config',
          data: {
            sessionDataPath: app.getPath('sessionData')
          }
        })
      }

      win.webContents.send('captions-cpu-worker-sending-message', JSON.stringify(message))
    }
    captionsWorker.on('message', onCaptionsWorkerSendingMessage)

    const onCaptionsWorkerReceivingMessage = (_, message) => {
      captionsWorker.postMessage(JSON.parse(message))
    }
    ipcMain.on('captions-cpu-worker-receiving-message', onCaptionsWorkerReceivingMessage)

    win.once('close', () => {
      captionsWorker.terminate()
      ipcMain.off('captions-cpu-worker-receiving-message', onCaptionsWorkerReceivingMessage)
    })
  }

  // Limit requesting worker creation to 1 for each window
  ipcMain.once('create-captions-cpu-worker', onRequestCreateCaptionsWorker)
}

initAudioLoopback()

let captionsWindow: BrowserWindow | null = null

function createMainWindow(): void {
  const htmlFileName = 'index.html'

  const windowOptions: BrowserWindowConstructorOptions = {
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      backgroundThrottling: false
    }
  }

  // Create the browser window.
  const win = new BrowserWindow(windowOptions)

  ipcMain.on(
    'set-hotkey-listeners',
    (_, primaryHotkey: IGlobalKey, secondaryHotkey: IGlobalKey) => {
      addHotkeyListeners({
        primaryHotkey,
        secondaryHotkey,
        callbacks: {
          DOWN: () => win.webContents.send('hotkey-event', 'DOWN'),
          UP: () => win.webContents.send('hotkey-event', 'UP')
        }
      })
    }
  )

  ipcMain.on('open-captions', () => createCaptionsWindow())

  win.on('ready-to-show', () => {
    win.show()
    if (is.dev) {
      win.webContents.openDevTools()
    }
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${htmlFileName}`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${htmlFileName}`))
  }

  if (!is.dev) {
    setTimeout(() => {
      checkAndApplyUpdates()
    }, 1500)
  }
}

function createCaptionsWindow(): void {
  if (captionsWindow) {
    captionsWindow.show()
    return
  }

  const htmlFileName = 'index.captions.html'

  const windowOptions: BrowserWindowConstructorOptions = {
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      backgroundThrottling: false
    },
    transparent: true,
    frame: false,
    resizable: false,
    fullscreen: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: true, // to allow user actions like quitting and moving to another screen
    skipTaskbar: false
  }

  // Create the browser window.
  const win = new BrowserWindow(windowOptions)
  captionsWindow = win

  captionsWindow.on('move', () => {
    if (!captionsWindow) {
      return
    }

    const windowBounds = captionsWindow.getBounds()
    const currentDisplay = screen.getDisplayMatching(windowBounds)

    win.webContents.send(
      'captions-window-move',
      currentDisplay.size.width,
      currentDisplay.size.height,
      currentDisplay.scaleFactor
    )
  })

  hookCaptionsWorker(win)

  win.on('close', () => {
    captionsWindow = null
  })

  win.setIgnoreMouseEvents(true)

  win.on('ready-to-show', () => {
    win.show()
    if (is.dev) {
      win.webContents.openDevTools()
    }
    win.focus()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${htmlFileName}`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${htmlFileName}`))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // TODO: fix worker not loading in a built app when using cross origin isolation
  if (is.dev) {
    // Cross origin isolation to allow ONNX using multithreading for WASM
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Cross-Origin-Opener-Policy': ['same-origin'],
          'Cross-Origin-Embedder-Policy': ['require-corp']
        }
      })
    })
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createMainWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

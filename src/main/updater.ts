// https://github.com/HamzaAnwar1998/bookmark-app/blob/main/src/main/updater.js

import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { dialog } from 'electron'

// set autoUpdater logger method to the electron log
autoUpdater.logger = log
const logger = log

// info
log.transports.file.level = 'info'

// set autoDownload to false
autoUpdater.autoDownload = false

// main exported function
export const checkAndApplyUpdates = () => {
  // check and notify updates
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    dialog.showErrorBox('There was an error', err + ' occurred while trying to look for updates')
    logger.info('There was an error with checking for updates: ' + err)
  })

  // update available
  autoUpdater.on('update-available', () => {
    logger.info('There is an update available')
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update available',
        message: 'A new update is available of Readit app. Do you want to update now?',
        buttons: ['Update', 'No']
      })
      .then((res) => {
        if (res.response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
      .catch((err) => logger.info('There has been an error downloading the update' + err))
  })

  // download progress
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
    logger.info(log_message)
  })

  // error
  autoUpdater.on('error', (err) => {
    dialog.showErrorBox(
      'Update Error',
      'An error occurred during the update process: ' + err.message
    )
    logger.error('An error occurred during the update process: ' + err.message)
  })

  // update downloaded
  autoUpdater.on('update-downloaded', () => {
    logger.info('Update downloaded')
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: 'Update has been downloaded. Do you want to quit and restart?',
        buttons: ['Restart', 'Later']
      })
      .then((res) => {
        if (res.response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
  })
}

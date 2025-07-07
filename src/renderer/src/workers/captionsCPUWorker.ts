// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Whisper, manager } = require('smart-whisper-electron')

const DEFAULT_STT_CPU_MODEL = 'tiny'

const config = {
  language: 'auto',
  task: 'translate'
}
let whisper: typeof Whisper
let model: string

self.postMessage({ status: 'configured' })

const load = async () => {
  if (!whisper && !model) {
    self.postMessage({ status: 'loading', data: 'Downloading model...' })
    model = await manager.download(DEFAULT_STT_CPU_MODEL)

    self.postMessage({ status: 'loading', data: 'Loading model...' })
    try {
      whisper = new Whisper(manager.resolve(model), { gpu: false })
    } catch (err) {
      self.postMessage({ status: 'error', data: (err as Error).message })
    }
    self.postMessage({ status: 'ready' })
  }
}

let processing = false
const generate = async ({ audio }: { audio: Float32Array }) => {
  if (!whisper || processing) {
    return
  }

  processing = true

  self.postMessage({ status: 'start' })

  try {
    const textArr: string[] = []

    const transcribeTask = await whisper.transcribe(audio, {
      language: config.language,
      translate: config.task === 'translate',
      n_threads: 12
    })

    transcribeTask.on('transcribed', (result) => {
      textArr.push(result.text)
      self.postMessage({
        status: 'update',
        output: textArr.join('')
      })
    })

    transcribeTask.once('finish', () => {
      self.postMessage({
        status: 'complete'
      })
      processing = false
    })
  } catch (err) {
    self.postMessage({ status: 'error', data: (err as Error).message })
  } finally {
    processing = false
  }
}

self.addEventListener('message', (e) => {
  const { type, data } = e.data

  switch (type) {
    case 'load':
      load()
      break

    case 'generate':
      generate(data)
      break

    case 'config': {
      if (Object.prototype.hasOwnProperty.call(data, 'language')) {
        config.language = data.language
      }
      if (Object.prototype.hasOwnProperty.call(data, 'task')) {
        config.task = data.task
      }
      self.postMessage({ status: 'configured' })
      break
    }

    default:
      break
  }
})

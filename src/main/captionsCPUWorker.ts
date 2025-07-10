import { Whisper, manager } from 'smart-whisper-electron'
import { parentPort } from 'node:worker_threads'

const DEFAULT_STT_CPU_MODEL = 'tiny'

const ext = '.bin'

const removeTrailingExt = (str: string) => str.split(ext)[0]

const config = {
  language: 'auto',
  task: 'translate'
}
let whisper: Whisper
let model: string

parentPort?.postMessage({ status: 'configured' })

const load = async () => {
  if (!whisper && !model) {
    try {
      parentPort?.postMessage({ status: 'loading', data: 'Downloading model...' })

      let localRelativePath: string

      try {
        // Check if already downloaded
        // Needs filtering if model path is a remote URL
        localRelativePath = DEFAULT_STT_CPU_MODEL.split('/').reverse()[0]
        model = manager.resolve(removeTrailingExt(localRelativePath))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        localRelativePath = await manager.download(DEFAULT_STT_CPU_MODEL)
        model = manager.resolve(removeTrailingExt(localRelativePath))
      }

      parentPort?.postMessage({ status: 'loading', data: 'Loading model...' })
      whisper = new Whisper(model, { gpu: false })

      parentPort?.postMessage({ status: 'ready' })
    } catch (err) {
      parentPort?.postMessage({ status: 'error', data: (err as Error).message })
    }
  }
}

let processing = false
const generate = async (audio: Float32Array) => {
  if (!whisper || processing) {
    return
  }

  processing = true

  parentPort?.postMessage({ status: 'start' })

  try {
    const textArr: string[] = []

    const transcribeTask = await whisper.transcribe(audio, {
      language: config.language,
      translate: config.task === 'translate',
      n_threads: 12
    })

    transcribeTask.on('transcribed', (result) => {
      textArr.push(result.text)
      parentPort?.postMessage({
        status: 'update',
        output: textArr.join('')
      })
    })

    transcribeTask.once('finish', () => {
      parentPort?.postMessage({
        status: 'complete'
      })
      processing = false
    })
  } catch (err) {
    parentPort?.postMessage({ status: 'error', data: (err as Error).message })
  }
}

parentPort?.on('message', (eventData) => {
  if (!eventData) {
    return
  }

  const { type, data } = eventData

  switch (type) {
    case 'load':
      load()
      break

    case 'generate': {
      const { audio } = data
      if (!(audio instanceof Float32Array)) {
        // When JSON stringified Float32Array audio is passed
        const parsedAudio = new Float32Array(Object.values(audio))
        generate(parsedAudio)
      } else {
        generate(data)
      }
      break
    }

    case 'config': {
      if (Object.prototype.hasOwnProperty.call(data, 'language')) {
        config.language = data.language
      }
      if (Object.prototype.hasOwnProperty.call(data, 'task')) {
        config.task = data.task
      }
      parentPort?.postMessage({ status: 'configured' })
      break
    }

    default:
      break
  }
})

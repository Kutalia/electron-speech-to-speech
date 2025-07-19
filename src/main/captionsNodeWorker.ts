import whisper from '@kutalia/whisper-node-addon'
import { parentPort } from 'node:worker_threads'
import { download, ext, resolve, setRootPath } from './modelManager'

const removeTrailingExt = (str: string) => str.split(ext)[0]

const config = {
  language: null,
  task: 'translate',
  nodeWorkerModel: '',
  usingGPU: true,
  sessionDataPath: ''
}
let model: string

parentPort?.postMessage({ status: 'initialized' })

const load = async () => {
  if (typeof config.nodeWorkerModel !== 'string' || !config.nodeWorkerModel.length) {
    return
  }

  if (!model && config.sessionDataPath) {
    parentPort?.postMessage({ status: 'loading', data: 'Downloading model...' })

    let localRelativePath: string

    try {
      // Check if already downloaded
      // Needs filtering if model path is a remote URL
      localRelativePath = config.nodeWorkerModel.split('/').reverse()[0]
      model = resolve(removeTrailingExt(localRelativePath))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      localRelativePath = await download(config.nodeWorkerModel)
      model = resolve(removeTrailingExt(localRelativePath))
    } finally {
      parentPort?.postMessage({ status: 'ready' })
    }
  }
}

let processing = false
const generate = async (audio: Float32Array) => {
  if (processing || !model) {
    return
  }

  processing = true

  parentPort?.postMessage({ status: 'start' })

  whisper
    .transcribe({
      pcmf32: audio,
      model,
      language: config.language ?? 'en',
      translate: config.task === 'translate',
      use_gpu: config.usingGPU,
      no_timestamps: true,
      progress_callback: () => {
        parentPort?.postMessage({
          status: 'update'
        })
      }
    })
    .then((result) => {
      const text = result.transcription[0] ? result.transcription[0][2] : ''

      parentPort?.postMessage({
        status: 'complete',
        output: text
      })
      processing = false
      console.log('complete', text)
    })
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
      if (Object.prototype.hasOwnProperty.call(data, 'nodeWorkerModel') && data.nodeWorkerModel) {
        config.nodeWorkerModel = data.nodeWorkerModel
      }
      if (
        Object.prototype.hasOwnProperty.call(data, 'usingGPU') &&
        typeof data.usingGPU === 'boolean'
      ) {
        config.usingGPU = data.usingGPU
      }
      if (Object.prototype.hasOwnProperty.call(data, 'sessionDataPath') && data.sessionDataPath) {
        config.sessionDataPath = data.sessionDataPath
        setRootPath(data.sessionDataPath)
      }
      if (config.sessionDataPath) {
        parentPort?.postMessage({ status: 'configured' })
      }
      break
    }

    default:
      break
  }
})

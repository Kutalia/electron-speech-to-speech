import {
  AutoTokenizer,
  AutoProcessor,
  WhisperForConditionalGeneration,
  TextStreamer,
  full,
  PreTrainedTokenizer,
  ProgressCallback,
  Processor,
  PreTrainedModel
} from '@huggingface/transformers'

const MAX_NEW_TOKENS = 64

const ports: MessagePort[] = []

const defaultTask: 'translate' | 'transcribe' = 'translate'
const defaultLanguage: string | null = null // Auto-detection

let config = {
  task: defaultTask,
  language: defaultLanguage
}

const postMessageToAllPorts = (...params: Parameters<MessagePort['postMessage']>) => {
  ports.forEach((port) => {
    port.postMessage(...params)
  })
}

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class AutomaticSpeechRecognitionPipeline {
  static model_id = 'onnx-community/whisper-small'
  static tokenizer: Promise<PreTrainedTokenizer> | null = null
  static processor: Promise<Processor> | null = null
  static model: Promise<PreTrainedModel> | null = null

  static async getInstance(progress_callback?: ProgressCallback) {
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback
    })
    this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
      progress_callback
    })

    this.model ??= WhisperForConditionalGeneration.from_pretrained(this.model_id, {
      dtype: {
        encoder_model: 'fp32', // 'fp16' works too
        decoder_model_merged: 'q4' // or 'fp32' ('fp16' is broken)
      },
      device: 'webgpu',
      progress_callback
    })

    return Promise.all([this.tokenizer, this.processor, this.model])
  }
}

let processing = false
async function generate({ audio }) {
  if (processing) return
  processing = true

  // Tell the main thread we are starting
  postMessageToAllPorts({ status: 'start' })

  // Retrieve the text-generation pipeline.
  const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance()

  let startTime: number
  let numTokens = 0
  let tps: number
  const token_callback_function = () => {
    startTime ??= performance.now()

    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000
    }
  }
  const callback_function = (output: string) => {
    postMessageToAllPorts({
      status: 'update',
      output,
      tps,
      numTokens
    })
  }

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function
  })

  const inputs = await processor(audio)

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: MAX_NEW_TOKENS,
    language: config.language,
    streamer,
    task: config.task
  })

  const decoded = tokenizer.batch_decode(outputs as number[][], {
    skip_special_tokens: true
  })

  // Send the output back to the main thread
  postMessageToAllPorts({
    status: 'complete',
    output: decoded
  })
  processing = false
}

async function load() {
  postMessageToAllPorts({
    status: 'loading',
    data: 'Loading model...'
  })

  // Load the pipeline and save it for future use.
  const [, , model] = await AutomaticSpeechRecognitionPipeline.getInstance((x) => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    postMessageToAllPorts(x)
  })

  postMessageToAllPorts({
    status: 'loading',
    data: 'Compiling shaders and warming up model...'
  })

  // Run model with dummy input to compile shaders
  await model.generate({
    // @ts-ignore potentially transformers.js side missed type declaration
    input_features: full([1, 80, 3000], 0.0),
    max_new_tokens: 1
  })
  postMessageToAllPorts({ status: 'ready' })
}

onconnect = function (event: MessageEvent) {
  const port = event.ports[0] // In Shared Workers ports number is always 1, it just denotes the port connecting to the main thread initating the connection
  port.start()
  ports.push(port)

  // Listen for messages from the main thread
  port.addEventListener('message', (e) => {
    const { type, data } = e.data

    switch (type) {
      case 'load':
        load()
        break

      case 'generate':
        generate(data)
        break

      case 'config':
        config = data
        break

      default:
        break
    }
  })
}

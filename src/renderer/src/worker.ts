import {
  AutomaticSpeechRecognitionOutput,
  pipeline,
  TextToAudioOutput,
  TranslationOutput,
  TranslationPipeline
} from '@huggingface/transformers'

export type ExecTaskResultData =
  | TranslationOutput
  | TranslationOutput[]
  | AutomaticSpeechRecognitionOutput
  | AutomaticSpeechRecognitionOutput[]
  | TextToAudioOutput
  | { src_lang: string; tgt_lang: string }

export type ExecTaskResult = {
  task:
    | 'translation'
    | 'text-to-audio'
    | 'automatic-speech-recognition'
    | 'change-languages'
    | 'get-languages'
  data: ExecTaskResultData
  status: string
}

import { DEFAULT_SRC_LANG, DEFAULT_TGT_LANG, STT_MODEL_OPTIONS } from './utils/constants'
import { getLangNameByCode, getTranslationModels } from './utils/helpers'
import { synthesizeWithVits } from './utils/textToSpeechVits'

const transcribe = await pipeline(
  'automatic-speech-recognition',
  STT_MODEL_OPTIONS['small'].model,
  STT_MODEL_OPTIONS['small'].options
)

type ChangeTranslationLanguagesParams = Partial<{ src_lang: string; tgt_lang: string }>

let translate: TranslationPipeline
let saved_src_lang = DEFAULT_SRC_LANG
let saved_tgt_lang = DEFAULT_TGT_LANG

const getSavedLanguages = () => ({ src_lang: saved_src_lang, tgt_lang: saved_tgt_lang })

const setTranslationPipeline = async ({
  src_lang = saved_src_lang,
  tgt_lang = saved_tgt_lang
}: ChangeTranslationLanguagesParams) => {
  if (translate) {
    await translate.dispose()
  }

  const model = getTranslationModels().get(`${src_lang}-${tgt_lang}`) as string

  translate = await pipeline<'translation'>(
    'translation',
    model,
    model.indexOf('Xenova') === -1
      ? { device: 'webgpu', dtype: 'q4' }
      : { device: 'wasm', dtype: 'fp32' }
  )

  saved_src_lang = src_lang
  saved_tgt_lang = tgt_lang

  self.postMessage({
    status: 'languages-changed',
    data: getSavedLanguages()
  })
}

await setTranslationPipeline({})

self.postMessage({
  status: 'ready'
})

self.addEventListener('message', async (event) => {
  const message = event.data

  let result: ExecTaskResultData

  switch (message.task) {
    case 'translation': {
      result = await translate(message.data)
      break
    }
    case 'automatic-speech-recognition': {
      result = await transcribe(message.data, {
        language: getLangNameByCode(saved_src_lang) as string,
        task: 'transcribe'
      })

      break
    }
    case 'text-to-audio': {
      // TODO: fix potential memory loop by manually building the fork https://github.com/diffusionstudio/vits-web/pull/5
      result = await synthesizeWithVits(message.data, saved_tgt_lang)

      break
    }
    case 'change-languages': {
      await setTranslationPipeline(message.data)

      break
    }
    case 'get-languages': {
      result = getSavedLanguages()

      break
    }
    default:
      break
  }

  self.postMessage({
    status: 'complete',
    task: message.task,
    data: result!
  } as ExecTaskResult)
})

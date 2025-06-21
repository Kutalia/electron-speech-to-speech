import { AutomaticSpeechRecognitionOutput, pipeline, TextToAudioOutput, TranslationOutput, TranslationPipeline } from "@huggingface/transformers";

import {
  DEFAULT_SRC_LANG, DEFAULT_TGT_LANG,
  STT_MODEL_OPTIONS,
  TTT_MODEL_PREFIX,
} from "./utils/constants";
import { synthesizeWithVits } from "./utils/textToSpeechVits";
import { getLangNameByCode } from "./utils/helpers";

const transcribe = await pipeline('automatic-speech-recognition', STT_MODEL_OPTIONS['small'].model, STT_MODEL_OPTIONS['small'].options)

type ChangeTranslationLanguagesParams = Partial<{ src_lang: string, tgt_lang: string }>

let translate: TranslationPipeline
let saved_src_lang = DEFAULT_SRC_LANG
let saved_tgt_lang = DEFAULT_TGT_LANG

const setTranslationPipeline = async ({ src_lang = saved_src_lang, tgt_lang = saved_tgt_lang }: ChangeTranslationLanguagesParams) => {
  if (translate) {
    await translate.dispose()
  }

  translate = await pipeline('translation',
    `${TTT_MODEL_PREFIX}en-${tgt_lang}`, // For now source language is always English as Whisper already translates everything to English
    { device: 'webgpu', dtype: 'q4' }
  )

  saved_src_lang = src_lang
  saved_tgt_lang = tgt_lang
}

await setTranslationPipeline({})

self.postMessage({
  status: 'ready',
})

self.addEventListener('message', async (event) => {
  const message = event.data

  let result: TranslationOutput | TranslationOutput[] | AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[] | TextToAudioOutput

  switch (message.task) {
    case 'translation': {
      result = await translate(message.data)
      break
    }
    case 'automatic-speech-recognition': {
      result = await transcribe(message.data, {
        language: getLangNameByCode(saved_src_lang),
        // TODO: consider using pure transcribed texts in the first place and only use Whisper's translation when there's no suitable standalone translation model available
        task: 'translate',
      })

      break
    }
    case 'text-to-audio': {
      result = await synthesizeWithVits(message.data, saved_tgt_lang)

      break
    }
    case 'change-languages': {
      await setTranslationPipeline(message.data)

      break
    }
    default: break
  }

  self.postMessage({
    status: 'complete',
    task: message.task,
    data: result!,
  })
})

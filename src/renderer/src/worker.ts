import { AutomaticSpeechRecognitionOutput, pipeline, TextToAudioOutput, TranslationOutput } from "@huggingface/transformers";

import {
  DEFAULT_LANG_TRANSCRIBE, DEFAULT_SRC_LANG_TRANSLATE, DEFAULT_TGT_LANG_TRANSLATE,
  // SPEAKER_EMBEDDINGS_URL,
  STT_MODEL,
  // TTS_MODEL,
  TTT_MODEL
} from "./utils/constants";
// import { generateWaveForm } from "./utils/textToSpeech";
// import { synthesizeWithKokoro } from "./utils/textToSpeechKokoro";
import { synthesizeWithVits } from "./utils/textToSpeechVits";

const [translate, transcribe
  // , synthesize
] = await Promise.all([
  pipeline('translation', TTT_MODEL),
  pipeline('automatic-speech-recognition', STT_MODEL, { device: 'webgpu' }),
  // pipeline('text-to-audio', TTS_MODEL, { device: 'webgpu', dtype: 'q8' }),
])

self.postMessage({
  status: 'ready',
})

self.addEventListener('message', async (event) => {
  const message = event.data

  let result: TranslationOutput | TranslationOutput[] | AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[] | TextToAudioOutput

  switch (message.task) {
    case 'translation': {
      result = await translate(message.data, {
        // @ts-ignore
        src_lang: DEFAULT_SRC_LANG_TRANSLATE,
        // @ts-ignore
        tgt_lang: DEFAULT_TGT_LANG_TRANSLATE,
        // max_length: 1024,
        // max_new_tokens: 2048,
        // num_beams: 8,
      })
      break
    }
    case 'automatic-speech-recognition': {
      result = await transcribe(message.data, {
        language: DEFAULT_LANG_TRANSCRIBE,
      })

      break
    }
    case 'text-to-audio': {
      // glitched
      // result = await synthesize(message.data, {
      //   speaker_embeddings: SPEAKER_EMBEDDINGS_URL,
      // })

      // glitched
      // result = await generateWaveForm(message.data)

      // result = await synthesizeWithKokoro(message.data)

      result = await synthesizeWithVits(message.data) // The most realistic so far with the largest voice coverage

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

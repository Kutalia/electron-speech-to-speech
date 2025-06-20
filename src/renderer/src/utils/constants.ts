import { PretrainedModelOptions } from "@huggingface/transformers"

export const SAMPLING_RATE = 16000

type WhisperModelSizes = 'small' | 'medium' | 'large'

type STT_MODEL_OPTIONS_TYPE = {
  [k in WhisperModelSizes]: {
    model: string
    options: PretrainedModelOptions
  }
}

export const STT_MODEL_OPTIONS: STT_MODEL_OPTIONS_TYPE = {
  small: {
    model: 'onnx-community/whisper-small',
    options: {
      device: 'webgpu'
    }
  },
  medium: {
    model: 'onnx-community/whisper-medium-ONNX',
    options: {
      // https://github.com/huggingface/transformers.js/issues/989#issuecomment-2439457733
      device: 'webgpu', dtype: {
        encoder_model: "fp32", // 'fp16' works too (if supported by GPU)
        decoder_model_merged: "q4", // or 'fp32' ('fp16' is broken)
      },
    }
  },
  large: {
    model: 'onnx-community/whisper-large-v3-turbo',
    options: {
      device: 'webgpu', dtype: {
        encoder_model: "q4",
        decoder_model_merged: "q4",
      },
    },
  }
}
// Might need clearing browser data after changing model https://github.com/huggingface/transformers.js/issues/142#issuecomment-2018326959
export const TTT_MODEL = 'Xenova/nllb-200-distilled-600M' // needs to be in worker for even wasm, WebGPU not working https://github.com/huggingface/transformers.js/issues/1317
// export const TTT_MODEL = 'Xenova/opus-mt-mul-en' // bad, produces gibberish
// export const TTT_MODEL = 'Xenova/mbart-large-50-many-to-many-mmt' // WebGPU not working
// export const TTS_MODEL = 'onnx-community/Kokoro-82M-ONNX'
export const TTS_MODEL = 'Xenova/speecht5_tts'
export const SPEAKER_EMBEDDINGS_URL = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin'

export const DEFAULT_LANG_TRANSCRIBE = 'english'

export const DEFAULT_SRC_LANG_TRANSLATE = 'eng_Latn'
export const DEFAULT_TGT_LANG_TRANSLATE = 'fra_Latn'
// export const DEFAULT_SRC_LANG_TRANSLATE = 'en_XX' // for Xenova/mbart-large-50-many-to-many-mmt
// export const DEFAULT_TGT_LANG_TRANSLATE = 'fr_XX'

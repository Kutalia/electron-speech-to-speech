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
      // https://github.com/huggingface/transformers.js/issues/1317
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

export const DEFAULT_SRC_LANG = 'en'
export const DEFAULT_TGT_LANG = 'fr'

export const DEFAULT_HOTKEY = 'CAPS_LOCK'
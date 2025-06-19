export const SAMPLING_RATE = 16000

export const STT_MODEL = 'onnx-community/whisper-small'
// Might need clearing browser data after changing model https://github.com/huggingface/transformers.js/issues/142#issuecomment-2018326959
// export const STT_MODEL = 'onnx-community/kb-whisper-medium-ONNX' // TODO: needs testing
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

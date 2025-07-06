import { PretrainedModelOptions } from '@huggingface/transformers'
import { IGlobalKey } from 'node-global-key-listener'

export const SAMPLING_RATE = 16000

export enum WhisperModelSizeOptions {
  TINY = 'tiny',
  BASE = 'base',
  SMALL = 'small',
  SMALL_FR = 'small_fr',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export type WhisperModelSizes = `${WhisperModelSizeOptions}`

type STT_MODEL_OPTIONS_TYPE = {
  [k in WhisperModelSizes]: {
    id: string
    options: PretrainedModelOptions
  }
}

export const STT_MODEL_OPTIONS: STT_MODEL_OPTIONS_TYPE = {
  tiny: {
    id: 'onnx-community/whisper-tiny-ONNX',
    options: {
      device: 'webgpu',
      dtype: 'fp32'
    }
  },
  base: {
    id: 'onnx-community/whisper-base',
    options: {
      device: 'webgpu',
      dtype: 'fp32'
    }
  },
  small: {
    id: 'onnx-community/whisper-small',
    options: {
      device: 'webgpu',
      dtype: 'fp32'
    }
  },
  // TODO: add more specialized Whisper models that are tested to work
  small_fr: {
    id: 'onnx-community/whisper-small-cv11-french-ONNX',
    options: {
      device: 'webgpu',
      dtype: 'fp32'
    }
  },
  medium: {
    id: 'onnx-community/whisper-medium-ONNX',
    options: {
      // https://github.com/huggingface/transformers.js/issues/989#issuecomment-2439457733
      // https://github.com/huggingface/transformers.js/issues/1317
      device: 'webgpu',
      dtype: {
        encoder_id: 'fp32', // 'fp16' works too (if supported by GPU)
        decoder_model_merged: 'q4' // or 'fp32' ('fp16' is broken)
      }
    }
  },
  large: {
    id: 'onnx-community/whisper-large-v3-turbo',
    options: {
      device: 'webgpu',
      dtype: {
        encoder_id: 'q4',
        decoder_model_merged: 'q4'
      }
    }
  }
}

export const DEFAULT_STT_MODEL_OPTION: WhisperModelSizes = 'small'

export const DEFAULT_SRC_LANG = 'en'
export const DEFAULT_TGT_LANG = 'fr'

export const DEFAULT_PRIMARY_HOTKEY: IGlobalKey = 'CAPS LOCK'
export const DEFAULT_SECONDARY_HOTKEY: IGlobalKey = 'LEFT CTRL'

const keyNumber: IGlobalKey[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const keyLetter: IGlobalKey[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z'
]
const keyAlphaNumeric: IGlobalKey[] = [...keyNumber, ...keyLetter]
const keyArrows: IGlobalKey[] = ['UP ARROW', 'DOWN ARROW', 'LEFT ARROW', 'RIGHT ARROW']
const keyNumpadNumbers: IGlobalKey[] = [
  'NUMPAD 0',
  'NUMPAD 1',
  'NUMPAD 2',
  'NUMPAD 3',
  'NUMPAD 4',
  'NUMPAD 5',
  'NUMPAD 6',
  'NUMPAD 7',
  'NUMPAD 8',
  'NUMPAD 9'
]
const keyNumpadSpecials: IGlobalKey[] = [
  'NUMPAD EQUALS',
  'NUMPAD DIVIDE',
  'NUMPAD MULTIPLY',
  'NUMPAD MINUS',
  'NUMPAD PLUS',
  'NUMPAD RETURN',
  'NUMPAD DOT'
]
const keyNumpad: IGlobalKey[] = [...keyNumpadNumbers, ...keyNumpadSpecials]
const keyModifiers: IGlobalKey[] = [
  'LEFT META',
  'RIGHT META',
  'LEFT CTRL',
  'RIGHT CTRL',
  'LEFT ALT',
  'RIGHT ALT',
  'LEFT SHIFT',
  'RIGHT SHIFT',
  'CAPS LOCK',
  'NUM LOCK',
  'SCROLL LOCK',
  'FN'
]
const keyFXX: IGlobalKey[] = [
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'F13',
  'F14',
  'F15',
  'F16',
  'F17',
  'F18',
  'F19',
  'F20',
  'F21',
  'F22',
  'F23',
  'F24'
]
const keySym: IGlobalKey[] = [
  'EQUALS',
  'MINUS',
  'SQUARE BRACKET OPEN',
  'SQUARE BRACKET CLOSE',
  'SEMICOLON',
  'QUOTE',
  'BACKSLASH',
  'COMMA',
  'DOT',
  'FORWARD SLASH'
]
const keyButtons: IGlobalKey[] = [
  'SPACE',
  'BACKSPACE',
  'RETURN',
  'ESCAPE',
  'BACKTICK',
  'SECTION',
  'DELETE',
  'TAB'
]
const keySpecials: IGlobalKey[] = [...keyFXX, ...keySym, ...keyButtons]
const keyRareUse: IGlobalKey[] = ['INS', 'NUMPAD CLEAR', 'PRINT SCREEN']
const scrollKeys: IGlobalKey[] = ['PAGE UP', 'PAGE DOWN', 'HOME', 'END']
const keyMouseButton: IGlobalKey[] = [
  'MOUSE LEFT',
  'MOUSE RIGHT',
  'MOUSE MIDDLE',
  'MOUSE X1',
  'MOUSE X2'
]

export const ALL_HOTKEYS = [
  ...keyAlphaNumeric,
  ...keyArrows,
  ...keyModifiers,
  ...keyMouseButton,
  ...keySpecials,
  ...keyNumpad,
  ...scrollKeys,
  ...keyRareUse
]

export const MAX_AUDIO_LENGTH = 30 // seconds
export const MAX_SAMPLES = SAMPLING_RATE * MAX_AUDIO_LENGTH

export const BROADCAST_CHANNEL_NAME = 'broadcast_channel'

// Voice ids verified to work, other voices for their respective languages (object key) might not work
export const VERIFIED_VOICES = {
  fr: 'fr_FR-siwis-medium'
}

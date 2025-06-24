import { env } from "@huggingface/transformers";
import * as tts from '@diffusionstudio/vits-web';

import { SAMPLING_RATE } from "./constants";
import whisperLanguages from './whisper-languages.json'
import { listOpusModels } from "./listOpusModels";

const opusModels = await listOpusModels()

env.allowLocalModels = false

function firstLetterUpperCase(str: string) {
  if (str.length < 2) {
    return str.toUpperCase()
  }

  return `${str[0].toUpperCase()}${str.slice(1).toLowerCase()}`
}

export function getMimeType() {
  const types = [
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/aac",
  ];
  for (let i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) {
      return types[i];
    }
  }
  return undefined;
}

export function getMediaStream(deviceId: MediaDeviceInfo['deviceId']) {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: {
        exact: deviceId,
      },
      sampleRate: SAMPLING_RATE,
      channelCount: 1,
    },
  })
}

const availableVoices = await tts.voices()

function getAvailableSpeakableLangs() {
  // Not taking translation models into account, which's list is unknown and will be tried to be fetched runtime
  return availableVoices.filter(
    ({ language: { name_english } }) => whisperLanguages.indexOf(name_english.toLowerCase()) !== -1
  )
}

// Returns the list of voices in languages also supported by whisper
// TODO: use nllb as the opus alternative, combine it's supported languages with the list
export function getVoices() {
  const availableSpeakableLangs = getAvailableSpeakableLangs()

  return Object.groupBy(availableSpeakableLangs, ({ language: { name_english } }) => name_english)
}

export function getLangCodeByName(langName: string) {
  const voiceGroups = getVoices()
  return voiceGroups[firstLetterUpperCase(langName)]![0].language.code
}

export function getLangNameByCode(langCode: string) {
  const voices = getAvailableSpeakableLangs()
  const voice = voices.find((voice) => voice.language.family === langCode)
  if (voice) {
    return voice.language.name_english
  }
  return null
}

export function getVoiceIdByLangCode(langCode: string, index: number = 0) {
  const langName = getLangNameByCode(langCode)
  if (langName) {
    return getVoices()[langName]![index].key
  }
  return null
}

export function getTranslationModels() {
  // Only returning "traditional" models (languages codes that contain 2 letters)
  const modelList = opusModels.filter((m) => m.split('/')[1].length === 13)
  let models = new Map<string, string>()

  const separator = 'mt-'

  modelList.forEach((m) => {
    const langPair = m.split(separator)[1]
    const isXenovaModel = m.includes('Xenova')
    const isOnnxCommunityModel = m.includes('onnx-community')

    if (!(isOnnxCommunityModel || isXenovaModel)) {
      // Only allow Xenova or onnx-community models which are guaranteed to run
      return
    }

    if (models.get(langPair)?.includes('onnx-community') && isXenovaModel) {
      // Do not let Xenova models replace onnx-community quality which come with q4 decoders
      return
    }

    models.set(langPair, m)
  })
  return models
}

export function getLanguages() {
  const translationModels = getTranslationModels()

  const inputTranslationLangs = Array.from(translationModels.keys()).map((k) => k.split('-')[0])
  const outputTranslationLangs = Array.from(translationModels.keys()).map((k) => k.split('-')[1])

  const languageCodes = {
    input: Array.from(new Set(inputTranslationLangs.filter(getLangNameByCode))),
    output: Array.from(new Set(outputTranslationLangs.filter(getLangNameByCode))),
  }

  return {
    input: languageCodes.input.map((l) => ({ value: l, label: getLangNameByCode(l) as string })),
    output: languageCodes.output.map((l) => ({ value: l, label: getLangNameByCode(l) as string })),
  }
}

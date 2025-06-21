import { env } from "@huggingface/transformers";
import * as tts from '@diffusionstudio/vits-web';

import { SAMPLING_RATE } from "./constants";
import whisperLanguages from '../utils/whisper-languages.json'

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

// Returns the list of voices in languages also supported by transcription model
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
  return voices.find((voice) => voice.language.family === langCode)!
    .language.name_english
}

export function getVoiceIdByLangCode(langCode: string, index: number = 0) {
  return getVoices()[getLangNameByCode(langCode)]![index].key
}
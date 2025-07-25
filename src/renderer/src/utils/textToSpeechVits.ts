import * as tts from '@diffusionstudio/vits-web'
import { getLangNameByCode, getVoiceIdByLangCode, getVoices } from './helpers'
import { WavDecoder } from './wavDecoder'
import { VERIFIED_VOICES } from './constants'

export const synthesizeWithVits = async (text: string, langCode: string) => {
  let tryCount = 0
  const voiceGroup = getVoices()[getLangNameByCode(langCode) as string]
  let wav = new Blob()

  // Need to iterate through all voices in the family because some of them sometimes might be glitchy
  // TODO: allow manual voice selection in UI
  do {
    try {
      wav = await tts.predict({
        text,
        voiceId:
          VERIFIED_VOICES[langCode] ?? (getVoiceIdByLangCode(langCode, tryCount) as tts.VoiceId)
      })

      break
    } catch (err) {
      console.error(err)
      tryCount++
    }
  } while (tryCount < voiceGroup!.length)

  if (!wav.size) {
    return {
      audio: new Float32Array(),
      sampling_rate: 0
    }
  }

  const decoded = await WavDecoder.decode(await wav.arrayBuffer())

  if (!(decoded instanceof Error)) {
    return {
      audio: decoded.channelData[0],
      sampling_rate: decoded.sampleRate
    }
  }

  return {
    audio: [],
    sampling_rate: 16000
  }
}

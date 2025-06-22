import * as tts from '@diffusionstudio/vits-web';
import { getLangNameByCode, getVoiceIdByLangCode, getVoices } from './helpers';
import { WavDecoder } from "./wavDecoder";

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
        voiceId: getVoiceIdByLangCode(langCode, tryCount) as tts.VoiceId,
      });

      break
    } catch (err) {
      tryCount++
    }
  } while (tryCount < voiceGroup!.length)

  if (!wav.size) {
    return {
      audio: new Float32Array(),
      sampling_rate: 0,
    }
  }

  const decoded = await WavDecoder.decode(await wav.arrayBuffer())

  return {
    audio: decoded.channelData[0],
    sampling_rate: decoded.sampleRate,
  }
}

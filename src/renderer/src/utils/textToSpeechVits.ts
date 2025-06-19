import * as tts from '@diffusionstudio/vits-web';
import { WavDecoder } from "./wavDecoder";

export const synthesizeWithVits = async (text: string) => {
  const wav = await tts.predict({
    text,
    voiceId: 'fr_FR-tom-medium',
  });

  const decoded = await WavDecoder.decode(await wav.arrayBuffer())

  return {
    audio: decoded.channelData[0],
    sampling_rate: decoded.sampleRate,
  }
}

// @ts-ignore
import { KokoroTTS } from "kokoro-js";

const model_id = "onnx-community/Kokoro-82M-ONNX";
// WebGPU is unusable https://github.com/hexgrad/kokoro/issues/98
const tts = await KokoroTTS.from_pretrained(model_id, {
  dtype: "q8", // Options: "fp32", "fp16", "q8", "q4", "q4f16"
});

// TODO: needs configuring to automatically assign the correct voice according to the input language
export const synthesizeWithKokoro = async (text: string) => {
  const audio = await tts.generate(text, {
    // Use `tts.list_voices()` to list all available voices
    voice: "af_bella",
  });

  return audio
}

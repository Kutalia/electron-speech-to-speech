// @ts-nocheck

import { AutoTokenizer, AutoProcessor, SpeechT5ForTextToSpeech, SpeechT5HifiGan, Tensor } from '@huggingface/transformers';

// Load the tokenizer and processor
const tokenizer = await AutoTokenizer.from_pretrained('Xenova/speecht5_tts');
const processor = await AutoProcessor.from_pretrained('Xenova/speecht5_tts');

// Load the models
// NOTE: We use the unquantized versions as they are more accurate
const model = await SpeechT5ForTextToSpeech.from_pretrained('Xenova/speecht5_tts', { dtype: 'q8' });
const vocoder = await SpeechT5HifiGan.from_pretrained('Xenova/speecht5_hifigan', { dtype: 'q8' });

// Load speaker embeddings from URL
const speaker_embeddings_data = new Float32Array(
    await (await fetch('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin')).arrayBuffer()
);
const speaker_embeddings = new Tensor(
    'float32',
    speaker_embeddings_data,
    [1, speaker_embeddings_data.length]
)

// Generate waveform
export const generateWaveForm = async (text: string) => {
  // Run tokenization
  const { input_ids } = tokenizer(text);

  const result = await model.generate_speech(input_ids, speaker_embeddings, { vocoder });
  return {
    audio: result.waveform.data,
    sampling_rate: 16000,
  }
  // Tensor {
  //   dims: [ 26112 ],
  //   type: 'float32',
  //   size: 26112,
  //   data: Float32Array(26112) [ -0.00043630177970044315, -0.00018082228780258447, ... ],
  // }
}

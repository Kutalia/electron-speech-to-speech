import * as hub from "@huggingface/hub"
import opusModels from './opus-models.json'

const accessToken = import.meta.env.VITE_HUGGING_FACE_TOKEN

export const listOpusModels = async () => {
  if (!accessToken) {
    return opusModels
  }

  const modelsIt = hub.listModels({
    accessToken,
    search: {
      task: 'translation',
      query: 'opus-mt-',
      tags: ['onnx', 'transformers.js']
    }
  })

  const models: string[] = []

  for await (const model of modelsIt) {
    models.push(model.name)
  }

  return models
}
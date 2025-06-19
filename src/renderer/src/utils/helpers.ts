import { env } from "@huggingface/transformers";

import { SAMPLING_RATE } from "./constants";

env.allowLocalModels = false

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

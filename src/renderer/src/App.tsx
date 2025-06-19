import { useCallback, useState } from 'react'
import { AudioRecorder } from './components/AudioRecorder'
import { DeviceSelect } from './components/DeviceSelect'
import Versions from './components/Versions'
import { useWorker } from './hooks/useWorker'
import { SAMPLING_RATE } from './utils/constants'
import { AutomaticSpeechRecognitionOutput, TextToAudioOutput, TranslationOutput } from '@huggingface/transformers'

function App(): React.JSX.Element {
  const [inputDevice, setInputDevice] = useState<MediaDeviceInfo['deviceId']>('default')
  const [outputDevice, setOutputDevice] = useState<MediaDeviceInfo['deviceId']>('default')
  const [ttsResult, setTtsResult] = useState<TextToAudioOutput>()
  const { isReady, execTask } = useWorker()

  const onRecordingComplete = useCallback(async (blob: Blob) => {
    const audioContext = new AudioContext({
      sampleRate: SAMPLING_RATE,
    })

    const arrayBuffer = await blob.arrayBuffer()

    // Since MediaRecorder saves encoded audio data, we need to decode it to raw PCM
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const pcm = audioBuffer.getChannelData(0)

    const transcriptionResult = await execTask({ task: 'automatic-speech-recognition', data: pcm }) as AutomaticSpeechRecognitionOutput
    // @ts-ignore
    const text = transcriptionResult.text

    const translatedText = await execTask({ task: 'translation', data: text }) as TranslationOutput
    console.log({ text, translatedText })

    const synthesizingResult = await execTask({ task: 'text-to-audio', data: translatedText.map((t) => t.translation_text).join('') }) as TextToAudioOutput
    setTtsResult(synthesizingResult)
    console.log({ synthesizingResult })
  }, [execTask])

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-8 bg-[#1b1b1f]">
      <div className="flex flex-col items-center gap-8">
        <DeviceSelect
          kind="audioinput"
          onChange={setInputDevice}

        />
        <DeviceSelect
          kind="audiooutput"
          onChange={setOutputDevice}

        />
      </div>
      {
        !isReady ? <div className="loading loading-bars loading-xl text-accent" />
          : <AudioRecorder
            inputDeviceId={inputDevice}
            outputDeviceId={outputDevice}
            onRecordingComplete={onRecordingComplete}
            ttsResult={ttsResult}
          />
      }
      <div className="bg-white p-2 rounded-md">
        <Versions></Versions>
      </div>
    </div>
  )
}

export default App

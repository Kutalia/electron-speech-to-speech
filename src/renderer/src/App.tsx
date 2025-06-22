import { useCallback, useMemo, useState } from 'react'
import { AudioRecorder } from './components/AudioRecorder'
import { DeviceSelect } from './components/DeviceSelect'
import Versions from './components/Versions'
import { useWorker } from './hooks/useWorker'
import { DEFAULT_SRC_LANG, DEFAULT_TGT_LANG, SAMPLING_RATE } from './utils/constants'
import { AutomaticSpeechRecognitionOutput, TextToAudioOutput, TranslationOutput } from '@huggingface/transformers'
import { SelectLanguage } from './components/SelectLanguage'
import { getLanguages } from './utils/helpers'

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

    const translationResult = await execTask({ task: 'translation', data: text }) as TranslationOutput
    const translatedText = translationResult.map((t) => t.translation_text).join('')
    console.log({ text, translatedText })

    const synthesizingResult = await execTask({ task: 'text-to-audio', data: translatedText }) as TextToAudioOutput
    setTtsResult(synthesizingResult)
    console.log({ synthesizingResult })
  }, [execTask])

  const onSrcLangChange = useCallback((src_lang: string) => {
    execTask({ task: 'change-languages', data: { src_lang } })
  }, [execTask])

  const onTgtLangChange = useCallback((tgt_lang: string) => {
    execTask({ task: 'change-languages', data: { tgt_lang } })
  }, [execTask])

  const languages = useMemo(getLanguages, [])

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
        <div className="flex gap-4 justify-stretch w-80">
          <SelectLanguage options={languages.input} label="Input language" onChange={onSrcLangChange} defaultValue={DEFAULT_SRC_LANG} />
          <SelectLanguage options={languages.output} label="Output language" onChange={onTgtLangChange} defaultValue={DEFAULT_TGT_LANG} />
        </div>
      </div>
      {!isReady && <div className="loading loading-bars loading-xl text-accent" />}
      <div style={{ display: isReady ? 'block' : 'none' }}>
        <AudioRecorder
          inputDeviceId={inputDevice}
          outputDeviceId={outputDevice}
          onRecordingComplete={onRecordingComplete}
          ttsResult={ttsResult}
        />
      </div>
      <div className="bg-white p-2 rounded-md">
        <Versions></Versions>
      </div>
    </div>
  )
}

export default App

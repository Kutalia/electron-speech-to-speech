import {
  AutomaticSpeechRecognitionOutput,
  TextToAudioOutput,
  TranslationOutput
} from '@huggingface/transformers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AudioRecorder } from './components/AudioRecorder'
import { DeviceSelect } from './components/DeviceSelect'
import { Select } from './components/Select'
import Footer from './components/Footer'
import { useWorker } from './hooks/useWorker'
import {
  ALL_HOTKEYS,
  DEFAULT_PRIMARY_HOTKEY,
  DEFAULT_SECONDARY_HOTKEY,
  SAMPLING_RATE,
  WhisperModelSizeOptions,
  WhisperModelSizes
} from './utils/constants'
import { getLanguages, getTranslationModels } from './utils/helpers'

function App(): React.JSX.Element {
  const [inputDevice, setInputDevice] = useState<MediaDeviceInfo['deviceId']>('default')
  const [outputDevice, setOutputDevice] = useState<MediaDeviceInfo['deviceId']>('default')
  const [ttsResult, setTtsResult] = useState<TextToAudioOutput>()
  const { isReady, execTask, languages: savedLanguages, sttModel } = useWorker()
  const [isRecording, setIsRecording] = useState(false)
  const [primaryHotkey, setPrimaryHotkey] = useState(DEFAULT_PRIMARY_HOTKEY)
  const [secondaryHotkey, setSecondaryHotkey] = useState<typeof primaryHotkey | ''>(
    DEFAULT_SECONDARY_HOTKEY
  )

  const onRecordingComplete = useCallback(
    async (blob: Blob) => {
      const audioContext = new AudioContext({
        sampleRate: SAMPLING_RATE
      })

      const arrayBuffer = await blob.arrayBuffer()

      // Since MediaRecorder saves encoded audio data, we need to decode it to raw PCM
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const pcm = audioBuffer.getChannelData(0)

      const transcriptionResult = (await execTask({
        task: 'automatic-speech-recognition',
        data: pcm
      })) as AutomaticSpeechRecognitionOutput
      const text = transcriptionResult.text

      const translationResult = (await execTask({
        task: 'translation',
        data: text
      })) as TranslationOutput
      const translatedText = translationResult.map((t) => t.translation_text).join('')
      console.log({ text, translatedText })

      const synthesizingResult = (await execTask({
        task: 'text-to-audio',
        data: translatedText
      })) as TextToAudioOutput
      setTtsResult(synthesizingResult)
      console.log({ synthesizingResult })
    },
    [execTask]
  )

  const onSrcLangChange = useCallback(
    (src_lang: string) => {
      execTask({ task: 'change-languages', data: { src_lang } })
    },
    [execTask]
  )

  const onTgtLangChange = useCallback(
    (tgt_lang: string) => {
      execTask({ task: 'change-languages', data: { tgt_lang } })
    },
    [execTask]
  )

  const allLanguages = useMemo(getLanguages, [])
  const translationModelsPairs = useMemo(() => Array.from(getTranslationModels().keys()), [])

  useEffect(() => {
    window.electronAPI.setHotkeyListeners(primaryHotkey, secondaryHotkey)
    window.electronAPI.onHotkeyEvent((state) => {
      setIsRecording(state === 'DOWN')
    })
  }, [primaryHotkey, secondaryHotkey])

  const onPrimaryHotkeyChange = useCallback((h: string) => {
    setPrimaryHotkey(h as typeof primaryHotkey)
  }, [])

  const onSecondaryHotkeyChange = useCallback((h: string) => {
    setSecondaryHotkey(h as typeof secondaryHotkey)
  }, [])

  const onSttModelChange = useCallback(
    (model: string) => {
      execTask({ task: 'change-stt-model', data: model as WhisperModelSizes })
    },
    [execTask]
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-8 bg-[#1b1b1f]">
      <div className="flex flex-col items-center gap-8">
        <DeviceSelect kind="audioinput" onChange={setInputDevice} />
        <DeviceSelect kind="audiooutput" onChange={setOutputDevice} />
        <div className="flex gap-4 justify-stretch w-80">
          <Select
            options={allLanguages.input}
            label="Input language"
            onChange={onSrcLangChange}
            defaultValue={savedLanguages.src_lang}
          />
          <Select
            options={allLanguages.output}
            disabledOptions={allLanguages.output
              .filter(
                ({ value: l }) =>
                  !translationModelsPairs.find((p) => p === `${savedLanguages.src_lang}-${l}`)
              )
              .map((v) => v.value)}
            label="Output language"
            onChange={onTgtLangChange}
            defaultValue={savedLanguages.tgt_lang}
          />
        </div>
        <div className="flex gap-4 justify-stretch w-80">
          <Select
            options={['', ...ALL_HOTKEYS]}
            label="Secondary Hotkey"
            onChange={onSecondaryHotkeyChange}
            defaultValue={secondaryHotkey}
          />
          <div className="text-white self-center">+</div>
          <Select
            options={ALL_HOTKEYS}
            label="Primary Hotkey"
            onChange={onPrimaryHotkeyChange}
            defaultValue={primaryHotkey}
          />
        </div>
        <div className="flex gap-4 justify-stretch w-80">
          <Select
            options={Object.values(WhisperModelSizeOptions)}
            label="OpenAI Whisper Model Size"
            onChange={onSttModelChange}
            defaultValue={sttModel}
          />
        </div>
      </div>
      {!isReady && <div className="loading loading-bars loading-xl text-accent" />}
      <div style={{ display: isReady ? 'block' : 'none' }}>
        <AudioRecorder
          inputDeviceId={inputDevice}
          outputDeviceId={outputDevice}
          onRecordingComplete={onRecordingComplete}
          ttsResult={ttsResult}
          hotkeyPressed={isRecording}
        />
      </div>
      <div className="bg-white p-2 rounded-md">
        <Footer />
      </div>
    </div>
  )
}

export default App

import {
  AutomaticSpeechRecognitionOutput,
  TextToAudioOutput,
  TranslationOutput
} from '@huggingface/transformers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AudioRecorder } from '../components/AudioRecorder'
import { DeviceSelect } from '../components/DeviceSelect'
import { Select } from '../components/Select'
import Footer from '../components/Footer'
import { useWorker } from '../hooks/useWorker'
import {
  ALL_HOTKEYS,
  BROADCAST_CHANNEL_NAME,
  DEFAULT_PRIMARY_HOTKEY,
  DEFAULT_SECONDARY_HOTKEY,
  DEFAULT_STT_MODEL_OPTION,
  SAMPLING_RATE,
  WhisperModelSizeOptions,
  WhisperModelSizes
} from '../utils/constants'
import { getLanguages, getTranslationModels } from '../utils/helpers'
import { WhisperLanguageSelector } from '@renderer/components/WhisperLanguageSelector'

interface CaptionsConfig {
  modelSize: WhisperModelSizes
  task: 'translate' | 'transcribe'
  language?: string | null
}

const defaultCaptionsConfig: CaptionsConfig = {
  modelSize: WhisperModelSizeOptions.SMALL,
  task: 'translate',
  language: null
}

function SpeechToSpeech(): React.JSX.Element {
  const [inputDevice, setInputDevice] = useState<MediaDeviceInfo['deviceId']>('default')
  const [outputDevice, setOutputDevice] = useState<MediaDeviceInfo['deviceId']>('default')
  const [ttsResult, setTtsResult] = useState<TextToAudioOutput>()
  const [sttModel, setSttModel] = useState<WhisperModelSizes>(DEFAULT_STT_MODEL_OPTION)
  const {
    initWorker,
    isReady,
    isLoading,
    execTask,
    languages: savedLanguages
  } = useWorker({
    defaultValues: {
      sttModel
    }
  })
  const [isRecording, setIsRecording] = useState(false)
  const [primaryHotkey, setPrimaryHotkey] = useState(DEFAULT_PRIMARY_HOTKEY)
  const [secondaryHotkey, setSecondaryHotkey] = useState<typeof primaryHotkey | ''>(
    DEFAULT_SECONDARY_HOTKEY
  )
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel>()
  const [isCaptionsReady, setIsCaptionsReady] = useState(false) // If captions window is ready to receive config
  const [captionsConfig, setCaptionsConfig] = useState<CaptionsConfig>(defaultCaptionsConfig)
  const [captionsWorker, setCaptionsWorker] = useState<SharedWorker>()

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
    broadcastChannel?.addEventListener('message', (e) => {
      if (e.data.status === 'captions_ready') {
        setIsCaptionsReady(true)
        // Making sure the shared worker is initiated from captions window to save memory before the latter is opened
        setCaptionsWorker(
          new SharedWorker(new URL('../workers/captionsWorker.ts', import.meta.url), {
            type: 'module'
          })
        )
      }
    })

    return () => {
      broadcastChannel?.close()
    }
  }, [broadcastChannel])

  useEffect(() => {
    if (isCaptionsReady && captionsWorker) {
      captionsWorker.port.postMessage({
        type: 'config',
        data: captionsConfig
      })
    }
  }, [isCaptionsReady, captionsConfig, captionsWorker])

  useEffect(() => {
    // @ts-ignore missed preload type declaration
    window.api.setHotkeyListeners(primaryHotkey, secondaryHotkey)
    // @ts-ignore missed preload type declaration
    window.api.onHotkeyEvent((state: string) => {
      setIsRecording(state === 'DOWN')
    })
  }, [primaryHotkey, secondaryHotkey])

  const onLoadSttModels = () => {
    initWorker()
  }

  const onPrimaryHotkeyChange = useCallback((h: string) => {
    setPrimaryHotkey(h as typeof primaryHotkey)
  }, [])

  const onSecondaryHotkeyChange = useCallback((h: string) => {
    setSecondaryHotkey(h as typeof secondaryHotkey)
  }, [])

  const onSttModelChange = useCallback(
    (modelSize: string) => {
      setSttModel(modelSize as WhisperModelSizes)
      execTask({ task: 'change-stt-model', data: modelSize as WhisperModelSizes })
    },
    [execTask]
  )

  const onClickOpenCaptions = () => {
    // @ts-ignore missed preload type declaration
    window.api.openCaptions()
    setBroadcastChannel(new BroadcastChannel(BROADCAST_CHANNEL_NAME))
  }

  const handleCaptionsModelChange = useCallback((modelSize: string) => {
    setCaptionsConfig((prevState) => ({
      ...prevState,
      modelSize: modelSize as WhisperModelSizes
    }))
  }, [])

  const handleCaptionsLanguageChange = useCallback((language: string) => {
    setCaptionsConfig((prevState) => ({
      ...prevState,
      language
    }))
  }, [])

  const handleCaptionsTaskChange = useCallback((task: string) => {
    setCaptionsConfig((prevState) => ({
      ...prevState,
      task: task as 'translate' | 'transcribe'
    }))
  }, [])

  return (
    <div className="min-h-screen flex flex-col gap-8 items-center justify-between py-8 bg-[#1b1b1f]">
      <div className="flex flex-col items-center gap-8">
        <button
          disabled={isReady || isLoading}
          className="btn btn-secondary"
          onClick={onLoadSttModels}
        >
          Load Speech-to-Speech Models
        </button>
        <DeviceSelect kind="audioinput" onChange={setInputDevice} disabled={!isReady} />
        <DeviceSelect kind="audiooutput" onChange={setOutputDevice} disabled={!isReady} />
        <div className="flex gap-4 justify-stretch w-80">
          <Select
            options={allLanguages.input}
            label="Input language"
            onChange={onSrcLangChange}
            defaultValue={savedLanguages.src_lang}
            disabled={!isReady}
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
            disabled={!isReady}
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
      {isLoading && <div className="loading loading-bars loading-xl text-accent" />}
      {isReady && (
        <div style={{ display: !isLoading ? 'block' : 'none' }}>
          <AudioRecorder
            inputDeviceId={inputDevice}
            outputDeviceId={outputDevice}
            onRecordingComplete={onRecordingComplete}
            ttsResult={ttsResult}
            hotkeyPressed={isRecording}
          />
        </div>
      )}
      <div className="text-center w-80">
        <h2 className="text-white">Live Captions</h2>
        <Select
          options={Object.values(WhisperModelSizeOptions)}
          label={`OpenAI Whisper Model Size for Captioning${isCaptionsReady ? ' (restart app to change before opening captions)' : ''}`}
          onChange={handleCaptionsModelChange}
          defaultValue={captionsConfig.modelSize}
          disabled={isCaptionsReady}
        />
        <WhisperLanguageSelector
          language={captionsConfig.language}
          setLanguage={handleCaptionsLanguageChange}
        />
        <Select
          onChange={handleCaptionsTaskChange}
          options={['translate', 'transcribe']}
          defaultValue="translate"
          label="Caption Task"
        />
        <button className="btn btn-info mt-4" onClick={onClickOpenCaptions}>
          Open Captions
        </button>
      </div>
      <div className="bg-white p-2 rounded-md">
        <Footer />
      </div>
    </div>
  )
}

export default SpeechToSpeech

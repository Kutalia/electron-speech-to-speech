import {
  AutomaticSpeechRecognitionOutput,
  TextToAudioOutput,
  TranslationOutput
} from '@huggingface/transformers'
import { WhisperLanguageSelector } from '@renderer/components/WhisperLanguageSelector'
import { CaptionsConfig, StsConfig } from '@renderer/utils/types'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AudioRecorder } from '../components/AudioRecorder'
import { DeviceSelect } from '../components/DeviceSelect'
import Footer from '../components/Footer'
import { Select } from '../components/Select'
import { useWorker } from '../hooks/useWorker'
import {
  ALL_HOTKEYS,
  BROADCAST_CHANNEL_NAME,
  CAPTIONS_CONFIG_STORAGE_KEY,
  DEFAULT_PRIMARY_HOTKEY,
  DEFAULT_SECONDARY_HOTKEY,
  DEFAULT_STT_MODEL_OPTION,
  SAMPLING_RATE,
  STS_CONFIG_STORAGE_KEY,
  STT_MODEL_OPTIONS,
  WHISPER_RUNTIMES,
  WhisperModelSizeOptions,
  WhisperModelSizes,
  WhisperRuntimeTypes
} from '../utils/constants'
import { getLanguages, getTranslationModels } from '../utils/helpers'
import { StaticTextareaWithLabel } from '@renderer/components/StaticTextareaWithLabel'

const defaultCaptionsConfig: CaptionsConfig = {
  modelSize: WhisperModelSizeOptions.SMALL,
  nodeWorkerModel: STT_MODEL_OPTIONS[WhisperModelSizeOptions.SMALL].nodeWorkerModel,
  task: 'translate',
  usingGPU: true,
  runtime: 'whisper.cpp',
  language: null,
  inputDeviceId: null,
  position: 'top'
}

const defaultStsConfig: StsConfig = {
  inputDevice: 'default',
  outputDevice: 'default',
  sttModel: DEFAULT_STT_MODEL_OPTION,
  primaryHotkey: DEFAULT_PRIMARY_HOTKEY,
  secondaryHotkey: DEFAULT_SECONDARY_HOTKEY
}

const stsConfigAtom = atomWithStorage(STS_CONFIG_STORAGE_KEY, defaultStsConfig)
const captionsConfigAtom = atomWithStorage(CAPTIONS_CONFIG_STORAGE_KEY, defaultCaptionsConfig)

function SpeechToSpeech(): React.JSX.Element {
  const [stsConfig, setStsConfig] = useAtom(stsConfigAtom)
  const [ttsResult, setTtsResult] = useState<TextToAudioOutput>()
  const {
    initWorker,
    isReady,
    isLoading,
    execTask,
    languages: savedLanguages
  } = useWorker({
    defaultValues: {
      sttModel: stsConfig.sttModel
    }
  })
  const [isRecording, setIsRecording] = useState(false)
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel>()
  const [isCaptionsWorkerReady, setIsCaptionsWorkerReady] = useState(false) // If captions worker set in captions window context is ready
  const [isCaptionsWindowReady, setIsCaptionsWindowReady] = useState(false)
  const [captionsConfig, setCaptionsConfig] = useAtom(captionsConfigAtom)
  const [captionsWorker, setCaptionsWorker] = useState<SharedWorker>()
  const [transcribedText, setTranscribedText] = useState<string>()
  const [translatedText, setTranslatedText] = useState<string>()

  const updateStsConfig = useCallback(
    (configPart: Partial<StsConfig>) => {
      setStsConfig((prevState) => ({
        ...prevState,
        ...configPart
      }))
    },
    [setStsConfig]
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

      setTranscribedText(text)

      const translationResult = (await execTask({
        task: 'translation',
        data: text
      })) as TranslationOutput
      const translatedText = translationResult.map((t) => t.translation_text).join('')

      setTranslatedText(translatedText)

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
    const bcListener = (e: MessageEvent<{ status: string; data: CaptionsConfig }>) => {
      switch (e.data.status) {
        case 'captions_window_ready': {
          setIsCaptionsWindowReady(true)
          break
        }
        case 'captions_worker_ready': {
          setIsCaptionsWorkerReady(true)

          if (e.data.data.runtime === 'transformers.js') {
            // Making sure the shared worker is initiated from captions window to save memory before the latter is opened
            setCaptionsWorker(
              (prevState) =>
                prevState ||
                new SharedWorker(new URL('../workers/captionsWorker.ts', import.meta.url), {
                  type: 'module'
                })
            )
          }

          break
        }
      }
    }

    broadcastChannel?.addEventListener('message', bcListener)

    return () => {
      broadcastChannel?.removeEventListener('message', bcListener)
      broadcastChannel?.close()
    }
  }, [broadcastChannel])

  useEffect(() => {
    if (isCaptionsWorkerReady && captionsWorker) {
      captionsWorker.port.postMessage({
        type: 'config',
        data: captionsConfig
      })
    }
  }, [isCaptionsWorkerReady, captionsConfig, captionsWorker])

  useEffect(() => {
    if (isCaptionsWindowReady && broadcastChannel) {
      broadcastChannel.postMessage({
        status: 'config',
        data: captionsConfig
      })
    }
  }, [isCaptionsWindowReady, captionsConfig, broadcastChannel])

  useEffect(() => {
    window.api.setHotkeyListeners(stsConfig.primaryHotkey, stsConfig.secondaryHotkey)
    window.api.onHotkeyEvent((state: string) => {
      setIsRecording(state === 'DOWN')
    })
  }, [stsConfig.primaryHotkey, stsConfig.secondaryHotkey])

  const onLoadSttModels = () => {
    initWorker()
  }

  const onPrimaryHotkeyChange = useCallback(
    (h: string) => {
      updateStsConfig({
        primaryHotkey: h as typeof DEFAULT_PRIMARY_HOTKEY
      })
    },
    [updateStsConfig]
  )

  const onSecondaryHotkeyChange = useCallback(
    (h: string) => {
      updateStsConfig({
        secondaryHotkey: h as typeof DEFAULT_SECONDARY_HOTKEY
      })
    },
    [updateStsConfig]
  )

  const onSttModelChange = useCallback(
    (modelSize: string) => {
      updateStsConfig({
        sttModel: modelSize as WhisperModelSizes
      })
      execTask({ task: 'change-stt-model', data: modelSize as WhisperModelSizes })
    },
    [execTask, updateStsConfig]
  )

  const onClickOpenCaptions = () => {
    window.api.openCaptions()
    setBroadcastChannel(new BroadcastChannel(BROADCAST_CHANNEL_NAME))
  }

  const handleCaptionsModelChange = useCallback(
    (modelSize: string) => {
      setCaptionsConfig((prevState) => ({
        ...prevState,
        modelSize: modelSize as WhisperModelSizes,
        nodeWorkerModel: STT_MODEL_OPTIONS[modelSize].nodeWorkerModel
      }))
    },
    [setCaptionsConfig]
  )

  const handleCaptionsLanguageChange = useCallback(
    (language: string) => {
      setCaptionsConfig((prevState) => ({
        ...prevState,
        language
      }))
    },
    [setCaptionsConfig]
  )

  const handleCaptionsTaskChange = useCallback(
    (task: string) => {
      setCaptionsConfig((prevState) => ({
        ...prevState,
        task: task as 'translate' | 'transcribe'
      }))
    },
    [setCaptionsConfig]
  )

  const handleCaptionsUsingGPUChange = useCallback(
    (useGPU: boolean) => {
      setCaptionsConfig((prevState) => ({
        ...prevState,
        usingGPU: useGPU
      }))
    },
    [setCaptionsConfig]
  )

  const handleCaptionsUsingSystemAudio = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const usingSystemAudio = !!event.target.checked

      setCaptionsConfig((prevState) => ({
        ...prevState,
        inputDeviceId: usingSystemAudio ? null : captionsConfig.inputDeviceId
      }))
    },
    [captionsConfig.inputDeviceId, setCaptionsConfig]
  )

  const handleCaptionsDeviceIdChange = useCallback(
    (deviceId: string) => {
      setCaptionsConfig((prevState) => ({
        ...prevState,
        inputDeviceId: deviceId
      }))
    },
    [setCaptionsConfig]
  )

  const handleCaptionsRuntimeChange = useCallback(
    (runtime: string) => {
      setCaptionsConfig((prevState) => ({
        ...prevState,
        runtime: runtime as WhisperRuntimeTypes
      }))
    },
    [setCaptionsConfig]
  )

  const handleCaptionsPositionChange = useCallback(
    (position: string) => {
      setCaptionsConfig((prevState) => ({
        ...prevState,
        position: position as 'top' | 'bottom'
      }))
    },
    [setCaptionsConfig]
  )

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
        <DeviceSelect
          kind="audioinput"
          value={stsConfig.inputDevice}
          onChange={(inputDevice) => updateStsConfig({ inputDevice })}
          disabled={!isReady}
        />
        <DeviceSelect
          kind="audiooutput"
          value={stsConfig.outputDevice}
          onChange={(outputDevice) => updateStsConfig({ outputDevice })}
          disabled={!isReady}
        />
        <div className="flex gap-4 justify-stretch w-80">
          <Select
            options={allLanguages.input}
            label="Input language"
            onChange={onSrcLangChange}
            value={savedLanguages.src_lang}
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
            value={savedLanguages.tgt_lang}
            disabled={!isReady}
          />
        </div>
        <div className="flex gap-4 justify-stretch w-80">
          <Select
            options={['', ...ALL_HOTKEYS]}
            label="Secondary Hotkey"
            onChange={onSecondaryHotkeyChange}
            value={stsConfig.secondaryHotkey}
          />
          <div className="text-white self-center">+</div>
          <Select
            options={ALL_HOTKEYS}
            label="Primary Hotkey"
            onChange={onPrimaryHotkeyChange}
            value={stsConfig.primaryHotkey}
          />
        </div>
        <div className="flex gap-4 justify-stretch w-80">
          <Select
            options={Object.values(WhisperModelSizeOptions)}
            label="OpenAI Whisper Model Size"
            onChange={onSttModelChange}
            value={stsConfig.sttModel}
          />
        </div>
      </div>
      {isLoading && <div className="loading loading-bars loading-xl text-accent" />}
      <div className="text-white w-80">
        {transcribedText && (
          <StaticTextareaWithLabel label="Last transcribed text" text={transcribedText} />
        )}
        {translatedText && (
          <StaticTextareaWithLabel label="Last translated text" text={translatedText} />
        )}
      </div>
      {isReady && (
        <div style={{ display: !isLoading ? 'block' : 'none' }}>
          <AudioRecorder
            inputDeviceId={stsConfig.inputDevice}
            outputDeviceId={stsConfig.outputDevice}
            onRecordingComplete={onRecordingComplete}
            ttsResult={ttsResult}
            hotkeyPressed={isRecording}
          />
        </div>
      )}
      <fieldset className="fieldset border-base-300 rounded-box text-center w-80 border p-4">
        <legend className="fieldset-legend text-white">
          Live Captions&nbsp;
          {isCaptionsWorkerReady && "(some settings can't be changed before restarting the app)"}
        </legend>

        <label className="label text-white gap-3 items-start">
          <div
            className="flex flex-col gap-1 tooltip"
            data-tip={
              WHISPER_RUNTIMES.find((runtime) => runtime.name === captionsConfig.runtime)
                ?.descriptionGPU
            }
          >
            <input
              type="radio"
              checked={captionsConfig.usingGPU}
              className="radio radio-info"
              onChange={() => handleCaptionsUsingGPUChange(true)}
              disabled={isCaptionsWorkerReady}
            />
            <p className="text-xs">Yes</p>
          </div>
          <div
            className="flex flex-col gap-1 tooltip"
            data-tip={
              WHISPER_RUNTIMES.find((runtime) => runtime.name === captionsConfig.runtime)
                ?.descriptionCPU
            }
          >
            <input
              type="radio"
              checked={!captionsConfig.usingGPU}
              className="radio radio-info tooltip"
              onChange={() => handleCaptionsUsingGPUChange(false)}
              disabled={isCaptionsWorkerReady}
            />
            <p className="text-xs">No</p>
          </div>
          Use GPU acceleration
        </label>

        <Select
          options={WHISPER_RUNTIMES.map((runtime) => runtime.name)}
          label="Whisper Runtime"
          onChange={handleCaptionsRuntimeChange}
          value={captionsConfig.runtime}
          disabled={isCaptionsWorkerReady}
        />
        <Select
          options={Object.values(WhisperModelSizeOptions)}
          label="OpenAI Whisper Model Size for Captioning"
          onChange={handleCaptionsModelChange}
          value={captionsConfig.modelSize}
          disabled={isCaptionsWorkerReady}
        />
        <WhisperLanguageSelector
          language={captionsConfig.language}
          setLanguage={handleCaptionsLanguageChange}
        />
        <Select
          onChange={handleCaptionsTaskChange}
          options={['translate', 'transcribe']}
          value={captionsConfig.task}
          label="Caption Task"
        />
        <Select
          onChange={handleCaptionsPositionChange}
          options={['top', 'bottom']}
          value={captionsConfig.position}
          label="Position"
        />

        <div className="flex flex-col items-start gap-2 mt-3">
          <label className="label text-white">
            <input
              type="checkbox"
              checked={!captionsConfig.inputDeviceId}
              className="checkbox checkbox-info"
              onChange={handleCaptionsUsingSystemAudio}
            />
            Use System Audio
          </label>
          <legend className="fieldset-legend text-white">Captured Input Audio Device</legend>
          <DeviceSelect
            kind="audioinput"
            value={captionsConfig.inputDeviceId}
            onChange={handleCaptionsDeviceIdChange}
            disabled={!captionsConfig.inputDeviceId}
          />
        </div>

        <button className="btn btn-info mt-4" onClick={onClickOpenCaptions}>
          Open Captions
        </button>
      </fieldset>
      <div className="bg-white p-2 rounded-md">
        <Footer />
      </div>
    </div>
  )
}

export default SpeechToSpeech

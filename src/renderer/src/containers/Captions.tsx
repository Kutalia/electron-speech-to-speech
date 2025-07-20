import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Progress } from '@renderer/components/Progress'
import { VoiceActivityDetection } from '@renderer/components/VoiceActivityDetection'
import {
  BROADCAST_CHANNEL_NAME,
  MAX_SAMPLES,
  MIN_AUDIO_LENGTH,
  SAMPLING_RATE
} from '@renderer/utils/constants'
import { getMediaStream } from '@renderer/utils/helpers'
import { CaptionsConfig } from '@renderer/utils/types'

type WorkerHelper = Partial<{
  worker: Worker | SharedWorker
  workerPostMessage: Worker['postMessage'] | MessagePort['postMessage']
  workerAddEventListener: (event: string, listener: (e: MessageEvent) => void) => void
  workerRemoveEventListener: (event: string, listener: (e: MessageEvent) => void) => void
}>

interface IProgress {
  text: string
  progress: number
  total: number
  file: string
}

type ProgressEventData = { status: 'progress'; file?: string }
type CompleteEventData = { status: 'complete'; output: string }
type LoadingEventData = { status: 'loading'; data: string }
type ConfiguredEventData = { status: 'configured' }
type ReadyEventData = { status: 'ready' }
type StartEventData = { status: 'start' }
type UpdateEventData = { status: 'update'; output: string; tps?: number }
type ErrorEventData = { status: 'error'; data: string }

type WorkerMessageData =
  | ProgressEventData
  | CompleteEventData
  | LoadingEventData
  | ConfiguredEventData
  | ReadyEventData
  | StartEventData
  | UpdateEventData
  | ErrorEventData

function Captions() {
  const [config, setConfig] = useState<CaptionsConfig>()
  const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>()
  const [windowDimensions, setWindowDimensions] = useState<{ width: number; height: number }>()

  const { workerPostMessage, workerAddEventListener, workerRemoveEventListener } =
    useMemo<WorkerHelper>(() => {
      switch (config?.runtime) {
        case 'transformers.js': {
          const w = new SharedWorker(new URL('../workers/captionsWorker.ts', import.meta.url), {
            type: 'module'
          })
          w.port.start()
          return {
            workerPostMessage: w.port.postMessage.bind(w.port),
            workerAddEventListener: w.port.addEventListener.bind(w.port),
            workerRemoveEventListener: w.port.addEventListener.bind(w.port)
          }
        }
        case 'whisper.cpp': {
          window.api.createCaptionsNodeWorker()

          return {
            workerPostMessage: (message) =>
              window.api.sendCaptionsNodeWorkerMessage(JSON.stringify(message)),
            workerAddEventListener: (_, listener) =>
              window.api.onCaptionsNodeWorkerMessage((message) =>
                listener({ data: JSON.parse(message) } as MessageEvent)
              )
          }
        }

        default:
          return {}
      }
    }, [config?.runtime])

  // Model loading and progress
  const [status, setStatus] = useState<'loading' | 'configured' | 'ready'>()
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progressItems, setProgressItems] = useState<IProgress[]>([])

  // Inputs and outputs
  const [text, setText] = useState('')
  const [tps, setTps] = useState<number | null>(null)

  // Processing
  const [isProcessing, setIsProcessing] = useState(false)
  const [stream, setStream] = useState<MediaStream>(new MediaStream())
  const audioRef = useRef<Float32Array>(null)
  const highPriorityAudioRef = useRef<Float32Array>(null) // Needs to be queued for transcription even if chunks are being processed

  // Voice Activity Detection
  const lastTimeTalkStarted = useRef<number>(0)
  const isTalkingRef = useRef<boolean>(null)
  const onSpeechRealStart = useCallback(() => {
    lastTimeTalkStarted.current = Date.now()
    isTalkingRef.current = true
    console.log('Started talking')
  }, [])
  const generateTranscript = useCallback(
    (audio: Float32Array, highPriority?: boolean) => {
      // Discard unusably short audio
      if (audio.length < SAMPLING_RATE * MIN_AUDIO_LENGTH) {
        return
      }
      if (isProcessing) {
        if (highPriority) {
          highPriorityAudioRef.current = audio
        }
        return
      }
      if (status !== 'ready') return
      if (!audio.length) return

      console.log('Generating transcript')

      if (audio.length > MAX_SAMPLES) {
        // Get last MAX_SAMPLES
        audio = audio.slice(-MAX_SAMPLES)
      }

      if (workerPostMessage) {
        workerPostMessage({
          type: 'generate',
          data: { audio }
        })
      }
    },
    [isProcessing, status, workerPostMessage]
  )
  const onSpeechEnd = useCallback(
    (spokenAudio: Float32Array) => {
      isTalkingRef.current = false
      console.log('Stopped talking')
      generateTranscript(spokenAudio, true)
      audioRef.current = null
    },
    [generateTranscript]
  )
  const onFrameProcessed = useCallback(
    (propabilities: { isSpeech: number; notSpeech: number }, audio: Float32Array) => {
      if (isTalkingRef.current && propabilities.isSpeech > 0.5) {
        audioRef.current = new Float32Array([
          ...(audioRef.current ? audioRef.current : []),
          ...audio
        ]).slice(-MAX_SAMPLES)

        generateTranscript(audioRef.current)
      }
    },
    [generateTranscript]
  )

  const broadcastChannel = useMemo(() => new BroadcastChannel(BROADCAST_CHANNEL_NAME), [])

  useEffect(() => {
    const onBcMessage = (e: MessageEvent<{ status: string; data?: CaptionsConfig }>) => {
      if (e.data.status === 'config') {
        setConfig(e.data.data)
      }
    }

    broadcastChannel.addEventListener('message', onBcMessage)

    broadcastChannel.postMessage({
      status: 'captions_window_ready'
    })

    return () => {
      broadcastChannel.removeEventListener('message', onBcMessage)
    }
  }, [broadcastChannel])

  useEffect(() => {
    if (status === 'configured' && workerPostMessage) {
      workerPostMessage({ type: 'load' })
      setStatus('loading')
    }
  }, [status, workerPostMessage])

  useEffect(() => {
    // Only node worker (whisper.cpp addon) is configured from this window
    if (workerPostMessage && config?.runtime === 'whisper.cpp') {
      workerPostMessage({ type: 'config', data: config })
    }
  }, [workerPostMessage, config])

  useEffect(() => {
    const onMessageReceived = (e: MessageEvent<WorkerMessageData>) => {
      switch (e.data.status) {
        case 'configured': {
          setStatus((prevState) => prevState || 'configured')
          break
        }
        case 'loading':
          // Model file start load: add a new progress item to the list.
          setStatus('loading')
          setLoadingMessage(e.data.data)
          break

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === (e.data as ProgressEventData).file) {
                return { ...item, ...e.data }
              }
              return item
            })
          )
          break

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setStatus('ready')
          break

        case 'start':
          {
            // Start generation
            setIsProcessing(true)
          }
          break

        case 'update':
          {
            // Generation update: update the output text.
            const { tps, output } = e.data
            if (typeof tps === 'number') {
              setTps(tps)
            }
            if (typeof output === 'string') {
              setText(output)
            }
          }
          break

        case 'complete':
          if (typeof e.data.output === 'string') {
            setText(e.data.output)
          }

          if (highPriorityAudioRef.current && workerPostMessage) {
            workerPostMessage({
              type: 'generate',
              data: { audio: highPriorityAudioRef.current }
            })
            highPriorityAudioRef.current = null
          } else {
            setIsProcessing(false)
          }

          break
        case 'error':
          console.error(e.data.data)
          break
      }
    }

    // Attach the callback function as an event listener.
    if (workerAddEventListener) {
      workerAddEventListener('message', onMessageReceived)
    }

    // This window shouldn't miss the worker's initial status messages, that's why we announce it as ready only after the listener is set
    broadcastChannel.postMessage({
      status: 'captions_worker_ready',
      data: { runtime: config?.runtime }
    })

    // Define a cleanup function for when the component is unmounted.
    return () => {
      if (workerRemoveEventListener) {
        workerRemoveEventListener('message', onMessageReceived)
      }
    }
  }, [
    broadcastChannel,
    workerAddEventListener,
    workerRemoveEventListener,
    config?.runtime,
    workerPostMessage
  ])

  useLayoutEffect(() => {
    // Make page transparent
    document.body.style.background = 'transparent'
    document.body.style.width = '100vw'
    document.body.style.height = '100vh'
    const rootEl = document.getElementById('root')!
    rootEl.style.background = 'transparent'
    // Overrides background set on root html element by DaisyUI
    document.documentElement.style.background = 'transparent'

    const initInputDevice = async () => {
      // Not yet configured
      if (config?.inputDeviceId === undefined) {
        return
      }

      let stream: MediaStream

      if (config?.inputDeviceId) {
        stream = await getMediaStream(config.inputDeviceId)
      } else {
        // Tell the main process to enable system audio loopback.
        // This will override the default `getDisplayMedia` behavior.
        await window.api.enableLoopbackAudio()

        // Get a MediaStream with system audio loopback.
        // `getDisplayMedia` will fail if you don't request `video: true`.
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })

        // Remove video tracks that we don't need.
        // Note: You may find bugs if you don't remove video tracks.

        const videoTracks = stream.getVideoTracks()

        videoTracks.forEach((track) => {
          track.stop()
          stream.removeTrack(track)
        })

        // Tell the main process to disable system audio loopback.
        // This will restore full `getDisplayMedia` functionality.
        await window.api.disableLoopbackAudio()
      }

      return stream
    }

    initInputDevice().then((str) => {
      if (!str) {
        return
      }

      setStream(str)
    })
  }, [config?.inputDeviceId])

  useEffect(() => {
    function cleanupStream() {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }

    return cleanupStream
  }, [stream])

  useEffect(() => {
    if (!wrapperEl) {
      return
    }

    window.api.onCaptionsWindowMove((width, height) => {
      setWindowDimensions({ width, height })
    })
  }, [wrapperEl])

  useEffect(() => {
    if (!wrapperEl || !config?.position) {
      return
    }

    let space = 0

    if (windowDimensions) {
      wrapperEl.style.width = `${windowDimensions.width}px`
      space = windowDimensions.height - wrapperEl.clientHeight
    }

    switch (config.position) {
      case 'top':
        {
          wrapperEl.style.bottom = 'initial'
          wrapperEl.style.top = '0px'
        }
        break
      case 'bottom':
        {
          if (windowDimensions) {
            wrapperEl.style.bottom = 'initial'
            wrapperEl.style.top = `${space}px`
          } else {
            wrapperEl.style.bottom = '0px'
          }
        }
        break
    }
  }, [wrapperEl, config?.position, windowDimensions])

  return (
    <div
      className="flex flex-col mx-auto justify-end bg-[rgba(0,0,0,0.7)] fixed w-screen"
      ref={setWrapperEl}
    >
      <VoiceActivityDetection
        key={stream.id}
        stream={stream}
        onSpeechRealStart={onSpeechRealStart}
        onSpeechEnd={onSpeechEnd}
        onFrameProcessed={onFrameProcessed}
        preSpeechPadFrames={128}
      />
      {
        <div className="flex flex-col items-center px-4">
          <div className="w-full py-8 px-16">
            {status === 'ready' && (
              <div className="relative text-white">
                <p className="w-full overflow-y-auto overflow-wrap-anywhere">{text}</p>
                {tps && (
                  <span className="absolute bottom-0 right-0 px-1">{tps.toFixed(2)} tok/s</span>
                )}
              </div>
            )}
          </div>
          {status === 'loading' && (
            <div className="w-full max-w-[500px] text-left mx-auto p-4">
              <p className="text-center text-white">{loadingMessage}</p>
              {progressItems.map(({ file, progress, total }, i) => (
                <Progress key={i} text={file} percentage={progress} total={total} />
              ))}
            </div>
          )}
        </div>
      }
    </div>
  )
}

export default Captions

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Progress } from '@renderer/components/Progress'
import { BROADCAST_CHANNEL_NAME, MAX_SAMPLES, SAMPLING_RATE } from '@renderer/utils/constants'
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

  const { workerPostMessage, workerAddEventListener, workerRemoveEventListener } =
    useMemo<WorkerHelper>(() => {
      switch (config?.usingGPU) {
        case true: {
          const w = new SharedWorker(new URL('../workers/captionsWorker.ts', import.meta.url), {
            type: 'module'
          })
          w.port.start()
          return {
            worker: w,
            workerPostMessage: w.port.postMessage.bind(w.port),
            workerAddEventListener: w.port.addEventListener.bind(w.port),
            workerRemoveEventListener: w.port.addEventListener.bind(w.port)
          }
        }
        case false: {
          const w = new Worker(new URL('../workers/captionsCPUWorker.ts', import.meta.url), {
            type: 'classic'
          })
          return {
            worker: w,
            workerPostMessage: w.postMessage.bind(w),
            workerAddEventListener: w.addEventListener.bind(w),
            workerRemoveEventListener: w.addEventListener.bind(w)
          }
        }

        default:
          return {}
      }
    }, [config?.usingGPU])

  // Model loading and progress
  const [status, setStatus] = useState<'loading' | 'configured' | 'ready'>()
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progressItems, setProgressItems] = useState<IProgress[]>([])

  // Inputs and outputs
  const [text, setText] = useState('')
  const [tps, setTps] = useState<number | null>(null)

  // Processing
  const [recording, setRecording] = useState(false)
  const [recorder, setRecorder] = useState<MediaRecorder>()
  const [isProcessing, setIsProcessing] = useState(false)
  const [chunks, setChunks] = useState<BlobPart[]>([])
  const audioContextRef = useRef<AudioContext>(null)

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
    } else if (status === 'ready' && recorder) {
      recorder.start(100)
    }
  }, [status, recorder, workerPostMessage])

  useEffect(() => {
    // In case of using a Web Worker, configuration happens from this context
    if (workerPostMessage && config && !config.usingGPU) {
      workerPostMessage({ type: 'config', data: config })
    }
  }, [workerPostMessage, config])

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: MessageEvent<WorkerMessageData>) => {
      switch (e.data.status) {
        case 'configured': {
          // Worker is initially configured from another context (model size set) and is ready to load
          setStatus((prevState) => prevState || 'configured')
          if (recorder?.state === 'recording') {
            recorder.stop()
            setText('')
            recorder.start(100)
          }
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

            // Request new data from the recorder
            recorder?.requestData()
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
          setIsProcessing(false)
          if (typeof e.data.output === 'string') {
            setText(e.data.output)
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
      data: { usingGPU: config?.usingGPU }
    })

    // Define a cleanup function for when the component is unmounted.
    return () => {
      if (workerRemoveEventListener) {
        workerRemoveEventListener('message', onMessageReceived)
      }
    }
  }, [
    broadcastChannel,
    recorder,
    workerAddEventListener,
    workerRemoveEventListener,
    config?.usingGPU
  ])

  useEffect(() => {
    if (!recorder) return
    if (!recording) return
    if (isProcessing) return
    if (status !== 'ready') return

    if (chunks.length > 0) {
      // Generate from data
      const blob = new Blob(chunks, { type: recorder.mimeType })

      const fileReader = new FileReader()

      fileReader.onloadend = async () => {
        const arrayBuffer = fileReader.result
        const decoded = await audioContextRef.current?.decodeAudioData(arrayBuffer as ArrayBuffer)
        let audio = decoded!.getChannelData(0)
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
      }
      fileReader.readAsArrayBuffer(blob)
    } else {
      recorder.requestData()
    }
  }, [status, recording, isProcessing, chunks, workerPostMessage, recorder])

  useLayoutEffect(() => {
    // Make page transparent
    document.body.style.background = 'transparent'
    document.body.style.width = '100vw'
    document.body.style.height = '100vh'
    const rootEl = document.getElementById('root')!
    rootEl.style.background = 'transparent'
    // Overrides background set on root html element by DaisyUI
    document.documentElement.style.background = 'transparent'

    const setLoopbackAudioDevice = async () => {
      if (recorder) return // Already set

      // Tell the main process to enable system audio loopback.
      // This will override the default `getDisplayMedia` behavior.
      // @ts-ignore missed preload type declaration
      await window.api.enableLoopbackAudio()

      // Get a MediaStream with system audio loopback.
      // `getDisplayMedia` will fail if you don't request `video: true`.
      const stream = await navigator.mediaDevices.getDisplayMedia({
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

      const newRecorder = new MediaRecorder(stream)
      audioContextRef.current = new AudioContext({
        sampleRate: SAMPLING_RATE
      })

      newRecorder.onstart = () => {
        setRecording(true)
        setChunks([])
      }
      newRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setChunks((prev) => [...prev, e.data])
        } else {
          // Empty chunk received, so we request new data after a short timeout
          setTimeout(() => {
            newRecorder.requestData()
          }, 25)
        }
      }

      newRecorder.onstop = () => {
        setRecording(false)
      }

      setRecorder(newRecorder)

      // Tell the main process to disable system audio loopback.
      // This will restore full `getDisplayMedia` functionality.
      // @ts-ignore missed preload type declaration
      await window.api.disableLoopbackAudio()
    }

    setLoopbackAudioDevice()

    return () => {
      recorder?.stop()
    }
  }, [recorder])

  return (
    <div className="flex flex-col mx-auto justify-end bg-[rgba(0,0,0,0.7)]">
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
              <p className="text-center">{loadingMessage}</p>
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

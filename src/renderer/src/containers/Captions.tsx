import { useEffect, useState, useRef, useLayoutEffect } from 'react'

import { Progress } from '@renderer/components/Progress'
// import { WhisperLanguageSelector } from '@renderer/components/WhisperLanguageSelector'
import { MAX_SAMPLES, SAMPLING_RATE } from '@renderer/utils/constants'

interface IProgress {
  text: string
  progress: number
  total: number
  file: string
}

function Captions() {
  // Create a reference to the worker object.
  const worker = useRef<Worker>(null)

  const recorderRef = useRef<MediaRecorder>(null)

  // Model loading and progress
  const [status, setStatus] = useState<string>()
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progressItems, setProgressItems] = useState<IProgress[]>([])

  // Inputs and outputs
  const [text, setText] = useState('')
  const [tps, setTps] = useState<number | null>(null)
  const [
    language
    //  setLanguage
  ] = useState('en')

  // Processing
  const [recording, setRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chunks, setChunks] = useState<BlobPart[]>([])
  // const [
  //   stream,
  //   setStream
  // ] = useState(null)
  const audioContextRef = useRef<AudioContext>(null)

  useEffect(() => {
    if (!status && worker.current) {
      worker.current.postMessage({ type: 'load' })
      setStatus('loading')
    }
  }, [status, worker])

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('../workers/captionsWorker.ts', import.meta.url), {
        type: 'module'
      })
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'loading':
          // Model file start load: add a new progress item to the list.
          setStatus('loading')
          setLoadingMessage(e.data.data)
          break

        case 'initiate':
          setProgressItems((prev) => [...prev, e.data])
          break

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data }
              }
              return item
            })
          )
          break

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) => prev.filter((item) => item.file !== e.data.file))
          break

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setStatus('ready')
          recorderRef.current?.start(100)
          break

        case 'start':
          {
            // Start generation
            setIsProcessing(true)

            // Request new data from the recorder
            recorderRef.current?.requestData()
          }
          break

        case 'update':
          {
            // Generation update: update the output text.
            const { tps } = e.data
            setTps(tps)
          }
          break

        case 'complete':
          // Generation complete: re-enable the "Generate" button
          setIsProcessing(false)
          setText(e.data.output)
          break
      }
    }

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived)

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker?.current?.removeEventListener('message', onMessageReceived)
    }
  }, [])

  useEffect(() => {
    if (!recorderRef.current) return
    if (!recording) return
    if (isProcessing) return
    if (status !== 'ready') return

    if (chunks.length > 0) {
      // Generate from data
      const blob = new Blob(chunks, { type: recorderRef.current.mimeType })

      const fileReader = new FileReader()

      fileReader.onloadend = async () => {
        const arrayBuffer = fileReader.result
        const decoded = await audioContextRef.current?.decodeAudioData(arrayBuffer as ArrayBuffer)
        let audio = decoded!.getChannelData(0)
        if (audio.length > MAX_SAMPLES) {
          // Get last MAX_SAMPLES
          audio = audio.slice(-MAX_SAMPLES)
        }

        worker.current?.postMessage({
          type: 'generate',
          data: { audio, language }
        })
      }
      fileReader.readAsArrayBuffer(blob)
    } else {
      recorderRef.current?.requestData()
    }
  }, [status, recording, isProcessing, chunks, language])

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
      if (recorderRef.current) return // Already set

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

      // setStream(stream)

      recorderRef.current = new MediaRecorder(stream)
      audioContextRef.current = new AudioContext({
        sampleRate: SAMPLING_RATE
      })

      recorderRef.current.onstart = () => {
        setRecording(true)
        setChunks([])
      }
      recorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setChunks((prev) => [...prev, e.data])
        } else {
          // Empty chunk received, so we request new data after a short timeout
          setTimeout(() => {
            recorderRef.current?.requestData()
          }, 25)
        }
      }

      recorderRef.current.onstop = () => {
        setRecording(false)
      }

      // Tell the main process to disable system audio loopback.
      // This will restore full `getDisplayMedia` functionality.
      // @ts-ignore missed preload type declaration
      await window.api.disableLoopbackAudio()
    }

    setLoopbackAudioDevice()

    return () => {
      recorderRef.current?.stop()
      recorderRef.current = null
    }
  }, [])

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
          {/* {status === 'ready' && (
            <div className="relative w-full flex justify-center">
              <WhisperLanguageSelector
                language={language}
                setLanguage={(e) => {
                  recorderRef.current?.stop()
                  setLanguage(e)
                  recorderRef.current?.start()
                }}
              />
              <button
                className="border rounded-lg px-2 absolute right-2"
                onClick={() => {
                  recorderRef.current?.stop()
                  recorderRef.current?.start()
                }}
              >
                Reset
              </button>
            </div>
          )} */}
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

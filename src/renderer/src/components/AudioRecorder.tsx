import { TextToAudioOutput } from '@huggingface/transformers'
import { getMediaStream } from '@renderer/utils/helpers'
import { useEffect, useRef, useState } from 'react'
import toWav from 'audiobuffer-to-wav'

interface Props {
  inputDeviceId: MediaDeviceInfo['deviceId']
  outputDeviceId: MediaDeviceInfo['deviceId']
  onRecordingComplete: (blob: Blob) => void
  ttsResult: TextToAudioOutput | undefined
  hotkeyPressed: boolean
}

export const AudioRecorder: React.FC<Props> = ({
  inputDeviceId,
  outputDeviceId,
  onRecordingComplete,
  ttsResult,
  hotkeyPressed
}) => {
  const [isRecording, setIsRecording] = useState(hotkeyPressed)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>()
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedAudioEl, setRecordedAudioEl] = useState<HTMLAudioElement | null>()
  const [synthesizedAudioEl, setSynthesizedAudioEl] = useState<HTMLAudioElement | null>()
  const [synthesizedWavUrl, setSynthesizedWavUrl] = useState<any>()

  const audioChunksRef = useRef<Blob[]>([])

  const handleRecorderClick = () => {
    setIsRecording((prevState) => !prevState)
  }

  useEffect(() => {
    if (isRecording) {
      setRecordedBlob(null)
      mediaRecorder?.start()
    } else {
      mediaRecorder?.stop()
    }
  }, [mediaRecorder, isRecording])

  useEffect(() => {
    setIsRecording(hotkeyPressed)
  }, [hotkeyPressed])

  useEffect(() => {
    const initRecorder = async () => {
      const mediaStream = await getMediaStream(inputDeviceId)
      const recorder = new MediaRecorder(mediaStream)

      recorder.addEventListener('dataavailable', async (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }

        if (recorder.state === 'inactive') {
          // Received a stop event
          if (audioChunksRef.current.length) {
            let blob = new Blob(audioChunksRef.current, { type: recorder.mimeType })
            setRecordedBlob(blob)
            onRecordingComplete(blob)
          }

          audioChunksRef.current = []
        }
      })

      setMediaRecorder(recorder)
    }

    initRecorder()
  }, [inputDeviceId, onRecordingComplete])

  useEffect(() => {
    return function mediaRecorderCleanup() {
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        mediaRecorder.stop()
        audioChunksRef.current = []
      }
    }
  }, [mediaRecorder])

  useEffect(() => {
    if (recordedAudioEl && synthesizedAudioEl) {
      recordedAudioEl.setSinkId(outputDeviceId)
      synthesizedAudioEl.setSinkId(outputDeviceId)
    }
  }, [recordedAudioEl, synthesizedAudioEl, outputDeviceId])

  useEffect(() => {
    const createWav = async () => {
      if (ttsResult) {
        const audioContext = new AudioContext({ sampleRate: ttsResult.sampling_rate })
        if (synthesizedAudioEl) {
          const audioBuffer = audioContext.createBuffer(
            1,
            ttsResult.audio.length,
            ttsResult.sampling_rate
          )
          audioBuffer.getChannelData(0).set(ttsResult.audio)
          const wav = toWav(audioBuffer)
          const audioUrl = URL.createObjectURL(new Blob([wav]))
          setSynthesizedWavUrl(audioUrl)
          synthesizedAudioEl.src = audioUrl
          // const audioBufferSource = audioContext.createBufferSource()
          // audioBufferSource.buffer = audioBuffer
          // audioBufferSource.connect(audioContext.destination)
          // audioBufferSource.start(0)

          synthesizedAudioEl.play()
        }
      }
    }

    createWav()
  }, [ttsResult, synthesizedAudioEl])

  useEffect(() => {
    return () => {
      if (synthesizedWavUrl) {
        URL.revokeObjectURL(synthesizedWavUrl)
      }
    }
  }, [synthesizedWavUrl])

  return (
    <div className="flex flex-col gap-2">
      <button className="btn btn-secondary" onClick={handleRecorderClick}>
        {!isRecording ? 'Record Microphone' : 'Stop Recording'}
      </button>
      {recordedBlob && (
        <audio ref={setRecordedAudioEl} controls>
          <source src={URL.createObjectURL(new Blob([recordedBlob]))} type={recordedBlob.type} />
        </audio>
      )}
      <audio ref={setSynthesizedAudioEl} controls>
        {/* {synthesizedWavUrl && <source
        src={synthesizedWavUrl}
        type={'audio/wav'}
      />
      } */}
      </audio>
      {isRecording && <progress className="progress progress-secondary w-56"></progress>}
    </div>
  )
}

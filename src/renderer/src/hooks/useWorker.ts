import {
  DEFAULT_SRC_LANG,
  DEFAULT_STT_MODEL_OPTION,
  DEFAULT_TGT_LANG,
  WhisperModelSizes
} from '@renderer/utils/constants'
import { AtLeastOne } from '@renderer/utils/types'
import { ExecTaskResult } from '@renderer/workers/speechToSpeechWorker'
import { useCallback, useEffect, useState } from 'react'

type ExecTaskParams =
  | {
      task: 'translation' | 'text-to-audio'
      data: string
    }
  | {
      task: 'automatic-speech-recognition'
      data: Float32Array<ArrayBufferLike>
    }
  | {
      task: 'change-languages'
      data: AtLeastOne<{ src_lang: string; tgt_lang: string }>
    }
  | {
      task: 'get-languages'
      data: { src_lang: string; tgt_lang: string }
    }
  | {
      task: 'change-stt-model'
      data: WhisperModelSizes
    }

type ExecTaskResultEvent = MessageEvent<ExecTaskResult>

export const useWorker = () => {
  const [worker] = useState(
    () =>
      new Worker(new URL('../workers/speechToSpeechWorker.ts', import.meta.url), { type: 'module' })
  )
  const [isReady, setIsReady] = useState(false)
  const [languages, setLanguages] = useState({
    src_lang: DEFAULT_SRC_LANG,
    tgt_lang: DEFAULT_TGT_LANG
  })
  const [sttModel, setSttModel] = useState(DEFAULT_STT_MODEL_OPTION)

  const execTask = useCallback(
    (params: ExecTaskParams) => {
      if (!isReady) {
        return
      }

      setIsReady(false)

      worker.postMessage(params)

      return new Promise((resolve) => {
        const listener = (event: ExecTaskResultEvent) => {
          const message = event.data

          if (message.task === params.task && message.status === 'complete') {
            resolve(message.data)
            setIsReady(true)
            worker.removeEventListener('message', listener)
          }
        }

        worker.addEventListener('message', listener)
      })
    },
    [isReady, worker]
  )

  useEffect(() => {
    worker.addEventListener('message', (event) => {
      const message = event.data

      switch (message.status) {
        case 'ready': {
          setIsReady(true)
          break
        }
        case 'languages-changed': {
          setLanguages(message.data)
          break
        }
        case 'stt-model-changed': {
          setSttModel(message.data)
          break
        }
        default:
          break
      }
    })
  }, [worker])

  return {
    isReady,
    execTask,
    languages,
    sttModel
  }
}

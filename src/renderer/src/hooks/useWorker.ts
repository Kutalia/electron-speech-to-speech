import { DEFAULT_SRC_LANG, DEFAULT_TGT_LANG, WhisperModelSizes } from '@renderer/utils/constants'
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

interface Params {
  defaultValues: {
    sttModel: WhisperModelSizes
  }
}

export const useWorker = (params: Params) => {
  const [worker, setWorker] = useState<Worker>()
  const [isWorkerListening, setIsWorkerListening] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [languages, setLanguages] = useState({
    src_lang: DEFAULT_SRC_LANG,
    tgt_lang: DEFAULT_TGT_LANG
  })

  const execTask = useCallback(
    (params: ExecTaskParams) => {
      if (isLoading || !isWorkerListening || !worker) {
        return
      }

      setIsLoading(true)

      worker.postMessage(params)

      return new Promise((resolve) => {
        const listener = (event: ExecTaskResultEvent) => {
          const message = event.data

          if (message.task === params.task && message.status === 'complete') {
            resolve(message.data)
            setIsLoading(false)
            worker.removeEventListener('message', listener)
          }
        }

        worker.addEventListener('message', listener)
      })
    },
    [isLoading, isWorkerListening, worker]
  )

  useEffect(() => {
    worker?.addEventListener('message', (event) => {
      const message = event.data

      switch (message.status) {
        case 'listening': {
          setIsLoading(false)
          setIsWorkerListening(true)
          break
        }
        case 'languages-changed': {
          setLanguages(message.data)
          break
        }
        case 'stt-model-changed': {
          setIsReady(true)
          break
        }
        default:
          break
      }
    })
  }, [worker])

  useEffect(() => {
    if (isWorkerListening && !isReady && !isLoading) {
      execTask({ task: 'change-stt-model', data: params.defaultValues.sttModel })
    }
  }, [execTask, isLoading, isReady, isWorkerListening, params.defaultValues.sttModel])

  const initWorker = useCallback(() => {
    setIsLoading(true)
    setWorker(
      new Worker(new URL('../workers/speechToSpeechWorker.ts', import.meta.url), { type: 'module' })
    )
  }, [])

  return {
    initWorker,
    isReady,
    isLoading,
    execTask,
    languages
  }
}

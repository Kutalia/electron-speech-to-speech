import { AtLeastOne } from "@renderer/utils/types"
import { useCallback, useEffect, useState } from "react"

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
    data: AtLeastOne<{ src_lang: string, tgt_lang: string }>
  }

export const useWorker = () => {
  const [worker] = useState(() => new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' }))
  const [isReady, setIsReady] = useState(false)

  const execTask = useCallback((params: ExecTaskParams) => {
    if (!isReady) {
      return
    }

    setIsReady(false)

    worker.postMessage(params)

    return new Promise((resolve) => {
      const listener = (event: MessageEvent<any>) => {
        const message = event.data

        if (message.task === params.task && message.status === 'complete') {
          resolve(message.data)
          setIsReady(true)
          worker.removeEventListener('message', listener)
        }
      }

      worker.addEventListener('message', listener)
    })
  }, [isReady, worker])

  useEffect(() => {
    worker.addEventListener('message', (event) => {
      switch (event.data.status) {
        case 'ready': {
          setIsReady(true)
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
  }
}
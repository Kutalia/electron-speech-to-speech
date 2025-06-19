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

export const useWorker = () => {
  const [worker] = useState(() => new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' }))
  const [isReady, setIsReady] = useState(false)

  const execTask = useCallback((params: ExecTaskParams) => {
    if (!isReady) {
      return
    }

    worker.postMessage(params)

    return new Promise((resolve) => {
      const listener = (event: MessageEvent<any>) => {
        const message = event.data

        if (message.task === params.task && message.status === 'complete') {
          resolve(message.data)
          worker.removeEventListener('message', listener)
        }
      }

      worker.addEventListener('message', listener)
    })
  }, [isReady, worker])

  useEffect(() => {
    worker.addEventListener('message', (event) => {
      if (event.data.status === 'ready') {
        setIsReady(true)
      }
    })
  }, [worker])

  return {
    isReady,
    execTask,
  }
}
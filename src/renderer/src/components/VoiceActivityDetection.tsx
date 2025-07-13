import { ReactRealTimeVADOptions, useMicVAD } from '@ricky0123/vad-react'

export const VoiceActivityDetection: React.FC<Partial<ReactRealTimeVADOptions>> = (props) => {
  useMicVAD(props)

  return null
}

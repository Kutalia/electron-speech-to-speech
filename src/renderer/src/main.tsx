import './assets/base.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SpeechToSpeech from '@renderer/containers/SpeechToSpeech'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpeechToSpeech />
  </StrictMode>
)

import './assets/base.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Captions from '@renderer/containers/Captions'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Captions />
  </StrictMode>
)

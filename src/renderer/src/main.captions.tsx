import './assets/base.css'

// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Captions from '@renderer/containers/Captions'

// TODO: To make StrictMode work, captions need fixing to avoid re-running certain commands either in useEffects or in the worker
createRoot(document.getElementById('root')!).render(
  //   <StrictMode>
  <Captions />
  //   </StrictMode>
)

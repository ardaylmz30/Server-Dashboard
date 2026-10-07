import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import NetworkBackground from './NetworkBackground.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NetworkBackground />
    <App />
  </StrictMode>,
)

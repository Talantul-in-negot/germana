import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

registerSW({ immediate: true })

// Ask the browser not to evict our IndexedDB data (first run; harmless if already granted/unsupported).
void navigator.storage?.persist?.().catch(() => undefined)

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// After a redeploy, a tab opened earlier asks for chapter files whose names have changed. Reload once to pick up the new build.
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('reloaded-for-update')) return
    sessionStorage.setItem('reloaded-for-update', '1')
  } catch {
    /* storage blocked: reload anyway, once per page load is enough */
  }
  e.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

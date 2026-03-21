import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'

const SERVICE_WORKER_CLEANUP_KEY = 'quanteasy.serviceWorkerCleanup.v1'

function cleanupLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    if (window.localStorage.getItem(SERVICE_WORKER_CLEANUP_KEY) === 'done') {
      return
    }

    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      if (registrations.length === 0) {
        window.localStorage.setItem(SERVICE_WORKER_CLEANUP_KEY, 'done')
        return
      }

      await Promise.all(registrations.map((registration) => registration.unregister()))

      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))

      window.localStorage.setItem(SERVICE_WORKER_CLEANUP_KEY, 'done')
    })
  })
}

cleanupLegacyServiceWorkers()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

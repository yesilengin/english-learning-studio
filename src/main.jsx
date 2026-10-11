import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initializeDatabase } from './db.js'

const APP_VERSION = '2.8.0'

async function clearOldApp() {
  if (localStorage.getItem('app_version') === APP_VERSION) return
  localStorage.setItem('app_version', APP_VERSION)
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
  if (window.caches) {
    const names = await caches.keys()
    await Promise.all(names.map((name) => caches.delete(name)))
  }
  const next = new URL(location.href)
  if (next.searchParams.get('v') !== APP_VERSION) {
    next.searchParams.set('v', APP_VERSION)
    location.replace(next.toString())
    return true
  }
  return false
}

clearOldApp().then(async (left) => {
  if (left) return
  await initializeDatabase()
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

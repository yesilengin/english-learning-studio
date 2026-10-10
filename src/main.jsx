import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initializeDatabase } from './db.js'

// App version - force reload if changed
const APP_VERSION = '1.1.1'
const STORED_VERSION = localStorage.getItem('app_version')

if (STORED_VERSION !== APP_VERSION) {
  console.log('New version detected, clearing cache...')
  localStorage.setItem('app_version', APP_VERSION)
  
  // Clear service worker cache
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister())
    })
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name))
    })
  }
  
  // Force reload without cache
  window.location.reload(true)
}

// Initialize database before rendering
initializeDatabase().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

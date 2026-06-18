'use client'

import { useEffect } from 'react'

// Bump this when you need to force all clients to refresh
const SW_VERSION = 'v5-2026-06-18e'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const storedVersion = localStorage.getItem('creard-sw-version')

    // If SW version changed, force cleanup and reload
    if (storedVersion && storedVersion !== SW_VERSION) {
      console.log('[SW] Version mismatch, forcing cleanup:', storedVersion, '->', SW_VERSION)
      localStorage.setItem('creard-sw-version', SW_VERSION)
      // Unregister all SWs and clear caches, then reload
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        Promise.all(registrations.map((r) => r.unregister())).then(() => {
          if ('caches' in window) {
            caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
          }
          window.location.reload()
        })
      })
      return
    }

    localStorage.setItem('creard-sw-version', SW_VERSION)

    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      // Check for updates every 60 seconds
      setInterval(() => {
        reg.update()
      }, 60000)

      // If a new SW was installed while the page was open, reload
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[SW] New version activated, reloading...')
              window.location.reload()
            }
          })
        }
      })
    }).catch(() => {
      // SW registration failed — app works fine without it
    })
  }, [])
  return null
}
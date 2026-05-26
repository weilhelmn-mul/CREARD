'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { restoreSession, isFirebaseClientAvailable } from '@/lib/auth-helpers'

/**
 * AuthInitializer - Restores user session on app load
 * Placed at the top of the component tree to run once.
 * Uses the stored Firebase ID Token to verify with the server.
 */
export default function AuthInitializer() {
  const { authChecked, setAuthChecked } = useAppStore()

  useEffect(() => {
    if (authChecked) return

    // If Firebase is available and we have a persisted user, try to restore
    if (isFirebaseClientAvailable()) {
      restoreSession().then(() => {
        setAuthChecked(true)
      }).catch(() => {
        setAuthChecked(true)
      })
    } else {
      // No Firebase - session is already restored from localStorage in the store
      setAuthChecked(true)
    }
  }, [authChecked, setAuthChecked])

  return null // This component renders nothing
}

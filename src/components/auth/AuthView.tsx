'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { isFirebaseClientAvailable } from '@/lib/auth-helpers'

export default function AuthView() {
  const { currentView, setView, setUser } = useAppStore()
  const isLogin = currentView === 'login'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  const switchMode = () => {
    setError('')
    setSuccessMsg('')
    setLoading(false)
    if (isLogin) {
      setView('register')
    } else {
      setView('login')
    }
  }

  const goBack = () => {
    setView('home')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Por favor, completa todos los campos.')
      return
    }

    setLoading(true)
    try {
      // ── Strategy 1: Try Firebase Client SDK ──
      if (isFirebaseClientAvailable()) {
        try {
          const firebaseModule = await import('@/lib/firebase')
          const userCredential = await firebaseModule.firebaseSignIn(loginEmail, loginPassword)
          const firebaseUser = userCredential.user
          const token = await firebaseModule.firebaseGetIdToken(firebaseUser)

          const res = await fetch('/api/auth?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail, password: loginPassword }),
          })
          const data = await res.json()

          if (!res.ok) {
            if (res.status === 403 && data.code === 'AUTH_PENDING') {
              setError('Tu cuenta esta pendiente de aprobacion. Un administrador revisara tu registro pronto.')
              return
            }
            if (res.status === 403 && data.code === 'AUTH_REJECTED') {
              setError('Tu cuenta fue rechazada. Contacta al administrador para mas informacion.')
              return
            }
            if (res.status === 403 && data.code === 'AUTH_DISABLED') {
              setError('Tu cuenta fue deshabilitada. Contacta al administrador.')
              return
            }
            if (res.status === 401) {
              const regRes = await fetch('/api/auth?action=register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: firebaseUser.displayName || loginEmail.split('@')[0],
                  email: loginEmail,
                  password: 'placeholder',
                }),
              })
              if (regRes.ok) {
                const regData = await regRes.json()
                const store = useAppStore.getState()
                store.setUser(regData.user)
                store.setFirebaseToken(token)
                setView('home')
                return
              }
            }
            throw new Error(data.error || 'Error al iniciar sesion.')
          }

          const store = useAppStore.getState()
          store.setUser(data.user)
          store.setFirebaseToken(token)
          setView('home')
          return // Success - exit
        } catch (firebaseErr: any) {
          // Firebase Client failed - log and fall back to server-only auth
          console.warn('[CREARD] Firebase Client login failed, falling back to server auth:', firebaseErr?.message)
          // If the error is clearly wrong credentials (not a Firebase SDK issue), show it
          if (firebaseErr?.message?.includes('auth/invalid-credential') ||
              firebaseErr?.message?.includes('auth/wrong-password')) {
            setError('Correo o contrasena invalidos.')
            return
          }
          // Otherwise, fall through to server-only auth
        }
      }

      // ── Strategy 2: Server-only auth (demo mode or Firebase fallback) ──
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesion.')
      const store = useAppStore.getState()
      store.setUser(data.user)
      store.setFirebaseToken(null)
      setView('home')
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password') || err.message.includes('auth/user-not-found')) {
          setError('Correo o contrasena invalidos.')
        } else if (err.message.includes('auth/too-many-requests')) {
          setError('Demasiados intentos. Intenta mas tarde.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Ocurrio un error inesperado.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      setError('Por favor, completa todos los campos.')
      return
    }

    if (regPassword !== regConfirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    if (regPassword.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      if (isFirebaseClientAvailable()) {
        // Firebase mode: create user in Firebase Auth
        const firebaseModule = await import('@/lib/firebase')
        const userCredential = await firebaseModule.firebaseCreateUser(regEmail, regPassword)
        await firebaseModule.firebaseUpdateProfile(userCredential.user, { displayName: regName })
        const token = await firebaseModule.firebaseGetIdToken(userCredential.user)

        // Register in server (Firestore) - creates user with status 'pending'
        const res = await fetch('/api/auth?action=register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone, password: regPassword }),
        })
        const data = await res.json()

        if (!res.ok) {
          try { await userCredential.user.delete() } catch { /* cleanup */ }
          throw new Error(data.error || 'Error al registrar.')
        }

        // Success - switch to login and show pending message
        setRegName('')
        setRegEmail('')
        setRegPhone('')
        setRegPassword('')
        setRegConfirmPassword('')
        setView('login')
        setSuccessMsg('Cuenta creada exitosamente. Un administrador debe aprobarla antes de que puedas acceder.')
        setLoading(false)
        return
      } else {
        // Demo mode
        const res = await fetch('/api/auth?action=register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone, password: regPassword }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al registrar.')
        setUser(data.user)
        setView('home')
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('auth/email-already-in-use')) {
          setError('Ya existe una cuenta con este correo electronico.')
        } else if (err.message.includes('auth/weak-password')) {
          setError('La contrasena es demasiado debil.')
        } else if (err.message.includes('auth/invalid-email')) {
          setError('El formato del correo electronico no es valido.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Ocurrio un error inesperado.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-3 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 focus:ring-1 focus:ring-cm-primary/20 transition-all duration-200 placeholder:text-cm-on-surface-variant/40 font-[family-name:var(--font-inter)]'

  return (
    <div className="fixed inset-0 z-50 bg-cm-background flex items-center justify-center overflow-y-auto px-4 py-8">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #00ff41 0%, transparent 70%)' }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={isLogin ? 'login-card' : 'register-card'}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-md"
        >
          <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Back button */}
            <button onClick={goBack}
              className="absolute -top-12 left-0 flex items-center gap-1.5 text-cm-on-surface-variant hover:text-cm-primary transition-colors font-[family-name:var(--font-inter)] text-sm">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Volver
            </button>

            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-cm-primary/10 border border-cm-primary/20 flex items-center justify-center mb-4 glow-accent">
                <img src="/creard-logo.png" alt="CREARD" className="w-10 h-10 rounded-lg" />
              </div>
              <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-primary text-glow">CREARD</h1>
              <p className="text-cm-on-surface-variant text-sm mt-1 font-[family-name:var(--font-inter)]">
                {isLogin ? 'Inicia sesion en tu cuenta' : 'Crea tu cuenta'}
              </p>
            </div>

            {/* Success message */}
            <AnimatePresence>
              {successMsg && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <span className="material-symbols-outlined text-green-400 text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                    <p className="text-sm text-green-400 font-[family-name:var(--font-inter)]">{successMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-cm-error-container/10 border border-cm-error/20">
                    <span className="material-symbols-outlined text-cm-error text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                    <p className="text-sm text-cm-error font-[family-name:var(--font-inter)]">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">Correo electronico</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">mail</span>
                    <input type="email" placeholder="tu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={`${inputClasses} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">Contrasena</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">lock</span>
                    <input type="password" placeholder="........" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={`${inputClasses} pl-10`} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 mt-2 bg-cm-primary text-cm-on-primary font-semibold rounded-xl hover:bg-cm-primary-dim transition-all duration-200 glow-accent disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
                  {loading ? (<><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>Ingresando...</>)
                    : (<><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>login</span>Iniciar Sesion</>)}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">Nombre completo</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">person</span>
                    <input type="text" placeholder="Tu nombre" value={regName} onChange={(e) => setRegName(e.target.value)} className={`${inputClasses} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">Correo electronico</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">mail</span>
                    <input type="email" placeholder="tu@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={`${inputClasses} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">Telefono</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">phone</span>
                    <input type="tel" placeholder="+51 999 999 999" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className={`${inputClasses} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">Contrasena</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">lock</span>
                    <input type="password" placeholder="Minimo 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={`${inputClasses} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cm-on-surface-variant mb-1.5 block font-[family-name:var(--font-inter)]">Confirmar contrasena</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">lock</span>
                    <input type="password" placeholder="Repite tu contrasena" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} className={`${inputClasses} pl-10`} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 mt-2 bg-cm-primary text-cm-on-primary font-semibold rounded-xl hover:bg-cm-primary-dim transition-all duration-200 glow-accent disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-sora)] flex items-center justify-center gap-2">
                  {loading ? (<><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>Creando cuenta...</>)
                    : (<><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>person_add</span>Crear Cuenta</>)}
                </button>
              </form>
            )}

            {/* Divider + Switch */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-cm-on-surface-variant/60 font-[family-name:var(--font-inter)]">o</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button onClick={switchMode}
              className="w-full py-3 rounded-xl border border-white/10 text-cm-on-surface-variant hover:text-cm-primary hover:border-cm-primary/30 transition-all duration-200 text-sm font-[family-name:var(--font-inter)] font-medium">
              {isLogin ? (<><span>No tienes cuenta? </span><span className="text-cm-primary font-semibold">Registrate</span></>)
                : (<><span>Ya tienes cuenta? </span><span className="text-cm-primary font-semibold">Inicia sesion</span></>)}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'
import Image from 'next/image'

interface YapeConfig {
  qr_url: string
  nombre_titular: string
  numero_yape: string
  mensaje: string
  activo: boolean
}

interface PaymentMethods {
  yape_qr: boolean
  culqi: boolean
}

export default function YapeConfigTab() {
  const [config, setConfig] = useState<YapeConfig>({ qr_url: '', nombre_titular: '', numero_yape: '', mensaje: '', activo: true })
  const [methods, setMethods] = useState<PaymentMethods>({ yape_qr: true, culqi: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setuploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const [configRes, methodsRes] = await Promise.all([
        fetch('/api/yape-config'),
        fetch('/api/payment-methods'),
      ])
      const configData = await configRes.json()
      const methodsData = await methodsRes.json()
      setConfig(configData)
      setMethods(methodsData)
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la configuracion', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      await fetch('/api/yape-config', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      toast({ title: 'Configuracion guardada' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMethods = async () => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(methods),
      })
      toast({ title: 'Metodos de pago actualizados' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Formato invalido', description: 'Use PNG, JPG o WEBP', variant: 'destructive' })
      return
    }

    setuploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const headers = await getAuthHeaders()
        const res = await fetch('/api/yape-config', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_base64: base64 }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error)
        }
        setConfig(prev => ({ ...prev, qr_url: base64 }))
        toast({ title: 'QR actualizado' })
        setuploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
      setuploading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#00ff41]/30 border-t-[#00ff41] rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* ═══ METODOS DE PAGO ═══ */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)] mb-4">Metodos de Pago</h3>
        <p className="text-xs text-cm-on-surface-variant mb-4 font-[family-name:var(--font-inter)]">
          Activa o desactiva los metodos de pago disponibles para los usuarios.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-cm-surface-container-highest/40 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-400 text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>qr_code_2</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Yape QR</p>
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Pago manual con validacion admin</p>
              </div>
            </div>
            <button
              onClick={() => setMethods(m => ({ ...m, yape_qr: !m.yape_qr }))}
              className={`w-11 h-6 rounded-full transition-colors relative ${methods.yape_qr ? 'bg-[#00ff41]' : 'bg-white/10'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${methods.yape_qr ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-cm-surface-container-highest/40 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400 text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>credit_card</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">Culqi</p>
                <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">Pasarela de pago automatica</p>
              </div>
            </div>
            <button
              onClick={() => setMethods(m => ({ ...m, culqi: !m.culqi }))}
              className={`w-11 h-6 rounded-full transition-colors relative ${methods.culqi ? 'bg-[#00ff41]' : 'bg-white/10'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${methods.culqi ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {!methods.yape_qr && !methods.culqi && (
          <p className="text-xs text-red-400 mt-3 font-[family-name:var(--font-inter)]">⚠ Al menos un metodo de pago debe estar activo.</p>
        )}

        <button
          onClick={handleSaveMethods}
          disabled={saving || (!methods.yape_qr && !methods.culqi)}
          className="mt-4 px-5 py-2.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent text-sm font-[family-name:var(--font-sora)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Guardar Metodos'}
        </button>
      </div>

      {/* ═══ CONFIGURACION YAPE ═══ */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-lg font-bold text-cm-on-surface font-[family-name:var(--font-sora)] mb-4">Configuracion de Pago Yape</h3>
        <p className="text-xs text-cm-on-surface-variant mb-5 font-[family-name:var(--font-inter)]">
          Configura el QR y los datos de Yape. Todos los campos son editables.
        </p>

        {/* QR Upload */}
        <div className="mb-5">
          <label className="text-sm font-medium text-cm-on-surface font-[family-name:var(--font-inter)] mb-2 block">Codigo QR</label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-40 h-40 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative">
              {config.qr_url ? (
                config.qr_url.startsWith('data:') ? (
                  <Image src={config.qr_url} alt="QR" fill className="object-contain" unoptimized />
                ) : (
                  <img src={config.qr_url} alt="QR" className="w-full h-full object-contain" />
                )
              ) : (
                <span className="material-symbols-outlined text-3xl text-cm-on-surface-variant/30">qr_code_2</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadQR}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-semibold hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-2 font-[family-name:var(--font-inter)]"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                Subir Imagen QR
              </button>
              <p className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                Formatos: PNG, JPG, JPEG, WEBP
              </p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-cm-on-surface font-[family-name:var(--font-inter)] mb-1.5 block">Nombre del titular</label>
            <input
              type="text"
              value={config.nombre_titular}
              onChange={e => setConfig(c => ({ ...c, nombre_titular: e.target.value }))}
              className="w-full px-3 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]"
              placeholder="Nombre del beneficiario"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-cm-on-surface font-[family-name:var(--font-inter)] mb-1.5 block">Numero Yape</label>
            <input
              type="text"
              value={config.numero_yape}
              onChange={e => setConfig(c => ({ ...c, numero_yape: e.target.value }))}
              className="w-full px-3 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors font-[family-name:var(--font-inter)]"
              placeholder="999 999 999"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-cm-on-surface font-[family-name:var(--font-inter)] mb-1.5 block">Mensaje informativo</label>
            <textarea
              value={config.mensaje}
              onChange={e => setConfig(c => ({ ...c, mensaje: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm placeholder:text-cm-on-surface-variant/40 focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-none font-[family-name:var(--font-inter)]"
              placeholder="Instrucciones para el usuario..."
            />
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="mt-5 px-5 py-2.5 bg-[#00ff41] text-[#003907] font-semibold rounded-xl hover:bg-[#00e639] transition-all glow-accent text-sm font-[family-name:var(--font-sora)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Guardar Configuracion Yape'}
        </button>
      </div>
    </div>
  )
}

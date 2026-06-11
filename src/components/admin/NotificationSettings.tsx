'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/hooks/use-toast'
import { getAuthHeaders } from '@/lib/auth-helpers'
import type { NotificationSettings, DEFAULT_SETTINGS } from './NotificationMonitor'

const FALLBACK_SETTINGS: NotificationSettings = {
  enabled: true,
  warningMinutesBefore: 5,
  soundEnabled: true,
  soundVolume: 0.6,
  googleChatWebhookUrl: '',
  googleTasksEnabled: false,
  whatsappEnabled: false,
  whatsappApiUrl: '',
  whatsappAuthToken: '',
  whatsappAdminPhone: '',
  whatsappClientReminder: false,
  whatsappClientMinutesBefore: 10,
}

interface NotificationSettingsProps {
  settings: NotificationSettings
  onSettingsChange: (settings: NotificationSettings) => void
}

export default function NotificationSettingsPanel({ settings, onSettingsChange }: NotificationSettingsProps) {
  const [form, setForm] = useState<NotificationSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [testWebhookLoading, setTestWebhookLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'general' | 'google' | 'whatsapp'>('general')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const update = (key: keyof NotificationSettings, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        onSettingsChange(form)
        toast({ title: 'Configuracion guardada', description: 'Las alertas se actualizaran automaticamente' })
      } else {
        const err = await res.json().catch(() => ({ error: 'Error' }))
        toast({ title: 'Error', description: err.error || 'No se pudo guardar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!form.googleChatWebhookUrl) {
      toast({ title: 'Sin URL', description: 'Configura la URL del webhook primero', variant: 'destructive' })
      return
    }
    setTestWebhookLoading(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          alerts: [{
            bookingId: 'test-123',
            courtName: 'Cancha de Prueba',
            endTime: new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }),
            remainingMinutes: 5,
            alertType: 'warning',
            userName: 'Admin Test',
            startTime: '18:00',
          }],
          settings: form,
        }),
      })
      if (res.ok) {
        toast({ title: 'Test enviado', description: 'Revisa tu Google Chat' })
      } else {
        const err = await res.json().catch(() => ({ error: 'Error' }))
        toast({ title: 'Error en test', description: err.error || 'No se pudo enviar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setTestWebhookLoading(false)
    }
  }

  const sections = [
    { key: 'general' as const, label: 'General', icon: 'settings' },
    { key: 'google' as const, label: 'Google', icon: 'chat' },
    { key: 'whatsapp' as const, label: 'WhatsApp', icon: 'forum' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-[family-name:var(--font-sora)] font-bold text-lg text-cm-on-surface">
            Alertas y Notificaciones
          </h3>
          <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            Configura alarmas de fin de turno y notificaciones externas
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cm-primary text-cm-on-primary text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? (
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">save</span>
          )}
          Guardar
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all font-[family-name:var(--font-inter)] ${
              activeSection === s.key
                ? 'bg-cm-primary text-cm-on-primary shadow-lg shadow-cm-primary/20'
                : 'bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:bg-cm-surface-container-highest'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══════ GENERAL ═══════ */}
      {activeSection === 'general' && (
        <div className="space-y-4">
          {/* Master toggle */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cm-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cm-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    notifications_active
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Sistema de Alertas</p>
                  <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    Monitorea los turnos del dia y dispara alertas automaticas
                  </p>
                </div>
              </div>
              <button
                onClick={() => update('enabled', !form.enabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${form.enabled ? 'bg-cm-primary' : 'bg-white/10'}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Warning time */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">
              Configuracion de Alarma
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                  Alerta previa (minutos antes del fin)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={form.warningMinutesBefore}
                    onChange={(e) => update('warningMinutesBefore', parseInt(e.target.value))}
                    className="flex-1 accent-cm-primary"
                  />
                  <span className="text-sm font-bold text-cm-primary w-16 text-right font-[family-name:var(--font-sora)]">
                    {form.warningMinutesBefore} min
                  </span>
                </div>
                <p className="text-[10px] text-cm-on-surface-variant/60 mt-1 font-[family-name:var(--font-inter)]">
                  La alerta sonara cuando queden {form.warningMinutesBefore} minuto{form.warningMinutesBefore !== 1 ? 's' : ''} para que termine el turno
                </p>
              </div>

              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                  Volumen del sonido
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => update('soundEnabled', !form.soundEnabled)}
                    className={`p-2 rounded-lg transition-colors ${form.soundEnabled ? 'text-cm-primary bg-cm-primary/10' : 'text-white/20 bg-white/5'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: form.soundEnabled ? '"FILL" 1' : '"FILL" 0' }}>
                      {form.soundEnabled ? 'volume_up' : 'volume_off'}
                    </span>
                  </button>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={form.soundVolume}
                    onChange={(e) => update('soundVolume', parseFloat(e.target.value))}
                    className="flex-1 accent-cm-primary"
                    disabled={!form.soundEnabled}
                  />
                  <span className="text-sm font-bold text-cm-primary w-10 text-right font-[family-name:var(--font-sora)]">
                    {Math.round(form.soundVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="glass-card rounded-xl p-5">
            <h4 className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)] mb-3">
              Como funciona
            </h4>
            <div className="space-y-3">
              {[
                { icon: 'schedule', color: 'text-blue-400 bg-blue-500/10', title: 'Monitoreo constante', desc: 'Cada 15 segundos el sistema verifica las reservas activas del dia y calcula el tiempo restante.' },
                { icon: 'notifications_active', color: 'text-amber-400 bg-amber-500/10', title: 'Alerta previa', desc: `Cuando faltan ${form.warningMinutesBefore} minutos para el fin del turno, la fila parpadea en amarillo y suena un beep.` },
                { icon: 'alarm', color: 'text-red-400 bg-red-500/10', title: 'Turno finalizado', desc: 'Cuando el tiempo expira, la alerta cambia a rojo con un sonido mas urgente.' },
                { icon: 'send', color: 'text-green-400 bg-green-500/10', title: 'Notificaciones externas', desc: 'Simultaneamente se envian notificaciones a Google Chat y/o WhatsApp si estan configurados.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">{item.title}</p>
                    <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ GOOGLE ═══════ */}
      {activeSection === 'google' && (
        <div className="space-y-4">
          {/* Google Chat Webhook */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400 text-[20px]">chat</span>
              </div>
              <div>
                <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Google Chat (Webhook)</p>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Envia mensajes automaticos a un espacio de Google Chat
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                URL del Webhook de Google Chat
              </label>
              <input
                type="url"
                value={form.googleChatWebhookUrl}
                onChange={(e) => update('googleChatWebhookUrl', e.target.value)}
                placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
                className="w-full px-4 py-3 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 font-[family-name:var(--font-inter)] placeholder:text-cm-on-surface-variant/30"
              />
              <p className="text-[10px] text-cm-on-surface-variant/60 mt-1 font-[family-name:var(--font-inter)]">
                Crea un webhook entrante en Google Chat: Espacio &gt; Configuracion &gt; Integraciones &gt; Webhooks entrantes
              </p>
            </div>

            <button
              onClick={handleTestWebhook}
              disabled={testWebhookLoading || !form.googleChatWebhookUrl}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold hover:bg-blue-500/20 transition-all disabled:opacity-40 font-[family-name:var(--font-inter)]"
            >
              {testWebhookLoading ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">send</span>
              )}
              Enviar mensaje de prueba
            </button>
          </div>

          {/* Google Tasks / Calendar */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-400 text-[20px]">event</span>
              </div>
              <div>
                <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Google Calendar / Tareas</p>
                <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Genera enlaces de Calendar al crear reservas
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-cm-surface-container-highest/40">
              <div>
                <p className="text-xs font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">
                  Enlace de Google Calendar
                </p>
                <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                  Al crear una reserva, genera un enlace para agregar el evento al Calendar
                </p>
              </div>
              <button
                onClick={() => update('googleTasksEnabled', !form.googleTasksEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${form.googleTasksEnabled ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form.googleTasksEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ WHATSAPP ═══════ */}
      {activeSection === 'whatsapp' && (
        <div className="space-y-4">
          {/* WhatsApp Admin */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400 text-[20px]">forum</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">WhatsApp al Administrador</p>
                  <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    Recibe alertas directo en tu celular cuando un turno termine
                  </p>
                </div>
              </div>
              <button
                onClick={() => update('whatsappEnabled', !form.whatsappEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${form.whatsappEnabled ? 'bg-green-500' : 'bg-white/10'}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form.whatsappEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {form.whatsappEnabled && (
              <>
                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                    Numero del Administrador (con codigo de pais)
                  </label>
                  <input
                    type="tel"
                    value={form.whatsappAdminPhone}
                    onChange={(e) => update('whatsappAdminPhone', e.target.value)}
                    placeholder="51999999999"
                    className="w-full px-4 py-3 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 font-[family-name:var(--font-inter)] placeholder:text-cm-on-surface-variant/30"
                  />
                  <p className="text-[10px] text-cm-on-surface-variant/60 mt-1 font-[family-name:var(--font-inter)]">
                    Ejemplo: 51999999999 (sin el +)
                  </p>
                </div>

                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                    URL de la API de WhatsApp Business
                  </label>
                  <input
                    type="url"
                    value={form.whatsappApiUrl}
                    onChange={(e) => update('whatsappApiUrl', e.target.value)}
                    placeholder="https://graph.facebook.com/v18.0/..."
                    className="w-full px-4 py-3 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 font-[family-name:var(--font-inter)] placeholder:text-cm-on-surface-variant/30"
                  />
                </div>

                <div>
                  <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                    Token de Acceso
                  </label>
                  <input
                    type="password"
                    value={form.whatsappAuthToken}
                    onChange={(e) => update('whatsappAuthToken', e.target.value)}
                    placeholder="EAAxxxx..."
                    className="w-full px-4 py-3 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 font-[family-name:var(--font-inter)] placeholder:text-cm-on-surface-variant/30"
                  />
                  <p className="text-[10px] text-cm-on-surface-variant/60 mt-1 font-[family-name:var(--font-inter)]">
                    Token de acceso permanente de Meta Business Suite
                  </p>
                </div>
              </>
            )}
          </div>

          {/* WhatsApp Client Reminder */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400 text-[20px]">person</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-cm-on-surface font-[family-name:var(--font-sora)]">Recordatorio al Cliente</p>
                  <p className="text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                    Envia un mensaje amistoso al cliente antes de que termine su turno
                  </p>
                </div>
              </div>
              <button
                onClick={() => update('whatsappClientReminder', !form.whatsappClientReminder)}
                className={`relative w-12 h-7 rounded-full transition-colors ${form.whatsappClientReminder ? 'bg-green-500' : 'bg-white/10'}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form.whatsappClientReminder ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {form.whatsappClientReminder && (
              <div>
                <label className="text-xs text-cm-on-surface-variant font-semibold font-[family-name:var(--font-inter)] mb-1.5 block">
                  Minutos antes del fin para enviar el recordatorio
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={form.whatsappClientMinutesBefore}
                    onChange={(e) => update('whatsappClientMinutesBefore', parseInt(e.target.value))}
                    className="flex-1 accent-green-500"
                  />
                  <span className="text-sm font-bold text-green-400 w-16 text-right font-[family-name:var(--font-sora)]">
                    {form.whatsappClientMinutesBefore} min
                  </span>
                </div>
                <p className="text-[10px] text-cm-on-surface-variant/60 mt-1 font-[family-name:var(--font-inter)]">
                  El mensaje se enviara automaticamente {form.whatsappClientMinutesBefore} minutos antes del fin del turno
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
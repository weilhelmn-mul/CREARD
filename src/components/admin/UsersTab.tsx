'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

// Helper: add auth headers to fetch calls
function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAppStore.getState().firebaseToken
  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...options, headers })
}

interface ManagedUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  is_active: boolean
  created_at: string | { seconds: number }
  updated_at: string | { seconds: number }
  metadata?: {
    creationTime?: string
    lastSignInTime?: string
  }
  firebaseExists?: boolean
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', icon: 'schedule' },
  approved: { label: 'Aprobado', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: 'check_circle' },
  rejected: { label: 'Rechazado', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: 'cancel' },
  disabled: { label: 'Deshabilitado', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/20', icon: 'block' },
}

const roleConfig: Record<string, { label: string; color: string }> = {
  user: { label: 'Usuario', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  super_admin: { label: 'Super Admin', color: 'bg-cm-primary/10 text-cm-primary border-cm-primary/20' },
}

export default function UsersTab() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = async (userId: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(userId)
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({ userId, action, ...extra }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Error al realizar accion', 'error')
        return
      }

      showToast(data.message || 'Accion realizada')
      fetchUsers()
      setSelectedUser(null)
    } catch (err) {
      showToast('Error de conexion', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = users.filter((u) => u.status === 'pending').length

  const formatDate = (dateStr: string | { seconds: number } | undefined) => {
    if (!dateStr) return '-'
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr.seconds * 1000)
      return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return '-'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined animate-spin text-cm-primary text-[32px]">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg border text-sm font-[family-name:var(--font-inter)] ${
              toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                {toast.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface">Gestion de Usuarios</h2>
          <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
            {users.length} usuarios registrados
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-cm-on-surface-variant hover:text-cm-on-surface hover:bg-white/10 transition-all text-sm font-[family-name:var(--font-inter)]">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cm-on-surface-variant/50 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cm-surface-container-highest/60 border border-white/10 rounded-xl text-cm-on-surface text-sm focus:outline-none focus:border-cm-primary/50 font-[family-name:var(--font-inter)]"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'pending', label: 'Pendientes' },
            { key: 'approved', label: 'Aprobados' },
            { key: 'rejected', label: 'Rechazados' },
            { key: 'disabled', label: 'Deshabilitados' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all font-[family-name:var(--font-inter)] ${
                statusFilter === filter.key
                  ? 'bg-cm-primary/15 text-cm-primary border border-cm-primary/30'
                  : 'bg-white/5 text-cm-on-surface-variant hover:bg-white/10 border border-transparent'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
            <span className="material-symbols-outlined text-[40px] mb-2 block opacity-50">group_off</span>
            No se encontraron usuarios
          </div>
        ) : (
          filteredUsers.map((user) => {
            const status = statusConfig[user.status] || statusConfig.approved
            const role = roleConfig[user.role] || roleConfig.user
            const isActive = actionLoading === user.id

            return (
              <motion.div
                key={user.id}
                layout
                className={`glass-card rounded-xl p-4 transition-all ${
                  user.status === 'pending' ? 'border-amber-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-cm-primary/15 border border-cm-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-cm-primary text-sm font-bold font-[family-name:var(--font-sora)]">
                      {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-cm-on-surface truncate font-[family-name:var(--font-sora)]">
                        {user.name}
                      </p>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${role.color}`}>
                        {role.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">mail</span>
                        {user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">phone</span>
                          {user.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {user.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(user.id, 'approve')}
                          disabled={isActive}
                          className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                          title="Aprobar usuario"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => handleAction(user.id, 'reject')}
                          disabled={isActive}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                          title="Rechazar usuario"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </>
                    )}

                    {(user.status === 'approved' || user.status === 'rejected') && user.status !== 'disabled' && (
                      <button
                        onClick={() => handleAction(user.id, 'disable')}
                        disabled={isActive}
                        className="p-2 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-all disabled:opacity-50"
                        title="Deshabilitar"
                      >
                        <span className="material-symbols-outlined text-[18px]">block</span>
                      </button>
                    )}

                    {user.status === 'disabled' && (
                      <button
                        onClick={() => handleAction(user.id, 'enable')}
                        disabled={isActive}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                        title="Habilitar"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-2 rounded-lg bg-white/5 text-cm-on-surface-variant hover:text-cm-primary hover:bg-cm-primary/10 transition-all"
                      title="Mas opciones"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold text-cm-on-surface">Gestionar Usuario</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-white/10 text-cm-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-cm-primary/15 border border-cm-primary/20 flex items-center justify-center">
                  <span className="text-cm-primary text-base font-bold font-[family-name:var(--font-sora)]">
                    {selectedUser.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-cm-on-surface font-[family-name:var(--font-sora)]">{selectedUser.name}</p>
                  <p className="text-sm text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{selectedUser.email}</p>
                </div>
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-xl bg-cm-surface-container-highest/40">
                  <p className="text-[10px] text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-inter)]">Estado</p>
                  <p className="text-sm font-semibold mt-1 capitalize text-cm-on-surface">
                    {statusConfig[selectedUser.status]?.label || selectedUser.status}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-cm-surface-container-highest/40">
                  <p className="text-[10px] text-cm-on-surface-variant uppercase tracking-wider font-[family-name:var(--font-inter)]">Rol</p>
                  <p className="text-sm font-semibold mt-1 text-cm-on-surface">
                    {roleConfig[selectedUser.role]?.label || selectedUser.role}
                  </p>
                </div>
              </div>

              {/* Role Change */}
              <div className="mb-5">
                <p className="text-xs text-cm-on-surface-variant mb-2 font-semibold font-[family-name:var(--font-inter)]">Cambiar Rol</p>
                <div className="flex gap-2">
                  {(['user', 'admin', 'super_admin'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleAction(selectedUser.id, 'set_role', { role: r })}
                      disabled={actionLoading === selectedUser.id || selectedUser.role === r}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all font-[family-name:var(--font-inter)] disabled:opacity-40 ${
                        selectedUser.role === r
                          ? roleConfig[r].color + ' border'
                          : 'bg-white/5 text-cm-on-surface-variant hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {roleConfig[r].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-4">
                <p className="text-xs text-cm-on-surface-variant mb-2 font-semibold font-[family-name:var(--font-inter)]">Acciones Rapidas</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedUser.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(selectedUser.id, 'approve')} disabled={!!actionLoading}
                        className="py-2.5 px-3 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 font-[family-name:var(--font-inter)]">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Aprobar
                      </button>
                      <button onClick={() => handleAction(selectedUser.id, 'reject')} disabled={!!actionLoading}
                        className="py-2.5 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 font-[family-name:var(--font-inter)]">
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        Rechazar
                      </button>
                    </>
                  )}
                  {selectedUser.status !== 'disabled' && (
                    <button onClick={() => handleAction(selectedUser.id, 'disable')} disabled={!!actionLoading}
                      className="py-2.5 px-3 rounded-lg bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border border-gray-500/20 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 font-[family-name:var(--font-inter)]">
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      Deshabilitar
                    </button>
                  )}
                  {selectedUser.status === 'disabled' && (
                    <button onClick={() => handleAction(selectedUser.id, 'enable')} disabled={!!actionLoading}
                      className="py-2.5 px-3 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 font-[family-name:var(--font-inter)]">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Habilitar
                    </button>
                  )}
                </div>
              </div>

              {/* Last Sign In Info */}
              {selectedUser.metadata?.lastSignInTime && (
                <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)] mb-4">
                  Ultimo acceso: {new Date(selectedUser.metadata.lastSignInTime).toLocaleString('es')}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

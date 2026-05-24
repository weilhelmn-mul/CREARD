'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface Stats {
  totalBookings: number
  activeBookings: number
  totalRevenue: number
  monthRevenue: number
  activeClients: number
  totalClients: number
  occupancyRate: number
  bookingsBySport: Record<string, number>
  revenueByMonth: { month: string; revenue: number }[]
  recentBookings: Array<{
    id: string
    date: string
    startTime: string
    status: string
    totalPrice: number
    court: { name: string; sport: string }
    client: { name: string }
  }>
  topCourts: Array<{
    id: string
    name: string
    sport: string
    totalRevenue: number
    bookingCount: number
    branch: { name: string }
  }>
  dailyBookings: { day: string; bookings: number; revenue: number }[]
}

const sportLabels: Record<string, string> = {
  futbol: 'Fútbol',
  voley: 'Vóley',
  basket: 'Básquet',
  tenis: 'Tenis',
  eventos: 'Eventos',
}

const PIE_COLORS = ['#00ff41', '#00e639', '#007117', '#005710', '#003907']

const statusConfig: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmada', color: 'bg-green-500/20 text-green-400' },
  completed: { label: 'Completada', color: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400' },
}

const sportIcons: Record<string, string> = {
  futbol: 'sports_soccer',
  voley: 'sports_volleyball',
  basket: 'sports_basketball',
  tenis: 'sports_tennis',
  eventos: 'celebration',
}

export default function AdminDashboard() {
  const { setView } = useAppStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-cm-surface-container-highest rounded w-1/4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-cm-surface-container-highest rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-cm-surface-container-highest rounded-xl" />
        </div>
      </div>
    )
  }

  if (!stats) return null

  const sportPieData = Object.entries(stats.bookingsBySport).map(([sport, count]) => ({
    name: sportLabels[sport] || sport,
    value: count,
  }))

  const kpis = [
    {
      label: 'Total Reservas',
      value: stats.totalBookings,
      icon: 'calendar_month',
      color: 'text-cm-primary',
      bgColor: 'bg-cm-primary/10',
    },
    {
      label: 'Ingresos Totales',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: 'payments',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Tasa Ocupación',
      value: `${stats.occupancyRate}%`,
      icon: 'bar_chart',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Clientes Activos',
      value: `${stats.activeClients}/${stats.totalClients}`,
      icon: 'group',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ]

  return (
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('profile')}
            className="p-2 rounded-full bg-cm-surface-container-highest/60 text-cm-on-surface-variant hover:text-cm-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cm-on-surface">
              Admin Dashboard
            </h1>
            <p className="text-cm-on-surface-variant text-sm font-[family-name:var(--font-inter)]">
              Resumen de gestión y estadísticas
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card rounded-xl p-4"
            >
              <div className={`w-10 h-10 rounded-lg ${kpi.bgColor} flex items-center justify-center mb-3`}>
                <span className={`material-symbols-outlined ${kpi.color} text-[22px]`} style={{ fontVariationSettings: '"FILL" 1' }}>
                  {kpi.icon}
                </span>
              </div>
              <p className={`font-[family-name:var(--font-sora)] text-2xl font-bold ${kpi.color}`}>
                {kpi.value}
              </p>
              <p className="text-cm-on-surface-variant text-xs mt-1 font-[family-name:var(--font-inter)]">
                {kpi.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-5 md:col-span-2"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-4">
              Ingresos por Mes
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    stroke="#b9ccb2"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="#b9ccb2"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#2d382a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#dae6d2',
                    }}
                    formatter={(value: number) => [`$${value}`, 'Ingresos']}
                  />
                  <Bar dataKey="revenue" fill="#00ff41" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Pie Chart - Bookings by Sport */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-2xl p-5"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-4">
              Reservas por Deporte
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sportPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sportPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#2d382a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#dae6d2',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {sportPieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-[10px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent Bookings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-5"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-4">
              Reservas Recientes
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {stats.recentBookings.map((booking) => {
                const status = statusConfig[booking.status] || statusConfig.confirmed
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-cm-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-cm-primary text-[18px]">
                        {sportIcons[booking.court.sport] || 'sports'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cm-on-surface truncate font-[family-name:var(--font-sora)]">
                        {booking.court.name}
                      </p>
                      <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                        {booking.client.name} · {booking.startTime}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-cm-primary font-[family-name:var(--font-sora)]">${booking.totalPrice}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Top Courts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card rounded-2xl p-5"
          >
            <h2 className="font-[family-name:var(--font-sora)] font-semibold text-cm-on-surface text-base mb-4">
              Top Canchas por Ingresos
            </h2>
            <div className="space-y-3">
              {stats.topCourts.map((court, index) => (
                <div key={court.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-[family-name:var(--font-sora)] font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-gray-400/20 text-gray-300' :
                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-cm-surface-container-highest text-cm-on-surface-variant'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cm-on-surface truncate font-[family-name:var(--font-sora)]">
                      {court.name}
                    </p>
                    <p className="text-[11px] text-cm-on-surface-variant font-[family-name:var(--font-inter)]">
                      {court.branch?.name} · {court.bookingCount} reservas
                    </p>
                  </div>
                  <p className="text-sm font-bold text-cm-primary font-[family-name:var(--font-sora)]">
                    ${court.totalRevenue}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

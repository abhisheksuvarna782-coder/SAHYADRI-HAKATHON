import React, { Suspense, lazy } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getDashboardMetrics, runDemoScenario } from '@/services/api'
import { apiErrorMessage, fmtINR, fmtRelative, fmtDate, disruptionTypeLabel } from '@/utils'
import {
  LayoutDashboard, Zap, AlertTriangle, CheckCircle,
  TrendingUp, Clock, Plane, Activity, ArrowRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useTilt } from '@/hooks/useTilt'

// Lazy 3D globe for dashboard
const DashboardOrb3D = lazy(() => import('@/components/DashboardOrb3D'))

function StatCard({
  icon: Icon, label, value, sub, color = '#2E3D28',
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(6)
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="stat-card robo-card-hover"
      style={{
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transformStyle: 'preserve-3d',
        background: '#FFFFFF',
        border: '1px solid #D4D7C7',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="stat-label text-[#606E5A]">{label}</div>
          <div className="stat-value mt-1 text-[#2E3D28]">{value}</div>
          {sub && (
            <div className="font-mono text-[10px] mt-1 text-[#606E5A]">
              {sub}
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: '#F4F5EF',
            border: '1px solid #D4D7C7',
            color,
            boxShadow: '0 1px 3px rgba(46, 61, 40, 0.05)',
          }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #D4D7C7',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(46, 61, 40, 0.1)',
      }}
    >
      <p className="font-mono text-[10px] text-[#606E5A] mb-0.5">{label}</p>
      <p className="font-display font-bold text-[#2E3D28] text-sm">{payload[0].value}</p>
    </div>
  )
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } } as const
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } }

export default function DashboardPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardMetrics,
    refetchInterval: 30_000,
  })

  const demoMutation = useMutation({
    mutationFn: runDemoScenario,
    onSuccess: (data) => { qc.invalidateQueries(); navigate(`/recovery/${data.recovery_plan_id}`) },
  })

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="skeleton h-60 rounded-xl" />
        <div className="lg:col-span-2 skeleton h-60 rounded-xl" />
      </div>
    </div>
  )

  if (error) return (
    <div className="robo-card p-10 text-center max-w-md mx-auto my-12">
      <div className="w-12 h-12 rounded-xl bg-[#FFF1F1] border border-[#F8CECE] text-[#B83A3A] flex items-center justify-center mx-auto mb-4">
        <AlertTriangle size={24} />
      </div>
      <p className="font-display font-bold text-base text-[#2E3D28] mb-1">Could not connect to backend</p>
      <p className="font-mono text-xs text-[#606E5A]">
        Backend service is starting on <code className="text-[#2E3D28] font-semibold">http://localhost:8000</code>
      </p>
    </div>
  )

  const m = metrics!
  const chartData = [
    { name: 'Active',    value: m.total_active_bookings,    fill: '#2E3D28' },
    { name: 'Disrupted', value: m.affected_reservations,    fill: '#B83A3A' },
    { name: 'Plans',     value: m.recovery_plans_generated, fill: '#A9B887' },
    { name: 'Alerts',    value: m.current_disruptions,      fill: '#C28424' },
  ]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-[#2E3D28]">
            <div className="w-8 h-8 rounded-lg bg-[#2E3D28] text-white flex items-center justify-center">
              <LayoutDashboard size={17} />
            </div>
            Recovery Dashboard
          </h1>
          <p className="page-subtitle text-xs text-[#606E5A]">
            Real-time travel disruption monitoring & recovery operations
          </p>
        </div>
        <button
          id="dashboard-run-demo"
          onClick={() => demoMutation.mutate()}
          disabled={demoMutation.isPending}
          className="btn btn-primary gap-2 shadow-subtle text-xs"
        >
          <Zap size={14} className="text-[#A9B887]" />{demoMutation.isPending ? 'Simulating…' : 'Run Demo Scenario'}
        </button>
      </motion.div>

      {demoMutation.isError && (
        <p role="alert" className="text-sm text-[#B83A3A] font-medium">
          {apiErrorMessage(demoMutation.error)}
        </p>
      )}

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Plane}         label="Active Bookings" value={m.total_active_bookings}                 color="#2E3D28" />
        <StatCard icon={AlertTriangle} label="Disruptions"     value={m.current_disruptions}                   color={m.current_disruptions > 0 ? '#B83A3A' : '#2D6A35'} sub={m.current_disruptions > 0 ? 'Action required' : 'All clear'} />
        <StatCard icon={Activity}      label="Affected"        value={m.affected_reservations}                 color="#C28424" />
        <StatCard icon={Zap}           label="Recovery Plans"  value={m.recovery_plans_generated}              color="#2E3D28" />
        <StatCard icon={TrendingUp}    label="Est. Extra Cost" value={fmtINR(m.estimated_additional_cost_inr)} color="#2D6A35" sub="proposed plans" />
      </motion.div>

      {/* 3D Orb + Chart + Active Disruptions Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* 3D Rotating Gyroscopic Status Globe */}
        <div className="hud-panel p-4 flex flex-col items-center justify-between" style={{ background: '#FFFFFF' }}>
          <div className="flex items-center justify-between pb-2 border-b border-[#D4D7C7] w-full">
            <span className="font-mono text-[10px] font-bold text-[#606E5A] uppercase tracking-wider">
              SYS://ORBIT_TELEMETRY
            </span>
            <span className="w-2 h-2 rounded-full bg-[#2E3D28]" />
          </div>
          <Suspense
            fallback={
              <div className="h-44 flex items-center justify-center">
                <div className="w-7 h-7 border-2 border-[#D4D7C7] border-t-[#2E3D28] rounded-full animate-spin" />
              </div>
            }
          >
            <DashboardOrb3D disruptions={m.current_disruptions} />
          </Suspense>
        </div>

        {/* Chart */}
        <div className="hud-panel p-5 flex flex-col justify-between" style={{ background: '#FFFFFF' }}>
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#D4D7C7]">
              <span className="font-mono text-[10px] font-bold text-[#606E5A] uppercase tracking-wider">
                SYS://METRICS_OVERVIEW
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={24} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#606E5A', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#606E5A', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(169,184,135,0.2)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active disruptions */}
        <div className="lg:col-span-2 robo-card p-5" style={{ background: '#FFFFFF' }}>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#D4D7C7]">
            <span className="font-mono text-[10px] font-bold text-[#606E5A] uppercase tracking-wider">
              SYS://ACTIVE_DISRUPTIONS
            </span>
            <button
              onClick={() => navigate('/disruptions')}
              className="text-xs font-semibold text-[#2E3D28] hover:text-black flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          {m.active_disruption_cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 rounded-full bg-[#F1F8F2] border border-[#CFE6D3] text-[#2D6A35] flex items-center justify-center mb-2">
                <CheckCircle size={20} />
              </div>
              <p className="font-medium text-sm text-[#2E3D28]">No active disruptions detected</p>
              <p className="text-xs text-[#606E5A] mt-0.5">All scheduled travel bookings are proceeding normally.</p>
              <button onClick={() => demoMutation.mutate()} className="btn btn-secondary btn-sm mt-4">
                <Zap size={13} /> Run Demo Disruption
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {m.active_disruption_cases.slice(0, 5).map(d => (
                <motion.div
                  key={d.id}
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer bg-[#F4F5EF] hover:bg-[#E8E9DF] border border-[#D4D7C7] transition-colors"
                  onClick={() => navigate('/disruptions')}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#B83A3A]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#2E3D28] truncate">
                      {disruptionTypeLabel(d.disruption_type)}
                    </div>
                    <div className="font-mono text-[11px] text-[#606E5A] mt-0.5">
                      {d.origin} → {d.destination} · {fmtRelative(d.detected_at)}
                    </div>
                  </div>
                  {d.is_simulated && (
                    <span className="badge badge-simulated flex-shrink-0">SIM</span>
                  )}
                  <ArrowRight size={14} className="text-[#606E5A] flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Recent Alerts + Upcoming Trips */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="robo-card p-5" style={{ background: '#FFFFFF' }}>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#D4D7C7]">
            <Clock size={14} className="text-[#606E5A]" />
            <span className="font-mono text-[10px] font-bold text-[#606E5A] uppercase tracking-wider">
              LOG://RECENT_ACTIVITY
            </span>
          </div>
          {m.recent_alerts.length === 0 ? (
            <p className="text-sm text-[#606E5A] py-4 text-center">No recent alert logs.</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {m.recent_alerts.map(a => (
                <div key={a.id} className="flex gap-3 text-xs">
                  <span className="font-mono text-[10px] text-[#606E5A] whitespace-nowrap pt-0.5 flex-shrink-0">
                    {fmtRelative(a.timestamp)}
                  </span>
                  <span className="text-[#2E3D28] leading-relaxed">{a.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="robo-card p-5" style={{ background: '#FFFFFF' }}>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#D4D7C7]">
            <Plane size={14} className="text-[#606E5A]" />
            <span className="font-mono text-[10px] font-bold text-[#606E5A] uppercase tracking-wider">
              SYS://MANAGED_TRIPS
            </span>
          </div>
          {m.upcoming_trips.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#606E5A]">No upcoming trips recorded.</p>
              <button onClick={() => demoMutation.mutate()} className="btn btn-secondary btn-sm mt-3">
                <Zap size={13} /> Load Demo Trip
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {m.upcoming_trips.map(t => (
                <motion.div
                  key={t.id}
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-[#F4F5EF] hover:bg-[#E8E9DF] border border-[#D4D7C7] transition-colors"
                  onClick={() => navigate(`/trips/${t.id}`)}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#D4D7C7] text-[#2E3D28] flex items-center justify-center flex-shrink-0">
                    <Plane size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#2E3D28] truncate">{t.name}</div>
                    <div className="font-mono text-[11px] text-[#606E5A]">
                      {t.origin} → {t.destination} · {fmtDate(t.departure_date)}
                    </div>
                  </div>
                  {t.is_demo && <span className="badge badge-demo flex-shrink-0">DEMO</span>}
                  <ArrowRight size={14} className="text-[#606E5A] flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

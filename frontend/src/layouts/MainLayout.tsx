import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Plane, AlertTriangle, Zap,
  Settings, MessageSquare, Menu, X, Route, ShieldCheck
} from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { runDemoScenario } from '@/services/api'
import { apiErrorMessage } from '@/utils'

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trips',       icon: Plane,           label: 'My Trips' },
  { to: '/disruptions', icon: AlertTriangle,   label: 'Disruptions' },
  { to: '/recovery',    icon: Zap,             label: 'Recovery' },
  { to: '/constraints', icon: Settings,        label: 'Constraints' },
  { to: '/assistant',   icon: MessageSquare,   label: 'Assistant' },
]

const pageTransition = {
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const demoMutation = useMutation({
    mutationFn: runDemoScenario,
    onSuccess: (data) => {
      qc.invalidateQueries()
      navigate(`/recovery/${data.recovery_plan_id}`)
    },
  })

  return (
    <div className="flex h-screen overflow-hidden bg-[#E8E9DF]">

      {/* ══ Sidebar ══ */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col
        transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        bg-[#F4F5EF] border-r border-[#D4D7C7] shadow-sm
      `}>
        {/* Workspace Brand / Logo */}
        <div className="relative flex items-center gap-3 px-6 py-5 border-b border-[#D4D7C7]">
          <div className="w-9 h-9 rounded-xl bg-[#2E3D28] text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Route size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-sm tracking-tight text-[#2E3D28]">
              RouteRecover
            </div>
            <div className="font-mono text-[10px] font-semibold text-[#606E5A] tracking-wider uppercase">
              AI Operations
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-[#606E5A] hover:text-[#2E3D28]"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Demo Action Button */}
        <div className="p-4 border-b border-[#D4D7C7]">
          <button
            id="run-demo-btn"
            onClick={() => demoMutation.mutate()}
            disabled={demoMutation.isPending}
            className="btn btn-outline btn-sm w-full justify-center shadow-subtle text-xs"
          >
            <Zap size={14} className="text-[#A9B887]" />
            {demoMutation.isPending ? 'Simulating…' : 'Run Demo Scenario'}
          </button>
          {demoMutation.isError && (
            <p className="text-[11px] mt-2 text-center text-[#B83A3A]">
              {apiErrorMessage(demoMutation.error, 'Could not start demo.')}
            </p>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#606E5A] font-semibold">
              NAVIGATION
            </span>
          </div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Status / Telemetry Footer */}
        <div className="p-4 border-t border-[#D4D7C7] space-y-2.5 bg-[#E8E9DF]/70">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D4D7C7] shadow-subtle">
            <span className="w-2 h-2 rounded-full bg-[#2E3D28]" />
            <span className="font-mono text-[10px] text-[#2E3D28] font-semibold">
              SYSTEM ONLINE
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF9EE] border border-[#F8E3B6] text-[#9A630A]">
            <ShieldCheck size={12} />
            <span className="font-mono text-[9px] font-semibold">
              SIMULATED RECOVERY MODE
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ══ Main Viewport ══ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#E8E9DF]">

        {/* Header Bar */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-[#F4F5EF] border-b border-[#D4D7C7] flex-shrink-0 shadow-subtle">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-[#606E5A] hover:text-[#2E3D28]"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Mobile Brand */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#2E3D28] text-white flex items-center justify-center">
                <Route size={14} />
              </div>
              <span className="font-display font-bold text-sm text-[#2E3D28]">RouteRecover AI</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#606E5A] hidden sm:inline-block">
              WORKSPACE: <strong className="text-[#2E3D28]">MANGALORE–BLR CORRIDOR</strong>
            </span>
            <span className="badge badge-demo">
              DEMO DATASET
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              {...pageTransition}
              className="p-6 lg:p-8 max-w-7xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

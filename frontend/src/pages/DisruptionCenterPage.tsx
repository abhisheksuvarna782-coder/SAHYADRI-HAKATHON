import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listDisruptions, simulateDisruption, listTrips, generateRecovery, getTrip } from '@/services/api'
import { apiErrorMessage, fmtRelative, fmtTime, disruptionTypeLabel } from '@/utils'
import { AlertTriangle, Zap, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DisruptionType, Trip } from '@/types'

const DISRUPTION_TYPES: { value: DisruptionType; label: string; icon: string }[] = [
  { value: 'flight_cancellation', label: 'Flight Cancel', icon: '✈️' },
  { value: 'flight_delay',        label: 'Flight Delay',  icon: '⏰' },
  { value: 'train_delay',         label: 'Train Delay',   icon: '🚆' },
  { value: 'bus_cancellation',    label: 'Bus Cancel',    icon: '🚌' },
  { value: 'hotel_cancellation',  label: 'Hotel Cancel',  icon: '🏨' },
  { value: 'train_cancellation',  label: 'Train Cancel',  icon: '🚆' },
]

export default function DisruptionCenterPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showSimulate, setShowSimulate] = useState(false)
  const [selectedType, setSelectedType] = useState<DisruptionType>('flight_cancellation')

  const { data: disruptions, isLoading, error } = useQuery({ queryKey: ['disruptions'], queryFn: listDisruptions, refetchInterval: 15_000 })
  const { data: trips } = useQuery({ queryKey: ['trips'], queryFn: () => listTrips() })

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const demoTrip = trips?.find((t: Trip) => t.is_demo)
      if (!demoTrip) throw new Error('No demo trip found. Run demo scenario first.')
      const tripDetail = await getTrip(demoTrip.id)
      const affectedBooking = tripDetail.bookings?.find(b => {
        if (selectedType === 'hotel_cancellation') return b.booking_type === 'hotel'
        if (b.booking_type !== 'transport') return false
        if (selectedType.startsWith('flight')) return b.transport_type === 'flight'
        if (selectedType.startsWith('train')) return b.transport_type === 'train'
        if (selectedType.startsWith('bus')) return b.transport_type === 'bus'
        return false
      })
      if (!affectedBooking) throw new Error(`No matching booking for ${disruptionTypeLabel(selectedType)}.`)
      const disruption = await simulateDisruption({
        trip_id: demoTrip.id, disruption_type: selectedType, affected_booking_id: affectedBooking.id,
        provider: affectedBooking.provider, origin: affectedBooking.origin, destination: affectedBooking.destination,
        is_demo: true, description: `[SIM] ${disruptionTypeLabel(selectedType)}`,
      })
      return generateRecovery({ trip_id: demoTrip.id, disruption_id: disruption.id })
    },
    onSuccess: (plan) => { qc.invalidateQueries(); navigate(`/recovery/${plan.id}`) },
  })

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">
            <div className="icon-box-amber icon-box w-9 h-9"><AlertTriangle size={17} /></div>
            Disruption Center
          </h1>
          <p className="page-subtitle font-mono">Monitor and simulate travel disruptions</p>
        </div>
        <button onClick={() => setShowSimulate(!showSimulate)} className="btn btn-primary gap-2">
          <Zap size={15} />{showSimulate ? 'Hide Simulator' : 'Simulate Disruption'}
          {showSimulate ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {showSimulate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="hud-panel p-5" style={{ borderColor: 'rgba(255,107,0,0.2)', background: 'rgba(255,107,0,0.02)' }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="icon-box-amber icon-box w-7 h-7"><AlertTriangle size={14} /></div>
                <h2 className="font-semibold text-sm">Disruption Simulator</h2>
                <span className="badge-simulated badge ml-1">SIMULATED</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                {DISRUPTION_TYPES.map(dt => (
                  <motion.button key={dt.value} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedType(dt.value)}
                    className="p-3 rounded-xl text-center transition-all"
                    style={{
                      background: selectedType === dt.value ? 'rgba(0,212,255,0.08)' : 'var(--bg-panel)',
                      border: `1px solid ${selectedType === dt.value ? 'var(--border-base)' : 'var(--border-dim)'}`,
                      boxShadow: selectedType === dt.value ? '0 0 12px rgba(0,212,255,0.08)' : 'none',
                    }}>
                    <div className="text-2xl mb-1.5">{dt.icon}</div>
                    <div className="font-mono text-[10px]" style={{ color: selectedType === dt.value ? 'var(--cyan)' : 'var(--text-muted)' }}>
                      {dt.label.toUpperCase()}
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="alert-simulated mb-4">
                <AlertTriangle size={12} />
                <span className="font-mono text-[10px]">This simulates a disruption on the demo trip. No real bookings changed.</span>
              </div>

              <button onClick={() => simulateMutation.mutate()} disabled={simulateMutation.isPending} className="btn btn-primary gap-2">
                <Zap size={15} />{simulateMutation.isPending ? 'Processing…' : `Simulate ${disruptionTypeLabel(selectedType)}`}
              </button>
              {simulateMutation.isError && <p className="text-sm mt-2" style={{ color: '#ff3355' }}>{apiErrorMessage(simulateMutation.error, 'Simulation failed.')}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : error ? (
        <div className="robo-card p-10 text-center" role="alert"><p style={{ color: '#ff3355' }}>{apiErrorMessage(error, 'Could not load disruptions.')}</p></div>
      ) : !disruptions?.length ? (
        <div className="robo-card p-14 text-center">
          <div className="icon-box-cyan icon-box w-14 h-14 mx-auto mb-4"><AlertTriangle size={24} /></div>
          <p className="font-semibold mb-1">No disruptions recorded</p>
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>Use the simulator to create a demo event.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disruptions.map((d, i) => (
            <motion.div key={d.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="robo-card p-4"
            >
              <div className="flex items-start gap-4">
                <div className="icon-box-danger icon-box w-11 h-11 flex-shrink-0"><AlertTriangle size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{disruptionTypeLabel(d.disruption_type)}</span>
                    {d.is_simulated && <span className="badge-simulated badge">⚠️ SIM</span>}
                  </div>
                  {(d.origin || d.destination) && (
                    <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {d.origin}{d.destination ? ` → ${d.destination}` : ''}{d.provider && <span style={{ color: 'var(--text-muted)' }}> · {d.provider}</span>}
                    </div>
                  )}
                  {d.description && <div className="text-xs mb-2 italic" style={{ color: 'var(--text-muted)' }}>{d.description}</div>}
                  <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1"><Clock size={10} />{fmtRelative(d.detected_at)}</span>
                    {d.original_departure && <span>· ORIG: {fmtTime(d.original_departure)}</span>}
                    {d.delay_minutes && <span style={{ color: '#ff6b00' }}>· DELAY: {d.delay_minutes}m</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

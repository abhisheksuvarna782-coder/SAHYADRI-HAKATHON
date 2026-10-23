import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listTrips } from '@/services/api'
import { apiErrorMessage, fmtDate } from '@/utils'
import { Plane, ArrowRight, MapPin, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } } as const
const item = { hidden: { opacity: 0, y: 24, rotateX: 4 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.45, ease: 'easeOut' as const } } }

export default function TripsPage() {
  const navigate = useNavigate()
  const { data: trips, isLoading, error } = useQuery({ queryKey: ['trips'], queryFn: () => listTrips() })

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="page-title">
          <div className="icon-box-cyan icon-box w-9 h-9"><Plane size={18} /></div>
          My Trips
        </h1>
        <p className="page-subtitle font-mono">Manage your bookings and travel itineraries</p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="robo-card p-10 text-center" role="alert">
          <div className="icon-box-danger icon-box w-12 h-12 mx-auto mb-3"><Plane size={22} /></div>
          <p style={{ color: '#ff3355' }}>{apiErrorMessage(error, 'Could not load trips.')}</p>
        </div>
      ) : !trips?.length ? (
        <div className="robo-card p-14 text-center">
          <div className="icon-box-cyan icon-box w-16 h-16 mx-auto mb-4"><Plane size={28} /></div>
          <p className="font-semibold mb-1">No trips found</p>
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            Run the demo scenario from the sidebar to create a sample trip.
          </p>
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <motion.div
              key={trip.id}
              variants={item}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,255,0.08)' }}
              id={`trip-${trip.id}`}
              className="robo-card p-5 cursor-pointer group"
              onClick={() => navigate(`/trips/${trip.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  {trip.is_demo && <span className="badge-demo badge mb-1.5">DEMO</span>}
                  <h3 className="font-display font-semibold truncate" style={{ fontSize: '0.95rem' }}>{trip.name}</h3>
                </div>
                <div className="icon-box-cyan icon-box w-10 h-10 flex-shrink-0 ml-3"><Plane size={16} /></div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                     style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
                  <MapPin size={11} style={{ color: 'var(--cyan)' }} />
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{trip.origin}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div style={{ height: '1px', width: '12px', background: 'var(--border-base)' }} />
                  <ArrowRight size={10} style={{ color: 'var(--cyan)' }} />
                  <div style={{ height: '1px', width: '12px', background: 'var(--border-base)' }} />
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                     style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
                  <MapPin size={11} style={{ color: 'var(--cyan)' }} />
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{trip.destination}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {fmtDate(trip.departure_date)}
                  {trip.return_date && <> · RET {fmtDate(trip.return_date)}</>}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{trip.id.slice(0, 16)}…</span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip, simulateDisruption, generateRecovery } from '@/services/api'
import { apiErrorMessage, fmtDate, fmtTime, fmtINR, bookingStatusClass, bookingStatusLabel, transportIcon } from '@/utils'
import { ChevronLeft, AlertTriangle, Clock, MapPin, CreditCard, Zap, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Booking } from '@/types'

function BookingCard({ booking, onSimulate }: { booking: Booking; onSimulate?: () => void }) {
  const isTransport = booking.booking_type === 'transport'
  const icon = isTransport ? transportIcon(booking.transport_type) : '🏨'
  const isDisrupted = booking.status === 'disrupted'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="robo-card p-4"
      style={{
        borderColor: isDisrupted ? 'rgba(255,51,85,0.3)' : 'var(--border-subtle)',
        background: isDisrupted ? 'rgba(255,51,85,0.03)' : 'var(--bg-card)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
             style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-sm">{booking.provider}</span>
            <span className={bookingStatusClass(booking.status)}>{bookingStatusLabel(booking.status)}</span>
          </div>
          <div className="font-mono text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>REF: {booking.reference}</div>

          {isTransport && booking.origin && (
            <div className="flex items-center gap-1.5 mb-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <MapPin size={11} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
              <span>{booking.origin}</span>
              <ArrowRight size={11} style={{ color: 'var(--text-muted)' }} />
              <span>{booking.destination}</span>
            </div>
          )}
          {booking.departure_time && (
            <div className="flex items-center gap-1.5 mb-1.5" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <Clock size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              {fmtDate(booking.departure_time)} · {fmtTime(booking.departure_time)}
              {booking.arrival_time && <> → {fmtTime(booking.arrival_time)}</>}
            </div>
          )}
          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <CreditCard size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span className="font-bold" style={{ color: 'var(--cyan)' }}>{fmtINR(booking.price_inr)}</span>
            {booking.seat_class && <span style={{ color: 'var(--text-muted)' }}>· {booking.seat_class}</span>}
          </div>
          {booking.notes && <div className="text-xs mt-1.5 italic" style={{ color: 'var(--text-muted)' }}>{booking.notes}</div>}
        </div>
      </div>

      {booking.status === 'confirmed' && onSimulate && booking.booking_type === 'transport' && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
          <button onClick={onSimulate} className="btn btn-danger btn-sm w-full gap-1.5">
            <AlertTriangle size={12} />Simulate Cancellation
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['trip', tripId], queryFn: () => getTrip(tripId!), enabled: !!tripId,
  })

  const simulateMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!trip || !tripId) throw new Error('Trip is no longer available.')
      const booking = trip.bookings.find(b => b.id === bookingId)
      if (!booking) throw new Error('Booking not found.')
      const disruptionType = booking.transport_type === 'flight' ? 'flight_cancellation'
        : booking.transport_type === 'train' ? 'train_delay'
        : booking.transport_type === 'bus' ? 'bus_cancellation' : undefined
      if (!disruptionType) throw new Error('This booking type cannot be disrupted.')
      const disruption = await simulateDisruption({
        trip_id: tripId, disruption_type: disruptionType, affected_booking_id: bookingId,
        provider: booking.provider, origin: booking.origin, destination: booking.destination, is_demo: trip.is_demo,
      })
      return generateRecovery({ trip_id: tripId, disruption_id: disruption.id })
    },
    onSuccess: (plan) => { qc.invalidateQueries(); navigate(`/recovery/${plan.id}`) },
  })

  if (isLoading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="skeleton h-20 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
      </div>
    </div>
  )

  if (error) return <div className="robo-card p-10 text-center" role="alert"><p style={{ color: '#ff3355' }}>{apiErrorMessage(error, 'Could not load this trip.')}</p></div>
  if (!trip) return <div className="robo-card p-10 text-center"><p style={{ color: 'var(--text-muted)' }}>Trip not found.</p></div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">
      <button onClick={() => navigate('/trips')} className="btn btn-ghost btn-sm gap-2"><ChevronLeft size={16} />Back to Trips</button>

      <div className="robo-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {trip.is_demo && <span className="badge-demo badge mb-2">DEMO TRIP</span>}
            <h1 className="page-title mb-2" style={{ fontSize: '1.4rem' }}>{trip.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', fontSize: '0.8rem' }}>
                <MapPin size={11} style={{ color: 'var(--cyan)' }} /><span style={{ color: 'var(--text-secondary)' }}>{trip.origin}</span>
              </div>
              <ArrowRight size={13} style={{ color: 'var(--cyan)' }} />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', fontSize: '0.8rem' }}>
                <MapPin size={11} style={{ color: 'var(--cyan)' }} /><span style={{ color: 'var(--text-secondary)' }}>{trip.destination}</span>
              </div>
              <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>· {fmtDate(trip.departure_date)}</span>
            </div>
          </div>
          <div className="icon-box-cyan icon-box w-14 h-14 flex-shrink-0" style={{ borderRadius: 'var(--radius-xl)' }}>
            <Zap size={24} />
          </div>
        </div>
      </div>

      {trip.bookings.length > 0 && (
        <div>
          <h2 className="section-title mb-4"><span className="font-mono text-[9px]">SYS://BOOKINGS ({trip.bookings.length})</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trip.bookings.map(b => (
              <BookingCard key={b.id} booking={b}
                onSimulate={b.booking_type === 'transport' && ['flight','train','bus'].includes(b.transport_type ?? '') && b.status === 'confirmed'
                  ? () => simulateMutation.mutate(b.id) : undefined} />
            ))}
          </div>
        </div>
      )}

      {simulateMutation.isError && <div className="alert-danger" role="alert"><AlertTriangle size={14} />{apiErrorMessage(simulateMutation.error, 'Could not simulate.')}</div>}
      {simulateMutation.isPending && (
        <div className="robo-card p-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: 'var(--cyan)', borderTopColor: 'transparent' }} />
          <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>Processing disruption simulation…</span>
        </div>
      )}

      {trip.recovery_plans.length > 0 && (
        <div>
          <h2 className="section-title mb-4"><span className="font-mono text-[9px]">SYS://RECOVERY_PLANS</span></h2>
          <div className="space-y-2">
            {trip.recovery_plans.map(p => (
              <motion.div key={p.id} whileHover={{ x: 4 }} className="robo-card robo-card-hover p-4 cursor-pointer flex items-center justify-between"
                onClick={() => navigate(`/recovery/${p.id}`)}>
                <div>
                  <span className="text-sm font-medium">Recovery Plan</span>
                  <span className="font-mono text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>{p.id.slice(0, 12)}…</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--cyan)' }}>{fmtINR(p.additional_cost_inr)} extra</span>
                  <span className={`badge ${p.status === 'approved' ? 'badge-approved' : p.status === 'rejected' ? 'badge-rejected' : p.status === 'proposed' ? 'badge-proposed' : 'badge-processing'}`}>
                    {p.status.toUpperCase()}
                  </span>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

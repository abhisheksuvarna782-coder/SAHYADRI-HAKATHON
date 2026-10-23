import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getRecoveryHistory } from '@/services/api'
import { apiErrorMessage, fmtINR, fmtRelative, recoveryStatusClass, recoveryStatusLabel } from '@/utils'
import { Clock, Zap, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } } as const
const item = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } }

export default function RecoveryHistoryPage() {
  const navigate = useNavigate()
  const { data: history, isLoading, error } = useQuery({ queryKey: ['recovery-history'], queryFn: getRecoveryHistory })

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">
      <div>
        <h1 className="page-title">
          <div className="icon-box-cyan icon-box w-9 h-9"><Clock size={17} /></div>
          Recovery History
        </h1>
        <p className="page-subtitle font-mono">Past disruptions, recovery plans, and decisions</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : error ? (
        <div className="robo-card p-10 text-center" role="alert"><p style={{ color: '#ff3355' }}>{apiErrorMessage(error, 'Could not load history.')}</p></div>
      ) : !history?.length ? (
        <div className="robo-card p-14 text-center">
          <div className="icon-box-cyan icon-box w-14 h-14 mx-auto mb-4"><Clock size={26} /></div>
          <p className="font-semibold mb-1">No recovery history</p>
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>Run the demo scenario to generate a recovery plan.</p>
        </div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {history.map(plan => {
            const isApproved = plan.status === 'approved'
            const isRejected = plan.status === 'rejected'
            return (
              <motion.div key={plan.id} variants={item} whileHover={{ x: 6 }}
                id={`history-${plan.id}`}
                className="robo-card robo-card-hover p-4 cursor-pointer"
                style={{ borderColor: isApproved ? 'rgba(0,255,136,0.15)' : isRejected ? 'rgba(255,51,85,0.15)' : 'var(--border-subtle)' }}
                onClick={() => navigate(`/recovery/${plan.id}`)}>
                <div className="flex items-center gap-4">
                  <div className={`icon-box w-11 h-11 flex-shrink-0 ${isApproved ? 'icon-box-success' : isRejected ? 'icon-box-danger' : 'icon-box-cyan'}`}>
                    {isApproved ? <CheckCircle size={18} /> : isRejected ? <XCircle size={18} /> : <Zap size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-medium text-sm">Recovery Plan</span>
                      <span className={recoveryStatusClass(plan.status)}>{recoveryStatusLabel(plan.status).toUpperCase()}</span>
                      {plan.is_demo && <span className="badge-demo badge">DEMO</span>}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Created {fmtRelative(plan.created_at)}{plan.decided_at && <> · Decided {fmtRelative(plan.decided_at)}</>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm">{fmtINR(plan.proposed_cost_inr)}</div>
                    <div className="font-mono text-[10px]" style={{
                      color: plan.additional_cost_inr > 0 ? '#ff6b00' : plan.additional_cost_inr < 0 ? '#00ff88' : 'var(--text-muted)',
                    }}>
                      {plan.additional_cost_inr > 0 ? '+' : ''}{fmtINR(plan.additional_cost_inr)}
                    </div>
                  </div>
                  <ArrowRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}

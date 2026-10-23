import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecovery, approveRecovery, rejectRecovery, regenerateRecovery } from '@/services/api'
import {
  apiErrorMessage, fmtINR, fmtTime, fmtDate, fmtDuration,
  recoveryStatusLabel, transportIcon,
} from '@/utils'
import {
  CheckCircle, XCircle, RefreshCcw, ChevronLeft, AlertTriangle,
  Zap, Clock, ArrowRight, MapPin, CreditCard, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useState, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AlternativeOption, RecoveryPlanDetail } from '@/types'

const InteractiveTrajectory3D = lazy(() => import('@/components/InteractiveTrajectory3D'))

/* ── Processing stage tracker ── */
function ProcessingStages({ plan }: { plan: RecoveryPlanDetail }) {
  const stages = plan.processing_stages ?? []
  if (!stages.length) return null
  return (
    <div className="robo-card p-5">
      <div className="section-title mb-4"><span className="font-mono text-[9px]">SYS://PROCESSING_LOG</span></div>
      <div className="space-y-2">
        {stages.map((s) => (
          <div key={s.stage} className="flex items-start gap-3">
            <div className={`icon-box w-7 h-7 flex-shrink-0 mt-0.5 ${
              s.status === 'complete' ? 'icon-box-success' :
              s.status === 'error'    ? 'icon-box-danger'  : 'icon-box-cyan'
            }`}>
              {s.status === 'complete' ? <CheckCircle size={12} /> :
               s.status === 'error'   ? <XCircle size={12} />     :
               <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cyan)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {s.name}
              </div>
              <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Alternative card ── */
function AlternativeCard({
  alt, selected, onSelect,
}: {
  alt: AlternativeOption; selected: boolean; onSelect: () => void
}) {
  const scorePct = Math.round(alt.score * 100)
  const icon = transportIcon(alt.transport_type)
  const scoreColor = alt.score >= 0.7 ? '#00ff88' : alt.score >= 0.4 ? '#ff6b00' : '#ff3355'

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onSelect}
      className="robo-card p-4 cursor-pointer transition-all"
      style={{
        border: selected ? '1px solid var(--border-glow)' : '1px solid var(--border-subtle)',
        background: selected ? 'rgba(0,212,255,0.04)' : 'var(--bg-card)',
        boxShadow: selected ? '0 0 20px rgba(0,212,255,0.08)' : undefined,
      }}
    >
      {/* Rank badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
               style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid var(--border-base)', color: 'var(--cyan)' }}>
            #{alt.rank}
          </div>
          <span className="text-xl">{icon}</span>
          <div>
            <div className="font-semibold text-sm">{alt.provider}</div>
            <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{alt.service_name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{fmtINR(alt.price_inr)}</div>
          <div className="font-mono text-[10px]" style={{
            color: alt.additional_cost_inr > 0 ? '#ff6b00' : '#00ff88',
          }}>
            {alt.additional_cost_inr > 0 ? '+' : ''}{fmtINR(alt.additional_cost_inr)}
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
        <MapPin size={10} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
        <span>{alt.origin}</span>
        <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
        <span>{alt.destination}</span>
      </div>

      {/* Times */}
      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><Clock size={10} />{fmtTime(alt.departure_time)}</span>
        <ArrowRight size={9} />
        <span>{fmtTime(alt.arrival_time)}</span>
        <span>·</span>
        <span>{fmtDuration(alt.duration_minutes)}</span>
        {alt.stops > 0 && <span>· {alt.stops} stop{alt.stops > 1 ? 's' : ''}</span>}
      </div>

      {/* Score bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>MATCH SCORE</span>
          <span className="font-mono text-[10px] font-bold" style={{ color: scoreColor }}>{scorePct}%</span>
        </div>
        <div className="score-bar">
          <motion.div
            className="score-fill"
            initial={{ width: 0 }}
            animate={{ width: `${scorePct}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            style={{ background: `linear-gradient(90deg, ${scoreColor}80, ${scoreColor})` }}
          />
        </div>
      </div>

      {/* Constraint pills */}
      <div className="flex flex-wrap gap-1 mt-3">
        {alt.meets_deadline && <span className="badge badge-confirmed">⏱ Deadline</span>}
        {alt.meets_budget && <span className="badge badge-confirmed">💰 Budget</span>}
        {!alt.meets_max_transfers && <span className="badge badge-disrupted">🔀 Transfers</span>}
        {alt.has_accessibility && <span className="badge badge-approved">♿ Access</span>}
      </div>

      {/* Feasibility issues */}
      {alt.feasibility_issues.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
          {alt.feasibility_issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs mb-1" style={{ color: '#ff6b00' }}>
              <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-3 pt-3 flex items-center gap-1.5" style={{ borderTop: '1px solid var(--border-base)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cyan)', boxShadow: '0 0 6px rgba(0,212,255,0.6)' }} />
          <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--cyan)' }}>SELECTED</span>
        </div>
      )}
    </motion.div>
  )
}

/* ── Cost summary ── */
function CostSummary({ plan }: { plan: RecoveryPlanDetail }) {
  const delta = plan.additional_cost_inr
  return (
    <div className="hud-panel p-4">
      <div className="section-title mb-3"><span className="font-mono text-[9px]">SYS://COST_ANALYSIS</span></div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ORIGINAL', value: fmtINR(plan.original_cost_inr), color: 'var(--text-secondary)' },
          { label: 'RECOVERY', value: fmtINR(plan.proposed_cost_inr), color: 'var(--cyan)' },
          {
            label: 'DELTA',
            value: `${delta > 0 ? '+' : ''}${fmtINR(delta)}`,
            color: delta > 0 ? '#ff6b00' : delta < 0 ? '#00ff88' : 'var(--text-muted)',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
            <div className="font-mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="font-bold" style={{ color, fontSize: '0.95rem' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function RecoveryWorkspacePage() {
  const { recoveryId } = useParams<{ recoveryId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejected, setShowRejected] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'alternatives' | 'itinerary' | 'explanation'>('overview')

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['recovery', recoveryId],
    queryFn: () => getRecovery(recoveryId!),
    enabled: !!recoveryId,
  })

  const approveMutation = useMutation({
    mutationFn: () => approveRecovery(recoveryId!, { selected_alternative_id: selectedAltId ?? undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recovery', recoveryId] }); qc.invalidateQueries({ queryKey: ['recovery-history'] }) },
  })
  const rejectMutation = useMutation({
    mutationFn: () => rejectRecovery(recoveryId!, rejectReason || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recovery', recoveryId] }),
  })
  const regenMutation = useMutation({
    mutationFn: () => regenerateRecovery(recoveryId!),
    onSuccess: (newPlan) => { qc.setQueryData(['recovery', recoveryId], newPlan); qc.invalidateQueries({ queryKey: ['recovery-history'] }) },
  })

  /* Loading */
  if (isLoading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  )

  if (error) return (
    <div className="robo-card p-10 text-center" role="alert">
      <div className="icon-box-danger icon-box w-14 h-14 mx-auto mb-4"><AlertTriangle size={26} /></div>
      <p className="font-semibold mb-1">Could not load recovery plan</p>
      <p className="text-sm" style={{ color: '#ff3355' }}>{apiErrorMessage(error)}</p>
    </div>
  )
  if (!plan) return <div className="robo-card p-10 text-center"><p style={{ color: 'var(--text-muted)' }}>Plan not found.</p></div>

  const isFinal = plan.status === 'approved' || plan.status === 'rejected' || plan.status === 'expired'
  const canDecide = plan.status === 'proposed'
  const tabs = ['overview', 'alternatives', 'itinerary', 'explanation'] as const

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm gap-1.5"><ChevronLeft size={16} />Back</button>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.35rem' }}>
              <div className="icon-box-cyan icon-box w-9 h-9"><Zap size={17} /></div>
              Recovery Workspace
            </h1>
            <p className="page-subtitle font-mono">Plan {recoveryId?.slice(0, 16)}…</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${
            plan.status === 'approved' ? 'badge-approved' :
            plan.status === 'rejected' ? 'badge-rejected' :
            plan.status === 'proposed' ? 'badge-proposed' : 'badge-processing'
          }`} style={{ fontSize: '0.7rem' }}>
            {recoveryStatusLabel(plan.status).toUpperCase()}
          </span>
          {plan.is_demo && <span className="badge-demo badge">DEMO</span>}
          {!isFinal && (
            <button onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending}
              className="btn btn-outline btn-sm gap-1.5">
              <RefreshCcw size={13} className={regenMutation.isPending ? 'animate-spin' : ''} />
              {regenMutation.isPending ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      {/* Flags */}
      {plan.status === 'approved' && (
        <div className="alert-success"><CheckCircle size={14} />
          <span>Plan approved{plan.decision_reason ? ` — ${plan.decision_reason}` : ''}. Trip updated.</span>
        </div>
      )}
      {plan.status === 'rejected' && (
        <div className="alert-danger"><XCircle size={14} />
          <span>Plan rejected{plan.decision_reason ? ` — ${plan.decision_reason}` : ''}.</span>
        </div>
      )}

      {/* Processing stages */}
      <ProcessingStages plan={plan} />

      {/* Cost summary */}
      <CostSummary plan={plan} />

      {/* 3D Interactive Recovery Trajectory Visualizer */}
      <div className="my-2">
        <Suspense fallback={<div className="h-40 skeleton rounded-xl" />}>
          <InteractiveTrajectory3D />
        </Suspense>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap p-1 rounded-xl" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`tab flex-1 capitalize ${activeTab === t ? 'tab-active' : 'tab-inactive'}`}>
            <span className="font-mono text-[10px]">{t.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {plan.affected_bookings.length > 0 && (
                <div className="robo-card p-5">
                  <div className="section-title mb-3"><span className="font-mono text-[9px]">SYS://AFFECTED</span></div>
                  <div className="space-y-2">
                    {plan.affected_bookings.map(b => (
                      <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl"
                           style={{ background: 'rgba(255,51,85,0.04)', border: '1px solid rgba(255,51,85,0.15)' }}>
                        <span className="text-xl">{transportIcon(b.transport_type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{b.provider}</div>
                          <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {b.origin} → {b.destination} · {fmtDate(b.departure_time)}
                          </div>
                        </div>
                        <span className="badge-disrupted badge">DISRUPTED</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {plan.required_actions.length > 0 && (
                <div className="robo-card p-5">
                  <div className="section-title mb-3"><span className="font-mono text-[9px]">SYS://REQUIRED_ACTIONS</span></div>
                  <div className="space-y-2">
                    {plan.required_actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                           style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid var(--border-dim)' }}>
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 font-mono text-[9px] font-bold"
                             style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', border: '1px solid var(--border-base)' }}>
                          {i + 1}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ALTERNATIVES ── */}
          {activeTab === 'alternatives' && (
            <div className="space-y-4">
              {plan.alternatives.length === 0 ? (
                <div className="robo-card p-10 text-center">
                  <p style={{ color: 'var(--text-muted)' }}>No alternatives found for this disruption.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {plan.alternatives.map(alt => (
                    <AlternativeCard key={alt.id} alt={alt}
                      selected={selectedAltId === alt.id}
                      onSelect={() => setSelectedAltId(prev => prev === alt.id ? null : alt.id)} />
                  ))}
                </div>
              )}

              {/* Rejected alternatives toggle */}
              {plan.rejected_alternatives.length > 0 && (
                <div>
                  <button onClick={() => setShowRejected(p => !p)}
                    className="btn btn-ghost btn-sm gap-2 w-full justify-center"
                    style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '0.75rem' }}>
                    {showRejected ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span className="font-mono text-[10px]">
                      {showRejected ? 'HIDE' : 'SHOW'} {plan.rejected_alternatives.length} REJECTED ALTERNATIVES
                    </span>
                  </button>
                  <AnimatePresence>
                    {showRejected && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="pt-3 space-y-2">
                          {plan.rejected_alternatives.map(r => (
                            <div key={r.id} className="p-3 rounded-xl opacity-50"
                                 style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-sm font-medium">{transportIcon(r.transport_type)} {r.provider} — {r.service_name}</span>
                                <span className="badge-rejected badge">REJECTED</span>
                              </div>
                              <div className="font-mono text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                                {fmtTime(r.departure_time)} → {fmtTime(r.arrival_time)} · {fmtINR(r.price_inr)}
                              </div>
                              {r.rejection_reasons.map((reason, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: '#ff3355' }}>
                                  <XCircle size={10} />{reason}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* ── ITINERARY ── */}
          {activeTab === 'itinerary' && (
            <div className="robo-card p-5">
              <div className="section-title mb-4"><span className="font-mono text-[9px]">SYS://RECOVERY_ITINERARY</span></div>
              {plan.segments.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No itinerary segments yet.</p>
              ) : (
                <div className="space-y-0">
                  {plan.segments.map((seg, i) => (
                    <div key={seg.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-base)', color: 'var(--cyan)' }}>
                        {i + 1}
                      </div>
                      <div className="p-3 rounded-xl ml-1" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span>{transportIcon(seg.transport_type)}</span>
                            <span className="font-semibold text-sm">{seg.provider ?? seg.segment_type}</span>
                          </div>
                          <span className="font-bold text-sm" style={{ color: 'var(--cyan)' }}>{fmtINR(seg.price_inr)}</span>
                        </div>
                        {seg.origin && (
                          <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                            <MapPin size={10} style={{ color: 'var(--cyan)' }} />
                            {seg.origin} → {seg.destination}
                          </div>
                        )}
                        {seg.departure_time && (
                          <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={10} />
                            {fmtDate(seg.departure_time)} · {fmtTime(seg.departure_time)}
                            {seg.arrival_time && <> → {fmtTime(seg.arrival_time)}</>}
                            {seg.duration_minutes && <span>· {fmtDuration(seg.duration_minutes)}</span>}
                          </div>
                        )}
                        {seg.notes && <div className="text-xs mt-1.5 italic" style={{ color: 'var(--text-muted)' }}>{seg.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── EXPLANATION ── */}
          {activeTab === 'explanation' && (
            <div className="robo-card p-5">
              <div className="section-title mb-4"><Info size={11} /> <span className="font-mono text-[9px]">SYS://AI_REASONING</span></div>
              {plan.ai_explanation ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {plan.ai_explanation}
                </p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No AI explanation available for this plan.</p>
              )}

              {plan.alternatives.map(alt => alt.explanation && (
                <div key={alt.id} className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-dim)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{transportIcon(alt.transport_type)}</span>
                    <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--cyan)' }}>
                      #{alt.rank} — {alt.provider}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{alt.explanation}</p>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Decision panel ── */}
      {canDecide && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="hud-panel p-5" style={{ border: '1px solid var(--border-base)' }}>
          <div className="section-title mb-4"><span className="font-mono text-[9px]">SYS://DECISION</span></div>

          {selectedAltId && (
            <div className="alert-info mb-4">
              <Zap size={12} />
              <span className="font-mono text-[10px]">
                Selected: {plan.alternatives.find(a => a.id === selectedAltId)?.provider}
                {' '}#{plan.alternatives.find(a => a.id === selectedAltId)?.rank}
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="label">REJECTION REASON (optional)</label>
              <input type="text" className="input" placeholder="e.g. Found a better alternative myself…"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div className="flex gap-3 flex-wrap">
              <button id="approve-recovery-btn" onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="btn btn-success gap-2 flex-1">
                <CheckCircle size={15} />
                {approveMutation.isPending ? 'Approving…' : 'Approve Recovery'}
              </button>
              <button id="reject-recovery-btn" onClick={() => rejectMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="btn btn-danger gap-2 flex-1">
                <XCircle size={15} />
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject Plan'}
              </button>
            </div>
          </div>

          {(approveMutation.isError || rejectMutation.isError) && (
            <div className="alert-danger mt-3" role="alert">
              <AlertTriangle size={13} />
              {apiErrorMessage(approveMutation.error || rejectMutation.error, 'Decision failed.')}
            </div>
          )}
        </motion.div>
      )}

      {/* Regen errors */}
      {regenMutation.isError && (
        <div className="alert-danger" role="alert">
          <AlertTriangle size={13} />
          {apiErrorMessage(regenMutation.error, 'Regeneration failed.')}
        </div>
      )}

      {/* Required actions */}
      {plan.required_actions.length > 0 && isFinal && plan.status === 'approved' && (
        <div className="robo-card p-4">
          <div className="section-title mb-3"><span className="font-mono text-[9px]">SYS://ACTION_ITEMS</span></div>
          <div className="space-y-2">
            {plan.required_actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5"
                     style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88', fontSize: '0.6rem', fontFamily: 'monospace' }}>
                  {i + 1}
                </div>
                {action}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConstraints, saveConstraints } from '@/services/api'
import { apiErrorMessage } from '@/utils'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Settings, Save, AlertTriangle, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TransportType } from '@/types'

const DEMO_TRAVELLER_ID = 'demo-traveller-001'
const TRANSPORT_TYPES: { value: TransportType; label: string; icon: string }[] = [
  { value: 'flight', label: 'Flight', icon: '✈️' },
  { value: 'train',  label: 'Train',  icon: '🚆' },
  { value: 'bus',    label: 'Bus',    icon: '🚌' },
  { value: 'car',    label: 'Car',    icon: '🚗' },
]

export default function ConstraintsPage() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: existing, error: constraintsError } = useQuery({
    queryKey: ['constraints', DEMO_TRAVELLER_ID],
    queryFn: () => getConstraints(DEMO_TRAVELLER_ID),
    retry: false,
  })

  const [form, setForm] = useState({
    max_additional_budget_inr: 1500,
    latest_arrival_time: '2026-10-18T16:00',
    preferred_transport_types: ['train', 'flight'] as TransportType[],
    overnight_travel_ok: false,
    max_transfers: 1,
    max_journey_duration_hours: 8,
    requires_accessibility: false,
    preferred_departure_from: '06:00',
    preferred_departure_to: '14:00',
    notes: 'Must arrive by 4:00 PM to catch connecting train at 5:00 PM.',
  })

  useEffect(() => {
    if (existing) {
      setForm(prev => ({
        ...prev,
        max_additional_budget_inr: existing.max_additional_budget_inr ?? prev.max_additional_budget_inr,
        overnight_travel_ok: existing.overnight_travel_ok,
        max_transfers: existing.max_transfers ?? prev.max_transfers,
        max_journey_duration_hours: existing.max_journey_duration_hours ?? prev.max_journey_duration_hours,
        requires_accessibility: existing.requires_accessibility,
        latest_arrival_time: existing.latest_arrival_time ? existing.latest_arrival_time.slice(0, 16) : prev.latest_arrival_time,
        preferred_departure_from: existing.preferred_departure_from ?? prev.preferred_departure_from,
        preferred_departure_to: existing.preferred_departure_to ?? prev.preferred_departure_to,
        preferred_transport_types: existing.preferred_transport_types ?? prev.preferred_transport_types,
        notes: existing.notes ?? prev.notes,
      }))
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: () => saveConstraints({
      traveller_id: DEMO_TRAVELLER_ID,
      max_additional_budget_inr: form.max_additional_budget_inr,
      latest_arrival_time: form.latest_arrival_time || undefined,
      preferred_transport_types: form.preferred_transport_types,
      overnight_travel_ok: form.overnight_travel_ok,
      max_transfers: form.max_transfers,
      max_journey_duration_hours: form.max_journey_duration_hours,
      requires_accessibility: form.requires_accessibility,
      preferred_departure_from: form.preferred_departure_from,
      preferred_departure_to: form.preferred_departure_to,
      notes: form.notes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['constraints'] }); setSaved(true); setTimeout(() => setSaved(false), 3500) },
  })

  const toggleTransport = (type: TransportType) => {
    setForm(prev => ({
      ...prev,
      preferred_transport_types: prev.preferred_transport_types.includes(type)
        ? prev.preferred_transport_types.filter(t => t !== type)
        : [...prev.preferred_transport_types, type],
    }))
  }

  const constraintsErrorMessage = constraintsError &&
    (!axios.isAxiosError(constraintsError) || constraintsError.response?.status !== 404)
      ? apiErrorMessage(constraintsError, 'Could not load saved constraints.')
      : undefined

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">
          <div className="icon-box-cyan icon-box w-9 h-9"><Settings size={17} /></div>
          Traveller Constraints
        </h1>
        <p className="page-subtitle font-mono">Hard constraints for the AI recovery engine</p>
      </div>

      <div className="robo-card p-6 space-y-6">
        {constraintsErrorMessage && <div className="alert-danger" role="alert"><AlertTriangle size={14} />{constraintsErrorMessage}</div>}

        <div>
          <label className="label">MAX ADDITIONAL BUDGET (₹)</label>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold" style={{ color: 'var(--cyan)' }}>₹</span>
            <input type="number" className="input" value={form.max_additional_budget_inr}
              onChange={e => setForm(prev => ({ ...prev, max_additional_budget_inr: Number(e.target.value) }))} min={0} step={100} />
          </div>
          <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Hard limit — options exceeding this will be rejected.</p>
        </div>

        <hr className="divider" />

        <div>
          <label className="label">LATEST ACCEPTABLE ARRIVAL</label>
          <input type="datetime-local" className="input" value={form.latest_arrival_time}
            onChange={e => setForm(prev => ({ ...prev, latest_arrival_time: e.target.value }))} />
        </div>

        <hr className="divider" />

        <div>
          <label className="label">PREFERRED TRANSPORT</label>
          <div className="flex gap-2 flex-wrap">
            {TRANSPORT_TYPES.map(({ value, label, icon }) => {
              const sel = form.preferred_transport_types.includes(value)
              return (
                <motion.button key={value} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => toggleTransport(value)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                  style={{
                    background: sel ? 'rgba(0,212,255,0.08)' : 'var(--bg-panel)',
                    border: `1px solid ${sel ? 'var(--border-base)' : 'var(--border-dim)'}`,
                    color: sel ? 'var(--cyan)' : 'var(--text-secondary)',
                    fontWeight: sel ? 600 : 400,
                    boxShadow: sel ? '0 0 10px rgba(0,212,255,0.06)' : 'none',
                  }}>
                  <span>{icon}</span>{label}
                </motion.button>
              )
            })}
          </div>
        </div>

        <hr className="divider" />

        <div>
          <label className="label">MAX TRANSFERS</label>
          <select className="select" value={form.max_transfers}
            onChange={e => setForm(prev => ({ ...prev, max_transfers: Number(e.target.value) }))}>
            <option value={0}>Direct only (0)</option>
            <option value={1}>1 stop max</option>
            <option value={2}>2 stops max</option>
            <option value={3}>3 stops max</option>
          </select>
        </div>

        <div>
          <label className="label">MAX JOURNEY DURATION (HRS)</label>
          <input type="number" className="input" value={form.max_journey_duration_hours}
            onChange={e => setForm(prev => ({ ...prev, max_journey_duration_hours: Number(e.target.value) }))} min={1} max={24} step={0.5} />
        </div>

        <hr className="divider" />

        <div>
          <label className="label">DEPARTURE WINDOW</label>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="label" style={{ fontSize: '0.65rem' }}>FROM</span><input type="time" className="input" value={form.preferred_departure_from} onChange={e => setForm(prev => ({ ...prev, preferred_departure_from: e.target.value }))} /></div>
            <div><span className="label" style={{ fontSize: '0.65rem' }}>TO</span><input type="time" className="input" value={form.preferred_departure_to} onChange={e => setForm(prev => ({ ...prev, preferred_departure_to: e.target.value }))} /></div>
          </div>
        </div>

        <hr className="divider" />

        {/* Toggles */}
        <div className="space-y-3">
          {[
            { key: 'overnight_travel_ok', label: 'Overnight travel acceptable' },
            { key: 'requires_accessibility', label: 'Requires accessibility features' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all"
              style={{ background: (form as any)[key] ? 'rgba(0,212,255,0.04)' : 'var(--bg-panel)', border: '1px solid var(--border-dim)' }}>
              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{
                  background: (form as any)[key] ? 'var(--cyan)' : 'var(--bg-input)',
                  border: `1px solid ${(form as any)[key] ? 'var(--cyan)' : 'var(--border-base)'}`,
                  transition: 'all 0.15s ease',
                }}>
                {(form as any)[key] && <CheckCircle size={12} style={{ color: '#020617' }} />}
              </div>
              <input type="checkbox" checked={(form as any)[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.checked }))} className="sr-only" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </label>
          ))}
        </div>

        <hr className="divider" />

        <div>
          <label className="label">NOTES</label>
          <textarea className="input" style={{ resize: 'none', height: '80px' }} value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button id="save-constraints-btn" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn btn-primary gap-2">
            <Save size={15} />{saveMutation.isPending ? 'Saving…' : 'Save Constraints'}
          </button>
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="alert-success">
                <CheckCircle size={13} />Saved! Regenerate to apply.
              </motion.div>
            )}
          </AnimatePresence>
          {saveMutation.isError && <div className="alert-danger" role="alert"><AlertTriangle size={13} />{apiErrorMessage(saveMutation.error, 'Save failed.')}</div>}
        </div>
      </div>

      <div className="alert-simulated">
        <AlertTriangle size={12} />
        <span className="font-mono text-[10px]">Hard constraints override soft preferences. The engine explains if no option satisfies all.</span>
      </div>
    </motion.div>
  )
}

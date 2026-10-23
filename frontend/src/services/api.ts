import axios from 'axios';
import type {
  Trip, TripDetail, Booking, Disruption, DisruptionWithAffected,
  RecoveryPlan, RecoveryPlanDetail, RecoveryDecision,
  TravellerConstraint, DashboardMetrics, AssistantChatResponse,
  DemoScenarioResponse, Traveller, ChatMessage, DisruptionType,
} from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Health ────────────────────────────────────────────────────────────────
export const getHealth = () => api.get('/health').then(r => r.data);

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboardMetrics = (): Promise<DashboardMetrics> =>
  api.get('/dashboard/metrics').then(r => r.data);

// ─── Demo ──────────────────────────────────────────────────────────────────
export const runDemoScenario = (): Promise<DemoScenarioResponse> =>
  api.post('/demo/run').then(r => r.data);

// ─── Travellers ────────────────────────────────────────────────────────────
export const listTravellers = (): Promise<Traveller[]> =>
  api.get('/travellers').then(r => r.data);

export const getTraveller = (id: string): Promise<Traveller> =>
  api.get(`/travellers/${id}`).then(r => r.data);

// ─── Trips ─────────────────────────────────────────────────────────────────
export const listTrips = (params?: { traveller_id?: string; is_demo?: boolean }): Promise<Trip[]> =>
  api.get('/trips', { params }).then(r => r.data);

export const getTrip = (id: string): Promise<TripDetail> =>
  api.get(`/trips/${id}`).then(r => r.data);

export const createTrip = (data: Partial<Trip>): Promise<Trip> =>
  api.post('/trips', data).then(r => r.data);

export const deleteTrip = (id: string): Promise<void> =>
  api.delete(`/trips/${id}`).then(r => r.data);

// ─── Bookings ──────────────────────────────────────────────────────────────
export const listTripBookings = (tripId: string): Promise<Booking[]> =>
  api.get(`/trips/${tripId}/bookings`).then(r => r.data);

export const createBooking = (data: Partial<Booking>): Promise<Booking> =>
  api.post('/bookings', data).then(r => r.data);

export const updateBooking = (id: string, data: Partial<Booking>): Promise<Booking> =>
  api.patch(`/bookings/${id}`, data).then(r => r.data);

export const deleteBooking = (id: string): Promise<void> =>
  api.delete(`/bookings/${id}`).then(r => r.data);

// ─── Disruptions ───────────────────────────────────────────────────────────
export const listDisruptions = (): Promise<Disruption[]> =>
  api.get('/disruptions').then(r => r.data);

export const getDisruption = (id: string): Promise<Disruption> =>
  api.get(`/disruptions/${id}`).then(r => r.data);

export const getAffectedBookings = (id: string): Promise<DisruptionWithAffected> =>
  api.get(`/disruptions/${id}/affected-bookings`).then(r => r.data);

export const simulateDisruption = (data: {
  trip_id: string;
  disruption_type: DisruptionType;
  affected_booking_id?: string;
  provider?: string;
  origin?: string;
  destination?: string;
  description?: string;
  is_demo?: boolean;
}): Promise<Disruption> =>
  api.post('/disruptions/simulate', data).then(r => r.data);

// ─── Recovery ──────────────────────────────────────────────────────────────
export const generateRecovery = (data: {
  trip_id: string;
  disruption_id: string;
}): Promise<RecoveryPlanDetail> =>
  api.post('/recovery/generate', data).then(r => r.data);

export const getRecovery = (id: string): Promise<RecoveryPlanDetail> =>
  api.get(`/recovery/${id}`).then(r => r.data);

export const regenerateRecovery = (id: string): Promise<RecoveryPlanDetail> =>
  api.post(`/recovery/${id}/regenerate`).then(r => r.data);

export const approveRecovery = (id: string, data?: {
  selected_alternative_id?: string;
  reason?: string;
}): Promise<RecoveryDecision> =>
  api.post(`/recovery/${id}/approve`, data || {}).then(r => r.data);

export const rejectRecovery = (id: string, reason?: string): Promise<RecoveryDecision> =>
  api.post(`/recovery/${id}/reject`, { reason }).then(r => r.data);

export const getRecoveryHistory = (): Promise<RecoveryPlan[]> =>
  api.get('/recovery/history').then(r => r.data);

// ─── Constraints ───────────────────────────────────────────────────────────
export const getConstraints = (travellerId: string): Promise<TravellerConstraint> =>
  api.get(`/constraints/${travellerId}`).then(r => r.data);

export const saveConstraints = (data: Partial<TravellerConstraint>): Promise<TravellerConstraint> =>
  api.post('/constraints', data).then(r => r.data);

// ─── Assistant ─────────────────────────────────────────────────────────────
export const chatWithAssistant = (data: {
  message: string;
  recovery_plan_id?: string;
  trip_id?: string;
  history: ChatMessage[];
}): Promise<AssistantChatResponse> =>
  api.post('/assistant/chat', data).then(r => r.data);

export default api;

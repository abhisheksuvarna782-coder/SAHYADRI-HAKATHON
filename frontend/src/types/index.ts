// RouteRecover AI — TypeScript Types

export type TransportType = 'flight' | 'train' | 'bus' | 'car' | 'ferry';
export type BookingStatus = 'confirmed' | 'disrupted' | 'potentially_affected' | 'cancelled' | 'completed' | 'needs_verification';
export type BookingType = 'transport' | 'hotel' | 'car_rental' | 'activity';
export type DisruptionType = 'flight_cancellation' | 'flight_delay' | 'train_delay' | 'bus_cancellation' | 'hotel_cancellation' | 'train_cancellation';
export type RecoveryStatus = 'pending' | 'processing' | 'proposed' | 'approved' | 'rejected' | 'expired';

export interface Traveller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_demo: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  traveller_id: string;
  name: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  is_demo: boolean;
  notes?: string;
  created_at: string;
}

export interface TripDetail extends Trip {
  bookings: Booking[];
  disruptions: Disruption[];
  recovery_plans: RecoveryPlan[];
}

export interface Booking {
  id: string;
  trip_id: string;
  booking_type: BookingType;
  transport_type?: TransportType;
  reference: string;
  provider: string;
  origin?: string;
  destination?: string;
  origin_lat?: number;
  origin_lon?: number;
  destination_lat?: number;
  destination_lon?: number;
  departure_time?: string;
  arrival_time?: string;
  price_inr: number;
  status: BookingStatus;
  seat_class?: string;
  notes?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Disruption {
  id: string;
  trip_id?: string;
  disruption_type: DisruptionType;
  affected_booking_id?: string;
  provider?: string;
  origin?: string;
  destination?: string;
  original_departure?: string;
  original_arrival?: string;
  delay_minutes?: number;
  description?: string;
  is_simulated: boolean;
  detected_at: string;
  is_demo: boolean;
}

export interface DisruptionWithAffected extends Disruption {
  directly_affected: Booking[];
  potentially_affected: Booking[];
  confirmed_unaffected: Booking[];
  needs_verification: Booking[];
}

export interface AlternativeOption {
  id: string;
  rank: number;
  rank_label: string;
  transport_type: TransportType;
  provider: string;
  service_name: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_inr: number;
  additional_cost_inr: number;
  available_seats: number;
  stops: number;
  has_accessibility: boolean;
  meets_deadline: boolean;
  meets_budget: boolean;
  meets_max_transfers: boolean;
  meets_journey_duration?: boolean;
  meets_overnight_constraint: boolean;
  feasibility_issues: string[];
  score: number;
  score_breakdown: Record<string, number>;
  explanation: string;
}

export interface RejectedAlternative {
  id: string;
  transport_type: TransportType;
  provider: string;
  service_name: string;
  departure_time: string;
  arrival_time: string;
  price_inr: number;
  additional_cost_inr: number;
  rejection_reasons: string[];
}

export interface RecoverySegment {
  id: string;
  recovery_plan_id: string;
  segment_order: number;
  segment_type: string;
  transport_type?: TransportType;
  provider?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
  arrival_time?: string;
  duration_minutes?: number;
  price_inr: number;
  notes?: string;
}

export interface RecoveryPlan {
  id: string;
  trip_id: string;
  disruption_id: string;
  status: RecoveryStatus;
  original_cost_inr: number;
  proposed_cost_inr: number;
  additional_cost_inr: number;
  ai_explanation?: string;
  decision_reason?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  decided_at?: string;
}

export interface RecoveryPlanDetail extends RecoveryPlan {
  alternatives: AlternativeOption[];
  rejected_alternatives: RejectedAlternative[];
  segments: RecoverySegment[];
  disruption?: Disruption;
  affected_bookings: Booking[];
  potentially_affected_bookings: Booking[];
  required_actions: string[];
  processing_stages: ProcessingStage[];
}

export interface ProcessingStage {
  stage: number;
  name: string;
  status: 'complete' | 'pending' | 'error';
  detail: string;
}

export interface TravellerConstraint {
  id: string;
  traveller_id: string;
  max_additional_budget_inr?: number;
  latest_arrival_time?: string;
  preferred_transport_types?: TransportType[];
  overnight_travel_ok: boolean;
  max_transfers?: number;
  max_journey_duration_hours?: number;
  requires_accessibility: boolean;
  preferred_departure_from?: string;
  preferred_departure_to?: string;
  critical_booking_ids?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  total_active_bookings: number;
  current_disruptions: number;
  affected_reservations: number;
  recovery_plans_generated: number;
  estimated_additional_cost_inr: number;
  recent_alerts: Alert[];
  upcoming_trips: Trip[];
  active_disruption_cases: Disruption[];
}

export interface Alert {
  id: string;
  event_type: string;
  description: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatResponse {
  response: string;
  updated_constraints?: Record<string, unknown>;
  trigger_regenerate: boolean;
  clarification_needed: boolean;
}

export interface DemoScenarioResponse {
  trip_id: string;
  disruption_id: string;
  recovery_plan_id: string;
  message: string;
}

export interface RecoveryDecision {
  id: string;
  recovery_plan_id: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  decided_at: string;
  is_simulated_change: boolean;
}

"""
Pydantic v2 schemas for RouteRecover AI API
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, field_validator, model_validator, ConfigDict
import json


# ─── Shared ─────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


# ─── Traveller ───────────────────────────────────────────────────────────────

class TravellerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    is_demo: bool = False


class TravellerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    is_demo: bool
    created_at: datetime


# ─── Trip ────────────────────────────────────────────────────────────────────

class TripCreate(BaseModel):
    traveller_id: str
    name: str
    origin: str
    destination: str
    departure_date: datetime
    return_date: Optional[datetime] = None
    is_demo: bool = False
    notes: Optional[str] = None


class TripRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    traveller_id: str
    name: str
    origin: str
    destination: str
    departure_date: datetime
    return_date: Optional[datetime] = None
    is_demo: bool
    notes: Optional[str] = None
    created_at: datetime


class TripDetail(TripRead):
    bookings: List["BookingRead"] = []
    disruptions: List["DisruptionRead"] = []
    recovery_plans: List["RecoveryPlanRead"] = []


# ─── Booking ─────────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    trip_id: str
    booking_type: str = "transport"
    transport_type: Optional[str] = None
    reference: str
    provider: str
    origin: Optional[str] = None
    destination: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lon: Optional[float] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    price_inr: float = 0.0
    status: str = "confirmed"
    seat_class: Optional[str] = None
    notes: Optional[str] = None
    is_demo: bool = False


class BookingUpdate(BaseModel):
    status: Optional[str] = None
    price_inr: Optional[float] = None
    notes: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str
    booking_type: str
    transport_type: Optional[str] = None
    reference: str
    provider: str
    origin: Optional[str] = None
    destination: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lon: Optional[float] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    price_inr: float
    status: str
    seat_class: Optional[str] = None
    notes: Optional[str] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime


# ─── Disruption ──────────────────────────────────────────────────────────────

class DisruptionSimulateRequest(BaseModel):
    trip_id: str
    disruption_type: str
    affected_booking_id: Optional[str] = None
    provider: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    original_departure: Optional[datetime] = None
    original_arrival: Optional[datetime] = None
    delay_minutes: Optional[int] = None
    description: Optional[str] = None
    is_demo: bool = True


class DisruptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: Optional[str] = None
    disruption_type: str
    affected_booking_id: Optional[str] = None
    provider: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    original_departure: Optional[datetime] = None
    original_arrival: Optional[datetime] = None
    delay_minutes: Optional[int] = None
    description: Optional[str] = None
    is_simulated: bool
    detected_at: datetime
    is_demo: bool


class DisruptionWithAffected(DisruptionRead):
    directly_affected: List[BookingRead] = []
    potentially_affected: List[BookingRead] = []
    confirmed_unaffected: List[BookingRead] = []
    needs_verification: List[BookingRead] = []


# ─── Traveller Constraints ────────────────────────────────────────────────────

class TravellerConstraintCreate(BaseModel):
    traveller_id: str
    max_additional_budget_inr: Optional[float] = None
    latest_arrival_time: Optional[datetime] = None
    preferred_transport_types: Optional[List[str]] = None
    overnight_travel_ok: bool = True
    max_transfers: Optional[int] = None
    max_journey_duration_hours: Optional[float] = None
    requires_accessibility: bool = False
    preferred_departure_from: Optional[str] = None
    preferred_departure_to: Optional[str] = None
    critical_booking_ids: Optional[List[str]] = None
    notes: Optional[str] = None


class TravellerConstraintRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    traveller_id: str
    max_additional_budget_inr: Optional[float] = None
    latest_arrival_time: Optional[datetime] = None
    preferred_transport_types: Optional[List[str]] = None
    overnight_travel_ok: bool
    max_transfers: Optional[int] = None
    max_journey_duration_hours: Optional[float] = None
    requires_accessibility: bool
    preferred_departure_from: Optional[str] = None
    preferred_departure_to: Optional[str] = None
    critical_booking_ids: Optional[List[str]] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("preferred_transport_types", mode="before")
    @classmethod
    def parse_ptt(cls, v: Any) -> Optional[List[str]]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v

    @field_validator("critical_booking_ids", mode="before")
    @classmethod
    def parse_cbi(cls, v: Any) -> Optional[List[str]]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v


# ─── Recovery ────────────────────────────────────────────────────────────────

class AlternativeOption(BaseModel):
    id: str
    rank: int
    rank_label: str
    transport_type: str
    provider: str
    service_name: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    price_inr: float
    additional_cost_inr: float
    available_seats: int
    stops: int
    has_accessibility: bool
    meets_deadline: bool
    meets_budget: bool
    meets_max_transfers: bool
    meets_journey_duration: bool = True
    meets_overnight_constraint: bool
    feasibility_issues: List[str]
    score: float
    score_breakdown: Dict[str, float]
    explanation: str


class RejectedAlternative(BaseModel):
    id: str
    transport_type: str
    provider: str
    service_name: str
    departure_time: datetime
    arrival_time: datetime
    price_inr: float
    additional_cost_inr: float
    rejection_reasons: List[str]


class RecoveryGenerateRequest(BaseModel):
    trip_id: str
    disruption_id: str
    constraint_id: Optional[str] = None


class RecoveryPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    trip_id: str
    disruption_id: str
    status: str
    original_cost_inr: float
    proposed_cost_inr: float
    additional_cost_inr: float
    ai_explanation: Optional[str] = None
    decision_reason: Optional[str] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime
    decided_at: Optional[datetime] = None


class RecoverySegmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    recovery_plan_id: str
    segment_order: int
    segment_type: str
    transport_type: Optional[str] = None
    provider: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    price_inr: float
    notes: Optional[str] = None


class RecoveryPlanDetail(RecoveryPlanRead):
    alternatives: List[AlternativeOption] = []
    rejected_alternatives: List[RejectedAlternative] = []
    segments: List[RecoverySegmentRead] = []
    disruption: Optional[DisruptionRead] = None
    affected_bookings: List[BookingRead] = []
    potentially_affected_bookings: List[BookingRead] = []
    required_actions: List[str] = []
    processing_stages: List[Dict[str, Any]] = []


class RecoveryApproveRequest(BaseModel):
    selected_alternative_id: Optional[str] = None
    reason: Optional[str] = None


class RecoveryRejectRequest(BaseModel):
    reason: Optional[str] = None


class RecoveryDecisionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    recovery_plan_id: str
    decision: str
    reason: Optional[str] = None
    decided_at: datetime
    is_simulated_change: bool


# ─── Assistant / Chat ────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    message: str
    recovery_plan_id: Optional[str] = None
    trip_id: Optional[str] = None
    history: List[ChatMessage] = []


class AssistantChatResponse(BaseModel):
    response: str
    updated_constraints: Optional[Dict[str, Any]] = None
    trigger_regenerate: bool = False
    clarification_needed: bool = False


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardMetrics(BaseModel):
    total_active_bookings: int
    current_disruptions: int
    affected_reservations: int
    recovery_plans_generated: int
    estimated_additional_cost_inr: float
    recent_alerts: List[Dict[str, Any]]
    upcoming_trips: List[TripRead]
    active_disruption_cases: List[DisruptionRead]


# ─── Demo ────────────────────────────────────────────────────────────────────

class DemoScenarioResponse(BaseModel):
    trip_id: str
    disruption_id: str
    recovery_plan_id: str
    message: str

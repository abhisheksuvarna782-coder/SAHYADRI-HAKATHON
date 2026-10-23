"""
SQLAlchemy models for RouteRecover AI
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
import uuid

from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ─── Enums ─────────────────────────────────────────────────────────────────

class TransportType(str, enum.Enum):
    FLIGHT = "flight"
    TRAIN = "train"
    BUS = "bus"
    CAR = "car"
    FERRY = "ferry"


class BookingStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    DISRUPTED = "disrupted"
    POTENTIALLY_AFFECTED = "potentially_affected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NEEDS_VERIFICATION = "needs_verification"


class DisruptionType(str, enum.Enum):
    FLIGHT_CANCELLATION = "flight_cancellation"
    FLIGHT_DELAY = "flight_delay"
    TRAIN_DELAY = "train_delay"
    BUS_CANCELLATION = "bus_cancellation"
    HOTEL_CANCELLATION = "hotel_cancellation"
    TRAIN_CANCELLATION = "train_cancellation"


class RecoveryStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PROPOSED = "proposed"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class BookingType(str, enum.Enum):
    TRANSPORT = "transport"
    HOTEL = "hotel"
    CAR_RENTAL = "car_rental"
    ACTIVITY = "activity"


# ─── Models ─────────────────────────────────────────────────────────────────

class Traveller(Base):
    __tablename__ = "travellers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(200), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="traveller")
    constraints: Mapped[List["TravellerConstraint"]] = relationship("TravellerConstraint", back_populates="traveller")


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    traveller_id: Mapped[str] = mapped_column(String(36), ForeignKey("travellers.id"))
    name: Mapped[str] = mapped_column(String(300))
    origin: Mapped[str] = mapped_column(String(200))
    destination: Mapped[str] = mapped_column(String(200))
    departure_date: Mapped[datetime] = mapped_column(DateTime)
    return_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    traveller: Mapped["Traveller"] = relationship("Traveller", back_populates="trips")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="trip")
    disruptions: Mapped[List["Disruption"]] = relationship("Disruption", back_populates="trip")
    recovery_plans: Mapped[List["RecoveryPlan"]] = relationship("RecoveryPlan", back_populates="trip")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id"))
    booking_type: Mapped[str] = mapped_column(SAEnum(BookingType), default=BookingType.TRANSPORT)
    transport_type: Mapped[Optional[str]] = mapped_column(SAEnum(TransportType), nullable=True)
    reference: Mapped[str] = mapped_column(String(100))
    provider: Mapped[str] = mapped_column(String(200))
    origin: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    origin_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    origin_lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    departure_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    arrival_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    price_inr: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(SAEnum(BookingStatus), default=BookingStatus.CONFIRMED)
    seat_class: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip: Mapped["Trip"] = relationship("Trip", back_populates="bookings")
    upstream_dependencies: Mapped[List["BookingDependency"]] = relationship(
        "BookingDependency", foreign_keys="BookingDependency.dependent_booking_id", back_populates="dependent_booking"
    )
    downstream_dependencies: Mapped[List["BookingDependency"]] = relationship(
        "BookingDependency", foreign_keys="BookingDependency.upstream_booking_id", back_populates="upstream_booking"
    )

    __table_args__ = (
        Index("ix_bookings_trip_id", "trip_id"),
        Index("ix_bookings_status", "status"),
    )


class BookingDependency(Base):
    """Records that a booking depends on another (e.g. connecting flight, hotel check-in)."""
    __tablename__ = "booking_dependencies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    upstream_booking_id: Mapped[str] = mapped_column(String(36), ForeignKey("bookings.id"))
    dependent_booking_id: Mapped[str] = mapped_column(String(36), ForeignKey("bookings.id"))
    dependency_type: Mapped[str] = mapped_column(String(100))  # connection, hotel_checkin, car_pickup
    min_connection_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    upstream_booking: Mapped["Booking"] = relationship("Booking", foreign_keys=[upstream_booking_id], back_populates="downstream_dependencies")
    dependent_booking: Mapped["Booking"] = relationship("Booking", foreign_keys=[dependent_booking_id], back_populates="upstream_dependencies")


class Disruption(Base):
    __tablename__ = "disruptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    trip_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("trips.id"), nullable=True)
    disruption_type: Mapped[str] = mapped_column(SAEnum(DisruptionType))
    affected_booking_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bookings.id"), nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    origin: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    original_departure: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    original_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delay_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)

    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="disruptions")
    recovery_plans: Mapped[List["RecoveryPlan"]] = relationship("RecoveryPlan", back_populates="disruption")

    __table_args__ = (
        Index("ix_disruptions_trip_id", "trip_id"),
    )


class TransportAlternative(Base):
    """Mock transport alternatives available in the system."""
    __tablename__ = "transport_alternatives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    transport_type: Mapped[str] = mapped_column(SAEnum(TransportType))
    provider: Mapped[str] = mapped_column(String(200))
    service_name: Mapped[str] = mapped_column(String(200))
    origin: Mapped[str] = mapped_column(String(200))
    destination: Mapped[str] = mapped_column(String(200))
    origin_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    origin_lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    departure_time: Mapped[datetime] = mapped_column(DateTime)
    arrival_time: Mapped[datetime] = mapped_column(DateTime)
    price_inr: Mapped[float] = mapped_column(Float)
    available_seats: Mapped[int] = mapped_column(Integer, default=50)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    stops: Mapped[int] = mapped_column(Integer, default=0)
    has_accessibility: Mapped[bool] = mapped_column(Boolean, default=True)
    service_date: Mapped[str] = mapped_column(String(20))  # YYYY-MM-DD
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_alternatives_origin_dest", "origin", "destination"),
        Index("ix_alternatives_service_date", "service_date"),
    )


class TravellerConstraint(Base):
    __tablename__ = "traveller_constraints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    traveller_id: Mapped[str] = mapped_column(String(36), ForeignKey("travellers.id"))
    max_additional_budget_inr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    latest_arrival_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    preferred_transport_types: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list
    overnight_travel_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    max_transfers: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_journey_duration_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    requires_accessibility: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_departure_from: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # HH:MM
    preferred_departure_to: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    critical_booking_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    traveller: Mapped["Traveller"] = relationship("Traveller", back_populates="constraints")


class RecoveryPlan(Base):
    __tablename__ = "recovery_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    trip_id: Mapped[str] = mapped_column(String(36), ForeignKey("trips.id"))
    disruption_id: Mapped[str] = mapped_column(String(36), ForeignKey("disruptions.id"))
    status: Mapped[str] = mapped_column(SAEnum(RecoveryStatus), default=RecoveryStatus.PENDING)
    original_cost_inr: Mapped[float] = mapped_column(Float, default=0.0)
    proposed_cost_inr: Mapped[float] = mapped_column(Float, default=0.0)
    additional_cost_inr: Mapped[float] = mapped_column(Float, default=0.0)
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    alternatives_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    rejected_alternatives_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processing_log: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    trip: Mapped["Trip"] = relationship("Trip", back_populates="recovery_plans")
    disruption: Mapped["Disruption"] = relationship("Disruption", back_populates="recovery_plans")
    segments: Mapped[List["RecoverySegment"]] = relationship("RecoverySegment", back_populates="recovery_plan")
    decisions: Mapped[List["RecoveryDecision"]] = relationship("RecoveryDecision", back_populates="recovery_plan")

    __table_args__ = (
        Index("ix_recovery_plans_trip_id", "trip_id"),
        Index("ix_recovery_plans_status", "status"),
    )


class RecoverySegment(Base):
    __tablename__ = "recovery_segments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    recovery_plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("recovery_plans.id"))
    alternative_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("transport_alternatives.id"), nullable=True)
    segment_order: Mapped[int] = mapped_column(Integer)
    segment_type: Mapped[str] = mapped_column(String(50))  # transport, wait, hotel, original_disrupted
    transport_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    origin: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    departure_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    arrival_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_inr: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recovery_plan: Mapped["RecoveryPlan"] = relationship("RecoveryPlan", back_populates="segments")


class RecoveryDecision(Base):
    __tablename__ = "recovery_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    recovery_plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("recovery_plans.id"))
    decision: Mapped[str] = mapped_column(String(50))  # approved | rejected
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_simulated_change: Mapped[bool] = mapped_column(Boolean, default=True)

    recovery_plan: Mapped["RecoveryPlan"] = relationship("RecoveryPlan", back_populates="decisions")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    event_type: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_audit_events_entity_id", "entity_id"),
        Index("ix_audit_events_created_at", "created_at"),
    )

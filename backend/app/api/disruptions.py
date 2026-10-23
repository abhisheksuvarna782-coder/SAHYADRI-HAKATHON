"""
Disruption API routes — pydantic v2
"""
from __future__ import annotations
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Disruption, Booking, BookingDependency, BookingStatus, AuditEvent, Trip
from app.schemas.schemas import (
    DisruptionSimulateRequest, DisruptionRead, DisruptionWithAffected, BookingRead
)
from app.services.decision_engine import identify_affected_bookings

router = APIRouter()

VALID_DISRUPTION_TYPES = {
    "flight_cancellation", "flight_delay", "train_delay",
    "bus_cancellation", "hotel_cancellation", "train_cancellation"
}


@router.get("/disruptions", response_model=List[DisruptionRead], tags=["Disruptions"])
def list_disruptions(db: Session = Depends(get_db)):
    return db.query(Disruption).order_by(Disruption.detected_at.desc()).all()


@router.post("/disruptions/simulate", response_model=DisruptionRead, status_code=201, tags=["Disruptions"])
def simulate_disruption(body: DisruptionSimulateRequest, db: Session = Depends(get_db)):
    """
    Simulate a travel disruption.
    ⚠️ SIMULATED — no real provider API is called. No real booking is changed.
    """
    if body.disruption_type not in VALID_DISRUPTION_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid disruption_type. Must be one of: {', '.join(sorted(VALID_DISRUPTION_TYPES))}"
        )

    trip = db.query(Trip).filter_by(id=body.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")

    affected = None
    if body.affected_booking_id:
        affected = db.query(Booking).filter_by(id=body.affected_booking_id).first()
        if not affected or affected.trip_id != body.trip_id:
            raise HTTPException(status_code=404, detail="Affected booking not found for this trip.")

    disruption = Disruption(
        trip_id=body.trip_id,
        disruption_type=body.disruption_type,
        affected_booking_id=body.affected_booking_id,
        provider=body.provider,
        origin=body.origin,
        destination=body.destination,
        original_departure=body.original_departure,
        original_arrival=body.original_arrival,
        delay_minutes=body.delay_minutes,
        description=body.description,
        is_simulated=True,
        is_demo=body.is_demo,
    )
    db.add(disruption)

    if affected:
        affected.status = BookingStatus.DISRUPTED

    db.add(AuditEvent(
        event_type="disruption_simulated",
        entity_type="disruption",
        description=f"[SIMULATED] {body.disruption_type} on trip {body.trip_id}",
        metadata_json=str({
            "disruption_type": body.disruption_type,
            "affected_booking_id": body.affected_booking_id
        }),
    ))

    db.commit()
    db.refresh(disruption)
    return disruption


@router.get("/disruptions/{disruption_id}", response_model=DisruptionRead, tags=["Disruptions"])
def get_disruption(disruption_id: str, db: Session = Depends(get_db)):
    d = db.query(Disruption).filter_by(id=disruption_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Disruption not found.")
    return d


@router.get(
    "/disruptions/{disruption_id}/affected-bookings",
    response_model=DisruptionWithAffected,
    tags=["Disruptions"]
)
def get_affected_bookings(disruption_id: str, db: Session = Depends(get_db)):
    disruption = db.query(Disruption).filter_by(id=disruption_id).first()
    if not disruption:
        raise HTTPException(status_code=404, detail="Disruption not found.")

    if not disruption.trip_id:
        return DisruptionWithAffected.model_validate(disruption)

    bookings = db.query(Booking).filter_by(trip_id=disruption.trip_id).all()
    dependencies = db.query(BookingDependency).filter(
        BookingDependency.upstream_booking_id.in_([b.id for b in bookings])
    ).all()

    impact = identify_affected_bookings(disruption, bookings, dependencies)

    base = DisruptionRead.model_validate(disruption).model_dump()
    return DisruptionWithAffected(
        **base,
        directly_affected=[BookingRead.model_validate(b) for b in impact.directly_disrupted],
        potentially_affected=[BookingRead.model_validate(b) for b in impact.potentially_affected],
        confirmed_unaffected=[BookingRead.model_validate(b) for b in impact.confirmed_unaffected],
        needs_verification=[BookingRead.model_validate(b) for b in impact.needs_verification],
    )

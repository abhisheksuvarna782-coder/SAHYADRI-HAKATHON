"""
Dashboard, Constraints, and Demo routes — pydantic v2
"""
from __future__ import annotations
from typing import List, Optional
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import (
    Trip, Booking, Disruption, RecoveryPlan, TravellerConstraint,
    BookingStatus, RecoveryStatus, AuditEvent, Traveller,
)
from app.schemas.schemas import (
    DashboardMetrics, TripRead, DisruptionRead,
    TravellerConstraintCreate, TravellerConstraintRead,
    DemoScenarioResponse,
)

router = APIRouter()


def ist(year, month, day, hour, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute)


@router.get("/dashboard/metrics", response_model=DashboardMetrics, tags=["Dashboard"])
def get_dashboard_metrics(db: Session = Depends(get_db)):
    total_active = db.query(Booking).filter(
        Booking.status.in_([
            BookingStatus.CONFIRMED,
            BookingStatus.POTENTIALLY_AFFECTED,
            BookingStatus.NEEDS_VERIFICATION
        ])
    ).count()

    current_disruptions = db.query(Disruption).count()
    affected = db.query(Booking).filter(Booking.status == BookingStatus.DISRUPTED).count()
    potentially_affected = db.query(Booking).filter(
        Booking.status == BookingStatus.POTENTIALLY_AFFECTED
    ).count()
    recovery_plans_count = db.query(RecoveryPlan).count()

    cost_result = db.query(func.sum(RecoveryPlan.additional_cost_inr)).filter(
        RecoveryPlan.status.in_([RecoveryStatus.PROPOSED, RecoveryStatus.APPROVED])
    ).scalar() or 0.0

    recent_events = (
        db.query(AuditEvent)
        .order_by(AuditEvent.created_at.desc())
        .limit(10)
        .all()
    )
    recent_alerts = [
        {
            "id": ev.id,
            "event_type": ev.event_type,
            "description": ev.description,
            "timestamp": ev.created_at.isoformat(),
        }
        for ev in recent_events
    ]

    now = datetime.utcnow()
    upcoming = (
        db.query(Trip)
        .filter(Trip.departure_date >= now)
        .order_by(Trip.departure_date)
        .limit(5)
        .all()
    )
    active_disruptions = (
        db.query(Disruption)
        .order_by(Disruption.detected_at.desc())
        .limit(10)
        .all()
    )

    return DashboardMetrics(
        total_active_bookings=total_active,
        current_disruptions=current_disruptions,
        affected_reservations=affected + potentially_affected,
        recovery_plans_generated=recovery_plans_count,
        estimated_additional_cost_inr=round(cost_result, 2),
        recent_alerts=recent_alerts,
        upcoming_trips=[TripRead.model_validate(t) for t in upcoming],
        active_disruption_cases=[DisruptionRead.model_validate(d) for d in active_disruptions],
    )


# ─── Constraints ──────────────────────────────────────────────────────────────

@router.get("/constraints/{traveller_id}", response_model=TravellerConstraintRead, tags=["Constraints"])
def get_constraints(traveller_id: str, db: Session = Depends(get_db)):
    c = db.query(TravellerConstraint).filter_by(traveller_id=traveller_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="No constraints found.")
    return c


@router.post("/constraints", response_model=TravellerConstraintRead, status_code=201, tags=["Constraints"])
def create_or_update_constraints(body: TravellerConstraintCreate, db: Session = Depends(get_db)):
    traveller = db.query(Traveller).filter_by(id=body.traveller_id).first()
    if not traveller:
        raise HTTPException(status_code=404, detail="Traveller not found.")

    existing = db.query(TravellerConstraint).filter_by(traveller_id=body.traveller_id).first()

    data = body.model_dump()
    # Serialize list fields as JSON strings for SQLite storage
    if data.get("preferred_transport_types") is not None:
        data["preferred_transport_types"] = json.dumps(data["preferred_transport_types"])
    if data.get("critical_booking_ids") is not None:
        data["critical_booking_ids"] = json.dumps(data["critical_booking_ids"])

    if existing:
        for k, v in data.items():
            if k != "traveller_id":
                setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    constraint = TravellerConstraint(**data)
    db.add(constraint)
    db.commit()
    db.refresh(constraint)
    return constraint


# ─── Demo Scenario ────────────────────────────────────────────────────────────

@router.post("/demo/run", response_model=DemoScenarioResponse, tags=["Demo"])
async def run_demo_scenario(db: Session = Depends(get_db)):
    """
    One-click demo scenario — idempotent and repeatable.
    ⚠️ All changes are SIMULATED. No real bookings are modified.
    """
    from app.api.recovery import _run_recovery_engine
    from app.models.models import RecoverySegment

    trip = db.query(Trip).filter_by(id="demo-trip-001").first()
    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Demo data not seeded. Run: python scripts/seed_db.py"
        )

    flight = db.query(Booking).filter_by(id="demo-booking-flight-001").first()
    if not flight:
        raise HTTPException(status_code=404, detail="Demo flight booking not found.")

    # Reset for repeatability
    flight.status = BookingStatus.DISRUPTED

    existing_disruption = db.query(Disruption).filter_by(
        trip_id=trip.id,
        affected_booking_id=flight.id,
        disruption_type="flight_cancellation",
    ).first()

    if existing_disruption:
        disruption = existing_disruption
    else:
        disruption = Disruption(
            trip_id=trip.id,
            disruption_type="flight_cancellation",
            affected_booking_id=flight.id,
            provider="IndiGo Airlines",
            origin="Mangalore (IXE)",
            destination="Bengaluru (BLR)",
            original_departure=ist(2026, 10, 18, 9, 0),
            original_arrival=ist(2026, 10, 18, 10, 10),
            description=(
                "[SIMULATED] IndiGo flight 6E-2941 cancelled due to operational reasons. "
                "This is a demo simulation — no real booking was changed."
            ),
            is_simulated=True,
            is_demo=True,
        )
        db.add(disruption)
        db.commit()
        db.refresh(disruption)

    existing_plan = db.query(RecoveryPlan).filter_by(
        trip_id=trip.id,
        disruption_id=disruption.id,
    ).first()

    if existing_plan:
        db.query(RecoverySegment).filter_by(recovery_plan_id=existing_plan.id).delete()
        existing_plan.status = RecoveryStatus.PENDING
        db.commit()
        await _run_recovery_engine(existing_plan.id, db)
        plan_id = existing_plan.id
    else:
        plan = RecoveryPlan(
            trip_id=trip.id,
            disruption_id=disruption.id,
            status=RecoveryStatus.PENDING,
            original_cost_inr=flight.price_inr,
            is_demo=True,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        await _run_recovery_engine(plan.id, db)
        plan_id = plan.id

    db.add(AuditEvent(
        event_type="demo_scenario_run",
        entity_type="demo",
        entity_id=trip.id,
        description="Demo scenario run: IndiGo 6E-2941 flight cancellation Mangalore → Bengaluru",
    ))
    db.commit()

    return DemoScenarioResponse(
        trip_id=trip.id,
        disruption_id=disruption.id,
        recovery_plan_id=plan_id,
        message="Demo scenario loaded. IndiGo 6E-2941 cancelled — recovery plan generated.",
    )

"""
Recovery Plan API routes — pydantic v1 compatible
"""
from __future__ import annotations
from typing import List, Optional
import json
import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import (
    RecoveryPlan, RecoverySegment, RecoveryDecision,
    Disruption, Booking, BookingDependency, TravellerConstraint,
    TransportAlternative, Trip, BookingStatus, RecoveryStatus, AuditEvent,
)
from app.schemas.schemas import (
    RecoveryGenerateRequest, RecoveryPlanRead, RecoveryPlanDetail,
    RecoveryApproveRequest, RecoveryRejectRequest, RecoveryDecisionRead,
    AlternativeOption, RejectedAlternative, RecoverySegmentRead,
    DisruptionRead, BookingRead,
)
from app.services.decision_engine import (
    identify_affected_bookings,
    find_alternative_candidates,
    apply_hard_constraints,
    score_alternatives,
    calculate_itinerary,
    generate_deterministic_explanation,
    build_processing_stages,
)
from app.services.ai.ai_service import get_ai_explanation

router = APIRouter()


def _build_recovery_detail(plan: RecoveryPlan, db: Session) -> RecoveryPlanDetail:
    alternatives = []
    rejected_alternatives = []

    if plan.alternatives_json:
        try:
            raw = json.loads(plan.alternatives_json)
            alternatives = [AlternativeOption(**a) for a in raw]
        except Exception:
            pass

    if plan.rejected_alternatives_json:
        try:
            raw = json.loads(plan.rejected_alternatives_json)
            rejected_alternatives = [RejectedAlternative(**r) for r in raw]
        except Exception:
            pass

    segments = [RecoverySegmentRead.model_validate(s) for s in plan.segments]

    disruption = db.query(Disruption).filter_by(id=plan.disruption_id).first()
    disruption_read = DisruptionRead.model_validate(disruption) if disruption else None

    bookings = db.query(Booking).filter_by(trip_id=plan.trip_id).all()
    dependencies = db.query(BookingDependency).filter(
        BookingDependency.upstream_booking_id.in_([b.id for b in bookings])
    ).all()

    affected = []
    potentially = []
    if disruption:
        impact = identify_affected_bookings(disruption, bookings, dependencies)
        affected = [BookingRead.model_validate(b) for b in impact.directly_disrupted]
        potentially = [BookingRead.model_validate(b) for b in impact.potentially_affected]

    required_actions = []
    stages = []
    if plan.processing_log:
        try:
            log = json.loads(plan.processing_log)
            required_actions = log.get("required_actions", [])
            stages = log.get("stages", [])
        except Exception:
            pass

    base = RecoveryPlanRead.model_validate(plan).model_dump()
    return RecoveryPlanDetail(
        **base,
        alternatives=alternatives,
        rejected_alternatives=rejected_alternatives,
        segments=segments,
        disruption=disruption_read,
        affected_bookings=affected,
        potentially_affected_bookings=potentially,
        required_actions=required_actions,
        processing_stages=stages,
    )


async def _run_recovery_engine(plan_id: str, db: Session):
    plan = db.query(RecoveryPlan).filter_by(id=plan_id).first()
    if not plan:
        return

    plan.status = RecoveryStatus.PROCESSING
    db.commit()

    disruption = db.query(Disruption).filter_by(id=plan.disruption_id).first()
    if not disruption:
        plan.status = RecoveryStatus.EXPIRED
        db.commit()
        return

    bookings = db.query(Booking).filter_by(trip_id=plan.trip_id).all()
    dependencies = db.query(BookingDependency).filter(
        BookingDependency.upstream_booking_id.in_([b.id for b in bookings])
    ).all()

    impact = identify_affected_bookings(disruption, bookings, dependencies)
    disrupted_booking = next(
        (b for b in bookings if b.id == disruption.affected_booking_id), None
    )

    all_alts = db.query(TransportAlternative).all()
    candidates = find_alternative_candidates(disrupted_booking or disruption, all_alts)

    constraint = None
    if disrupted_booking and disrupted_booking.trip_id:
        trip = db.query(Trip).filter_by(id=disrupted_booking.trip_id).first()
        if trip:
            constraint = db.query(TravellerConstraint).filter_by(
                traveller_id=trip.traveller_id
            ).first()

    original_cost = disrupted_booking.price_inr if disrupted_booking else 0.0
    plan.original_cost_inr = original_cost

    feasible, rejected = apply_hard_constraints(candidates, original_cost, constraint)
    feasible = score_alternatives(feasible, original_cost, constraint)

    itinerary = {}
    best_alternative = None
    if feasible:
        best_alternative = feasible[0]
        itinerary = calculate_itinerary(disruption, disrupted_booking, best_alternative, bookings, impact)
        plan.proposed_cost_inr = best_alternative.alt.price_inr
        plan.additional_cost_inr = itinerary["additional_cost_inr"]

    # Serialize alternatives
    alternatives_out = []
    for s in feasible:
        alternatives_out.append({
            "id": s.alt.id,
            "rank": s.rank,
            "rank_label": s.rank_label,
            "transport_type": str(s.alt.transport_type),
            "provider": s.alt.provider,
            "service_name": s.alt.service_name,
            "origin": s.alt.origin,
            "destination": s.alt.destination,
            "departure_time": s.alt.departure_time.isoformat(),
            "arrival_time": s.alt.arrival_time.isoformat(),
            "duration_minutes": s.alt.duration_minutes,
            "price_inr": s.alt.price_inr,
            "additional_cost_inr": s.additional_cost_inr,
            "available_seats": s.alt.available_seats,
            "stops": s.alt.stops,
            "has_accessibility": s.alt.has_accessibility,
            "meets_deadline": s.meets_deadline,
            "meets_budget": s.meets_budget,
            "meets_max_transfers": s.meets_max_transfers,
            "meets_journey_duration": s.meets_journey_duration,
            "meets_overnight_constraint": s.meets_overnight,
            "feasibility_issues": s.feasibility_issues,
            "score": s.score,
            "score_breakdown": s.score_breakdown,
            "explanation": (
                f"Ranked #{s.rank} ({s.rank_label.replace('_', ' ').title()}). "
                f"Score: {s.score:.2f}/1.0. "
                f"Departs {s.alt.departure_time.strftime('%H:%M')}, arrives {s.alt.arrival_time.strftime('%H:%M')}. "
                f"Additional cost: ₹{s.additional_cost_inr:,.0f}."
            ),
        })

    rejected_out = []
    for r in rejected:
        rejected_out.append({
            "id": r.alt.id,
            "transport_type": str(r.alt.transport_type),
            "provider": r.alt.provider,
            "service_name": r.alt.service_name,
            "departure_time": r.alt.departure_time.isoformat(),
            "arrival_time": r.alt.arrival_time.isoformat(),
            "price_inr": r.alt.price_inr,
            "additional_cost_inr": r.additional_cost_inr,
            "rejection_reasons": r.reasons,
        })

    plan.alternatives_json = json.dumps(alternatives_out)
    plan.rejected_alternatives_json = json.dumps(rejected_out)

    # AI explanation
    explanation = None
    if best_alternative:
        disruption_summary = (
            f"{disruption.disruption_type} from {disruption.origin} to {disruption.destination}"
        )
        constraint_summary = (
            f"Max extra budget: ₹{constraint.max_additional_budget_inr:,.0f}, "
            f"Deadline: {constraint.latest_arrival_time.strftime('%H:%M') if constraint.latest_arrival_time else 'None'}"
        ) if constraint else "No constraints"

        explanation = await get_ai_explanation(
            disruption_summary=disruption_summary,
            alternatives_json=json.dumps(alternatives_out[:3]),
            itinerary_summary=json.dumps(itinerary, default=str),
            constraint_summary=constraint_summary,
        )

    if not explanation:
        if best_alternative:
            explanation = generate_deterministic_explanation(
                disruption, impact, best_alternative, rejected, itinerary, constraint
            )
        else:
            explanation = (
                "## No Compliant Options Found\n\n"
                f"The recovery engine found {len(rejected)} candidate(s) but none satisfied all hard constraints.\n\n"
                "**Rejected options:**\n" +
                "\n".join(
                    f"- {r['service_name']}: {'; '.join(r['rejection_reasons'])}"
                    for r in rejected_out
                ) +
                "\n\nConsider relaxing your constraints and regenerating the plan."
            )

    plan.ai_explanation = explanation

    # Save segments
    if best_alternative:
        existing_count = db.query(RecoverySegment).filter_by(recovery_plan_id=plan_id).count()
        if existing_count == 0:
            for seg_data in itinerary.get("segments", []):
                seg = RecoverySegment(
                    recovery_plan_id=plan_id,
                    alternative_id=seg_data.get("alternative_id"),
                    segment_order=seg_data["segment_order"],
                    segment_type=seg_data["segment_type"],
                    transport_type=seg_data.get("transport_type"),
                    provider=seg_data.get("provider"),
                    origin=seg_data.get("origin"),
                    destination=seg_data.get("destination"),
                    departure_time=seg_data.get("departure_time"),
                    arrival_time=seg_data.get("arrival_time"),
                    duration_minutes=seg_data.get("duration_minutes"),
                    price_inr=seg_data.get("price_inr", 0.0),
                    notes=seg_data.get("notes"),
                )
                db.add(seg)

    stages = build_processing_stages(
        impact, len(candidates), len(feasible), len(rejected), constraint is not None
    )
    plan.processing_log = json.dumps({
        "stages": stages,
        "required_actions": itinerary.get("required_actions", []),
    })
    plan.status = RecoveryStatus.PROPOSED
    db.commit()


@router.post("/recovery/generate", response_model=RecoveryPlanDetail, status_code=201, tags=["Recovery"])
async def generate_recovery(body: RecoveryGenerateRequest, db: Session = Depends(get_db)):
    existing = db.query(RecoveryPlan).filter_by(
        trip_id=body.trip_id,
        disruption_id=body.disruption_id,
        status=RecoveryStatus.PROPOSED,
    ).first()
    if existing:
        db.query(RecoverySegment).filter_by(recovery_plan_id=existing.id).delete()
        existing.status = RecoveryStatus.PENDING
        db.commit()
        await _run_recovery_engine(existing.id, db)
        db.refresh(existing)
        return _build_recovery_detail(existing, db)

    trip = db.query(Trip).filter_by(id=body.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")

    disruption = db.query(Disruption).filter_by(id=body.disruption_id).first()
    if not disruption:
        raise HTTPException(status_code=404, detail="Disruption not found.")

    disrupted_booking = None
    if disruption.affected_booking_id:
        disrupted_booking = db.query(Booking).filter_by(id=disruption.affected_booking_id).first()

    plan = RecoveryPlan(
        trip_id=body.trip_id,
        disruption_id=body.disruption_id,
        status=RecoveryStatus.PENDING,
        original_cost_inr=disrupted_booking.price_inr if disrupted_booking else 0.0,
        is_demo=trip.is_demo,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    await _run_recovery_engine(plan.id, db)
    db.refresh(plan)
    return _build_recovery_detail(plan, db)


@router.get("/recovery/history", response_model=List[RecoveryPlanRead], tags=["Recovery"])
def recovery_history(db: Session = Depends(get_db)):
    return db.query(RecoveryPlan).order_by(RecoveryPlan.created_at.desc()).limit(50).all()


@router.get("/recovery/{recovery_id}", response_model=RecoveryPlanDetail, tags=["Recovery"])
def get_recovery(recovery_id: str, db: Session = Depends(get_db)):
    plan = db.query(RecoveryPlan).filter_by(id=recovery_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found.")
    return _build_recovery_detail(plan, db)


@router.post("/recovery/{recovery_id}/regenerate", response_model=RecoveryPlanDetail, tags=["Recovery"])
async def regenerate_recovery(recovery_id: str, db: Session = Depends(get_db)):
    plan = db.query(RecoveryPlan).filter_by(id=recovery_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found.")
    db.query(RecoverySegment).filter_by(recovery_plan_id=recovery_id).delete()
    plan.status = RecoveryStatus.PENDING
    db.commit()
    await _run_recovery_engine(recovery_id, db)
    db.refresh(plan)
    return _build_recovery_detail(plan, db)


@router.post("/recovery/{recovery_id}/approve", response_model=RecoveryDecisionRead, tags=["Recovery"])
def approve_recovery(recovery_id: str, body: RecoveryApproveRequest, db: Session = Depends(get_db)):
    plan = db.query(RecoveryPlan).filter_by(id=recovery_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found.")
    if plan.status not in [RecoveryStatus.PROPOSED, RecoveryStatus.PENDING]:
        raise HTTPException(status_code=400, detail=f"Cannot approve plan in status '{plan.status}'.")

    plan.status = RecoveryStatus.APPROVED
    plan.decided_at = datetime.utcnow()
    plan.decision_reason = body.reason

    decision = RecoveryDecision(
        recovery_plan_id=recovery_id,
        decision="approved",
        reason=body.reason,
        is_simulated_change=True,
    )
    db.add(decision)
    db.add(AuditEvent(
        event_type="recovery_approved",
        entity_type="recovery_plan",
        entity_id=recovery_id,
        description="[SIMULATED] Recovery plan approved. No real booking changes were made.",
        metadata_json=json.dumps({"selected_alternative_id": body.selected_alternative_id}),
    ))
    db.commit()
    db.refresh(decision)
    return decision


@router.post("/recovery/{recovery_id}/reject", response_model=RecoveryDecisionRead, tags=["Recovery"])
def reject_recovery(recovery_id: str, body: RecoveryRejectRequest, db: Session = Depends(get_db)):
    plan = db.query(RecoveryPlan).filter_by(id=recovery_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Recovery plan not found.")
    if plan.status not in [RecoveryStatus.PROPOSED, RecoveryStatus.PENDING]:
        raise HTTPException(status_code=400, detail=f"Cannot reject plan in status '{plan.status}'.")

    plan.status = RecoveryStatus.REJECTED
    plan.decided_at = datetime.utcnow()
    plan.decision_reason = body.reason

    decision = RecoveryDecision(
        recovery_plan_id=recovery_id,
        decision="rejected",
        reason=body.reason,
        is_simulated_change=True,
    )
    db.add(decision)
    db.add(AuditEvent(
        event_type="recovery_rejected",
        entity_type="recovery_plan",
        entity_id=recovery_id,
        description="Recovery plan rejected by traveller.",
        metadata_json=json.dumps({"reason": body.reason}),
    ))
    db.commit()
    db.refresh(decision)
    return decision

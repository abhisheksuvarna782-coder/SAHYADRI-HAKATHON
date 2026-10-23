"""
Assistant chat route — pydantic v2
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.models.models import RecoveryPlan, Trip
from app.schemas.schemas import AssistantChatRequest, AssistantChatResponse
from app.services.ai.ai_service import chat_with_assistant as ai_chat

router = APIRouter()


@router.post("/assistant/chat", response_model=AssistantChatResponse, tags=["Assistant"])
async def chat_with_assistant(body: AssistantChatRequest, db: Session = Depends(get_db)):
    """
    Chat with the AI travel recovery assistant.
    Falls back to deterministic responses if no AI provider is configured.
    """
    recovery_plan_data = None
    trip_data = None

    if body.recovery_plan_id:
        plan = db.query(RecoveryPlan).filter_by(id=body.recovery_plan_id).first()
        if plan:
            try:
                alts = json.loads(plan.alternatives_json or "[]")
                recovery_plan_data = {
                    "id": plan.id,
                    "status": str(plan.status),
                    "ai_explanation": plan.ai_explanation or "",
                    "original_cost_inr": plan.original_cost_inr,
                    "proposed_cost_inr": plan.proposed_cost_inr,
                    "additional_cost_inr": plan.additional_cost_inr,
                    "alternatives": alts,
                }
            except Exception:
                pass

    if body.trip_id:
        trip = db.query(Trip).filter_by(id=body.trip_id).first()
        if trip:
            trip_data = {
                "id": trip.id,
                "name": trip.name,
                "origin": trip.origin,
                "destination": trip.destination,
            }

    response, updated_constraints, trigger_regenerate = await ai_chat(
        message=body.message,
        recovery_plan=recovery_plan_data,
        trip=trip_data,
        history=[m.model_dump() for m in body.history],
    )

    return AssistantChatResponse(
        response=response,
        updated_constraints=updated_constraints,
        trigger_regenerate=trigger_regenerate,
        clarification_needed=False,
    )

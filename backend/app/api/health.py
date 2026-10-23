"""
Health check route
"""
from fastapi import APIRouter
from datetime import datetime
from app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "app": settings.APP_NAME,
        "ai_provider": settings.AI_PROVIDER,
    }

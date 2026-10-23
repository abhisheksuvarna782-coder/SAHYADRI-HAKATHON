"""
RouteRecover AI — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.api import health, trips, disruptions, recovery, assistant, dashboard

# Configure logging
logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "AI-powered travel disruption recovery agent. "
            "Detects disruptions, identifies affected bookings, evaluates alternatives, "
            "and generates a revised recovery itinerary. "
            "⚠️ All booking changes in demo mode are SIMULATED — no real provider changes are made."
        ),
        version=settings.APP_VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ─── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Create tables on startup ──────────────────────────────────────────────
    @app.on_event("startup")
    async def startup():
        Base.metadata.create_all(bind=engine)
        logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} started")
        logger.info(f"   AI Provider: {settings.AI_PROVIDER}")
        logger.info(f"   Database driver: {engine.dialect.name}")

    # ─── Routers ──────────────────────────────────────────────────────────────
    prefix = "/api"
    app.include_router(health.router, prefix=prefix)
    app.include_router(trips.router, prefix=prefix)
    app.include_router(disruptions.router, prefix=prefix)
    app.include_router(recovery.router, prefix=prefix)
    app.include_router(assistant.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)

    # ─── Global exception handler ─────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred. Please try again."},
        )

    return app


app = create_app()

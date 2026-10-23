"""
RouteRecover AI — Backend Tests

Tests cover:
- Cancellation event creation
- Affected booking identification
- Hard constraint filtering (budget, deadline, transfers, overnight)
- Alternative ranking and scoring
- Cost calculations
- No-compliant-option scenarios
- Demo initialization repeatability
- Approval/rejection workflows
- Invalid API requests
"""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import List
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic import ValidationError

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import Settings, settings
from app.core.database import Base, get_db
from app.main import app
from app.models.models import (
    Traveller, Trip, Booking, BookingDependency, Disruption,
    TransportAlternative, TravellerConstraint, RecoveryPlan,
    TransportType, BookingStatus, BookingType, RecoveryStatus
)
from app.services.decision_engine import (
    identify_affected_bookings,
    find_alternative_candidates,
    apply_hard_constraints,
    score_alternatives,
    calculate_itinerary,
    generate_deterministic_explanation,
    ImpactResult, ScoredAlternative, RejectedCandidate,
)


# ─── Test Database Setup ──────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///./test_routerecover.db"

test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


# ─── Fixtures ──────────────────────────────────────────────────────────────────

def make_traveller(db, email="test@example.com"):
    t = Traveller(name="Test User", email=email, is_demo=True)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def make_trip(db, traveller_id, origin="Mangalore", dest="Bengaluru"):
    trip = Trip(
        traveller_id=traveller_id,
        name=f"{origin} to {dest} Trip",
        origin=origin,
        destination=dest,
        departure_date=datetime(2026, 10, 18, 8, 0),
        is_demo=True,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def make_flight(db, trip_id, status=BookingStatus.CONFIRMED, price=3500.0):
    b = Booking(
        trip_id=trip_id,
        booking_type=BookingType.TRANSPORT,
        transport_type=TransportType.FLIGHT,
        reference="TEST-FL-001",
        provider="IndiGo",
        origin="Mangalore",
        destination="Bengaluru",
        departure_time=datetime(2026, 10, 18, 9, 0),
        arrival_time=datetime(2026, 10, 18, 10, 10),
        price_inr=price,
        status=status,
        is_demo=True,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def make_hotel(db, trip_id):
    b = Booking(
        trip_id=trip_id,
        booking_type=BookingType.HOTEL,
        reference="HTL-001",
        provider="Grand Hotel",
        destination="Bengaluru",
        arrival_time=datetime(2026, 10, 18, 14, 0),
        price_inr=5000.0,
        status=BookingStatus.CONFIRMED,
        is_demo=True,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def make_connecting(db, trip_id):
    b = Booking(
        trip_id=trip_id,
        booking_type=BookingType.TRANSPORT,
        transport_type=TransportType.TRAIN,
        reference="TRN-001",
        provider="Indian Railways",
        origin="Bengaluru",
        destination="Mysuru",
        departure_time=datetime(2026, 10, 18, 17, 0),
        arrival_time=datetime(2026, 10, 18, 19, 30),
        price_inr=450.0,
        status=BookingStatus.CONFIRMED,
        is_demo=True,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def make_disruption(db, trip_id, booking_id, disruption_type="flight_cancellation"):
    d = Disruption(
        trip_id=trip_id,
        disruption_type=disruption_type,
        affected_booking_id=booking_id,
        provider="IndiGo",
        origin="Mangalore",
        destination="Bengaluru",
        original_departure=datetime(2026, 10, 18, 9, 0),
        original_arrival=datetime(2026, 10, 18, 10, 10),
        is_simulated=True,
        is_demo=True,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def make_constraint(db, traveller_id, max_budget=1500.0, latest_arrival_hour=16):
    c = TravellerConstraint(
        traveller_id=traveller_id,
        max_additional_budget_inr=max_budget,
        latest_arrival_time=datetime(2026, 10, 18, latest_arrival_hour, 0),
        overnight_travel_ok=False,
        max_transfers=1,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def make_alternative(db, transport_type=TransportType.TRAIN, price=4800.0,
                      arrival_hour=13, arrival_minute=30, stops=1,
                      dep_hour=7, dep_minute=30):
    a = TransportAlternative(
        transport_type=transport_type,
        provider="Indian Railways",
        service_name="Express 001",
        origin="Mangalore",
        destination="Bengaluru",
        departure_time=datetime(2026, 10, 18, dep_hour, dep_minute),
        arrival_time=datetime(2026, 10, 18, arrival_hour, arrival_minute),
        price_inr=price,
        available_seats=40,
        duration_minutes=(arrival_hour * 60 + arrival_minute) - (dep_hour * 60 + dep_minute),
        stops=stops,
        has_accessibility=True,
        service_date="2026-10-18",
        is_demo=True,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


# ─── Tests: Disruption Creation ───────────────────────────────────────────────

def test_create_disruption_via_api(client, db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)

    payload = {
        "trip_id": trip.id,
        "disruption_type": "flight_cancellation",
        "affected_booking_id": flight.id,
        "provider": "IndiGo",
        "origin": "Mangalore",
        "destination": "Bengaluru",
        "is_demo": True,
    }
    resp = client.post("/api/disruptions/simulate", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["disruption_type"] == "flight_cancellation"
    assert data["is_simulated"] == True


def test_cancellation_updates_booking_status(client, db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)

    payload = {
        "trip_id": trip.id,
        "disruption_type": "flight_cancellation",
        "affected_booking_id": flight.id,
        "is_demo": True,
    }
    client.post("/api/disruptions/simulate", json=payload)

    db.refresh(flight)
    assert flight.status == BookingStatus.DISRUPTED


# ─── Tests: Affected Booking Identification ───────────────────────────────────

def test_identify_directly_disrupted(db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)
    disruption = make_disruption(db, trip.id, flight.id)

    bookings = [flight]
    deps = []
    result = identify_affected_bookings(disruption, bookings, deps)

    assert flight in result.directly_disrupted
    assert len(result.potentially_affected) == 0


def test_identify_hotel_potentially_affected(db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)
    hotel = make_hotel(db, trip.id)
    disruption = make_disruption(db, trip.id, flight.id)

    dep = BookingDependency(
        upstream_booking_id=flight.id,
        dependent_booking_id=hotel.id,
        dependency_type="hotel_checkin",
    )
    db.add(dep)
    db.commit()

    bookings = [flight, hotel]
    deps = [dep]
    result = identify_affected_bookings(disruption, bookings, deps)

    assert flight in result.directly_disrupted
    assert hotel in result.potentially_affected


def test_identify_connecting_journey_affected(db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)
    connecting = make_connecting(db, trip.id)
    disruption = make_disruption(db, trip.id, flight.id)

    dep = BookingDependency(
        upstream_booking_id=flight.id,
        dependent_booking_id=connecting.id,
        dependency_type="connection",
        min_connection_minutes=60,
    )
    db.add(dep)
    db.commit()

    bookings = [flight, connecting]
    deps = [dep]
    result = identify_affected_bookings(disruption, bookings, deps)

    assert flight in result.directly_disrupted
    assert connecting in result.potentially_affected


def test_unaffected_bookings_classified(db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)
    hotel = make_hotel(db, trip.id)  # no dependency
    disruption = make_disruption(db, trip.id, flight.id)

    bookings = [flight, hotel]
    result = identify_affected_bookings(disruption, bookings, [])

    assert flight in result.directly_disrupted
    assert hotel in result.confirmed_unaffected


# ─── Tests: Hard Constraint Filtering ────────────────────────────────────────

def test_budget_constraint_rejects_expensive_option(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=1500.0)
    # Alternative costs ₹7200 vs original ₹3500 → extra ₹3700 > ₹1500
    alt = make_alternative(db, price=7200.0, arrival_hour=12, dep_hour=11)
    original_cost = 3500.0
    feasible, rejected = apply_hard_constraints([alt], original_cost, constraint)

    assert len(feasible) == 0
    assert len(rejected) == 1
    assert any("budget" in r.lower() for r in rejected[0].reasons)


def test_budget_constraint_accepts_compliant_option(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=1500.0)
    # ₹4800 - ₹3500 = ₹1300 ≤ ₹1500
    alt = make_alternative(db, price=4800.0, arrival_hour=13, dep_hour=7)
    feasible, rejected = apply_hard_constraints([alt], 3500.0, constraint)

    assert len(feasible) == 1
    assert len(rejected) == 0


def test_deadline_constraint_rejects_late_option(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, latest_arrival_hour=16)  # Must arrive by 4 PM
    # Alt arrives at 6 PM
    alt = make_alternative(db, price=4200.0, arrival_hour=18, dep_hour=10)
    feasible, rejected = apply_hard_constraints([alt], 3500.0, constraint)

    assert len(feasible) == 0
    assert any("late" in r.lower() or "after" in r.lower() or "deadline" in r.lower() or "arrive" in r.lower()
               for r in rejected[0].reasons)


def test_deadline_constraint_accepts_on_time_option(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, latest_arrival_hour=16)
    alt = make_alternative(db, price=4800.0, arrival_hour=13, dep_hour=7)
    feasible, rejected = apply_hard_constraints([alt], 3500.0, constraint)

    assert len(feasible) == 1
    assert feasible[0].meets_deadline == True


def test_max_transfers_constraint(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=9999.0)
    constraint.max_transfers = 1
    db.commit()
    # Alt with 3 stops — exceeds max_transfers=1
    alt = make_alternative(db, stops=3, price=3800.0, arrival_hour=14, dep_hour=6)
    feasible, rejected = apply_hard_constraints([alt], 3500.0, constraint)

    assert len(feasible) == 0
    assert any("stop" in r.lower() or "transfer" in r.lower() for r in rejected[0].reasons)


def test_max_journey_duration_constraint(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=9999.0)
    constraint.max_journey_duration_hours = 5
    db.commit()
    alt = make_alternative(db, price=3800.0, arrival_hour=13, dep_hour=7)
    feasible, rejected = apply_hard_constraints([alt], 3500.0, constraint)

    assert len(feasible) == 0
    assert len(rejected) == 1
    assert any("duration" in reason.lower() for reason in rejected[0].reasons)


def test_overnight_travel_constraint(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=9999.0)
    constraint.overnight_travel_ok = False
    db.commit()
    # Alt departs 10 PM, arrives next day
    overnight_alt = TransportAlternative(
        transport_type=TransportType.BUS,
        provider="Night Bus Co",
        service_name="Night Sleeper",
        origin="Mangalore",
        destination="Bengaluru",
        departure_time=datetime(2026, 10, 18, 22, 0),
        arrival_time=datetime(2026, 10, 19, 6, 0),  # Next day
        price_inr=3800.0,
        available_seats=20,
        duration_minutes=480,
        stops=0,
        has_accessibility=True,
        service_date="2026-10-18",
    )
    db.add(overnight_alt)
    db.commit()
    db.refresh(overnight_alt)

    feasible, rejected = apply_hard_constraints([overnight_alt], 3500.0, constraint)
    assert len(feasible) == 0
    assert any("overnight" in r.lower() for r in rejected[0].reasons)


def test_no_compliant_options(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=100.0, latest_arrival_hour=8)
    alt = make_alternative(db, price=7200.0, arrival_hour=18, dep_hour=11)
    feasible, rejected = apply_hard_constraints([alt], 3500.0, constraint)
    assert len(feasible) == 0
    assert len(rejected) == 1


# ─── Tests: Alternative Ranking ──────────────────────────────────────────────

def test_alternatives_ranked_by_score(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=9999.0)
    alts = [
        make_alternative(db, price=4800.0, arrival_hour=13, dep_hour=7, stops=1),
        make_alternative(db, price=5200.0, arrival_hour=15, dep_hour=8, stops=0),
        make_alternative(db, price=7200.0, arrival_hour=12, dep_hour=11, stops=0),
    ]
    feasible, _ = apply_hard_constraints(alts, 3500.0, constraint)
    scored = score_alternatives(feasible, 3500.0, constraint)
    assert len(scored) == 3
    # Verify descending score order
    for i in range(len(scored) - 1):
        assert scored[i].score >= scored[i + 1].score


def test_rank_labels_assigned(db):
    t = make_traveller(db)
    constraint = make_constraint(db, t.id, max_budget=9999.0)
    alts = [
        make_alternative(db, price=4800.0, arrival_hour=13, dep_hour=7, stops=1),
        make_alternative(db, price=5200.0, arrival_hour=12, dep_hour=8, stops=0),
    ]
    feasible, _ = apply_hard_constraints(alts, 3500.0, constraint)
    scored = score_alternatives(feasible, 3500.0, constraint)
    labels = [s.rank_label for s in scored]
    assert "best_overall" in labels


# ─── Tests: Cost Calculations ─────────────────────────────────────────────────

def test_additional_cost_calculation(db):
    t = make_traveller(db)
    alt = make_alternative(db, price=4800.0, arrival_hour=13, dep_hour=7)
    scored = ScoredAlternative(alt, 3500.0)
    assert scored.additional_cost_inr == pytest.approx(1300.0, abs=0.01)


def test_negative_additional_cost_when_cheaper(db):
    t = make_traveller(db)
    alt = make_alternative(db, price=2000.0, arrival_hour=13, dep_hour=7)
    scored = ScoredAlternative(alt, 3500.0)
    assert scored.additional_cost_inr == pytest.approx(-1500.0, abs=0.01)


# ─── Tests: AI Fallback ───────────────────────────────────────────────────────

def test_deterministic_explanation_no_ai():
    """Test that deterministic explanation works without AI."""
    from app.services.ai.ai_service import _deterministic_chat_response
    response, constraints, regen = _deterministic_chat_response(
        "Why was this option recommended?",
        recovery_plan={
            "ai_explanation": "This option was selected...",
            "alternatives": []
        },
        trip={"name": "Test Trip"},
    )
    assert len(response) > 0
    assert "recommend" in response.lower() or "score" in response.lower() or "option" in response.lower()


def test_deterministic_cheapest_response():
    from app.services.ai.ai_service import _deterministic_chat_response
    response, _, _ = _deterministic_chat_response(
        "Find a cheaper option",
        recovery_plan={
            "alternatives": [
                {"service_name": "Express 001", "transport_type": "train",
                 "price_inr": 4000, "additional_cost_inr": 500,
                 "departure_time": "2026-10-18T07:30:00",
                 "arrival_time": "2026-10-18T13:30:00", "duration_minutes": 360},
            ]
        },
        trip={"name": "Test Trip"},
    )
    assert "4,000" in response or "4000" in response or "express" in response.lower()


# ─── Tests: API Validation ────────────────────────────────────────────────────

def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_invalid_disruption_type(client, db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)

    payload = {
        "trip_id": trip.id,
        "disruption_type": "INVALID_TYPE",  # Invalid enum value
        "affected_booking_id": flight.id,
        "is_demo": True,
    }
    resp = client.post("/api/disruptions/simulate", json=payload)
    assert resp.status_code == 422


def test_disruption_requires_existing_trip(client):
    resp = client.post("/api/disruptions/simulate", json={
        "trip_id": "missing-trip",
        "disruption_type": "flight_cancellation",
    })
    assert resp.status_code == 404


def test_disruption_booking_must_belong_to_trip(client, db):
    traveller = make_traveller(db)
    trip = make_trip(db, traveller.id)
    other_trip = make_trip(db, traveller.id, origin="Delhi", dest="Mumbai")
    booking = make_flight(db, other_trip.id)

    resp = client.post("/api/disruptions/simulate", json={
        "trip_id": trip.id,
        "disruption_type": "flight_cancellation",
        "affected_booking_id": booking.id,
    })
    assert resp.status_code == 404


def test_constraints_require_existing_traveller(client):
    resp = client.post("/api/constraints", json={
        "traveller_id": "missing-traveller",
    })
    assert resp.status_code == 404


def test_assistant_uses_fallback_without_ai_credentials(client, monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")

    resp = client.post("/api/assistant/chat", json={
        "message": "Hello",
        "history": [],
    })
    assert resp.status_code == 200
    assert "run a recovery scenario" in resp.json()["response"].lower()


def test_production_settings_reject_sqlite():
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="a-production-secret",
            DATABASE_URL="sqlite:///./routerecover.db",
        )


def test_trip_not_found(client):
    resp = client.get("/api/trips/nonexistent-id-12345")
    assert resp.status_code == 404


def test_recovery_not_found(client):
    resp = client.get("/api/recovery/nonexistent-plan-id")
    assert resp.status_code == 404


def test_approve_nonexistent_plan(client):
    resp = client.post("/api/recovery/nonexistent-id/approve", json={})
    assert resp.status_code == 404


# ─── Tests: Approval and Rejection Workflows ─────────────────────────────────

def test_full_recovery_approval_workflow(client, db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)
    disruption = make_disruption(db, trip.id, flight.id)
    make_alternative(db, price=4800.0, arrival_hour=13, dep_hour=7)

    # Generate recovery
    payload = {"trip_id": trip.id, "disruption_id": disruption.id}
    gen_resp = client.post("/api/recovery/generate", json=payload)
    assert gen_resp.status_code == 201
    plan_id = gen_resp.json()["id"]

    # Approve
    approve_resp = client.post(f"/api/recovery/{plan_id}/approve", json={"reason": "Test approval"})
    assert approve_resp.status_code == 200
    assert approve_resp.json()["decision"] == "approved"

    # Verify plan status
    plan_resp = client.get(f"/api/recovery/{plan_id}")
    assert plan_resp.json()["status"] == "approved"


def test_full_recovery_rejection_workflow(client, db):
    t = make_traveller(db)
    trip = make_trip(db, t.id)
    flight = make_flight(db, trip.id)
    disruption = make_disruption(db, trip.id, flight.id)
    make_alternative(db, price=4800.0, arrival_hour=13, dep_hour=7)

    payload = {"trip_id": trip.id, "disruption_id": disruption.id}
    gen_resp = client.post("/api/recovery/generate", json=payload)
    plan_id = gen_resp.json()["id"]

    reject_resp = client.post(f"/api/recovery/{plan_id}/reject", json={"reason": "Not suitable"})
    assert reject_resp.status_code == 200
    assert reject_resp.json()["decision"] == "rejected"

    plan_resp = client.get(f"/api/recovery/{plan_id}")
    assert plan_resp.json()["status"] == "rejected"


# ─── Tests: Demo Repeatability ────────────────────────────────────────────────

def test_demo_scenario_requires_seed_data(client):
    """Without seeded data, demo endpoint returns 404."""
    resp = client.post("/api/demo/run")
    assert resp.status_code == 404  # Demo data not seeded in test DB


# ─── Tests: Dashboard ─────────────────────────────────────────────────────────

def test_dashboard_metrics_structure(client):
    resp = client.get("/api/dashboard/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_active_bookings" in data
    assert "current_disruptions" in data
    assert "affected_reservations" in data
    assert "recovery_plans_generated" in data
    assert "estimated_additional_cost_inr" in data


def test_list_trips_empty(client):
    resp = client.get("/api/trips")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_and_get_trip(client, db):
    t = make_traveller(db)
    payload = {
        "traveller_id": t.id,
        "name": "API Test Trip",
        "origin": "Mumbai",
        "destination": "Delhi",
        "departure_date": "2026-11-01T08:00:00",
        "is_demo": True,
    }
    resp = client.post("/api/trips", json=payload)
    assert resp.status_code == 201
    trip_id = resp.json()["id"]

    get_resp = client.get(f"/api/trips/{trip_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "API Test Trip"

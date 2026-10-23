"""
RouteRecover AI - Database Seed Script

Seeds the database with:
- Demo traveller
- Demo trip (Mangalore → Bengaluru)
- Demo bookings (flight + hotel + connecting journey)
- Demo booking dependencies
- Demo transport alternatives
- Demo traveller constraints
"""
from __future__ import annotations
import sys
import os
import json
from datetime import datetime, timedelta, timezone

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, SessionLocal, Base
from app.models.models import (
    Traveller, Trip, Booking, BookingDependency,
    TransportAlternative, TravellerConstraint, AuditEvent,
    TransportType, BookingStatus, BookingType,
)


DEMO_TRAVELLER_EMAIL = "demo.traveller@routerecover.ai"
DEMO_TRIP_NAME = "Mangalore to Bengaluru – Business Trip (DEMO)"

# IST offset
IST = timezone(timedelta(hours=5, minutes=30))


def ist(year, month, day, hour, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=IST).replace(tzinfo=None)


def create_tables():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created.")


def seed_demo(db) -> dict:
    """Seed demo data. Returns IDs of created objects."""
    result = {}

    # ─── Traveller ────────────────────────────────────────────────────────────
    traveller = db.query(Traveller).filter_by(email=DEMO_TRAVELLER_EMAIL).first()
    if not traveller:
        traveller = Traveller(
            id="demo-traveller-001",
            name="Priya Sharma",
            email=DEMO_TRAVELLER_EMAIL,
            phone="+91 98765 43210",
            is_demo=True,
        )
        db.add(traveller)
        print("  Created demo traveller: Priya Sharma")
    result["traveller_id"] = traveller.id

    # ─── Trip ─────────────────────────────────────────────────────────────────
    trip = db.query(Trip).filter_by(
        traveller_id=traveller.id, name=DEMO_TRIP_NAME
    ).first()
    if not trip:
        trip = Trip(
            id="demo-trip-001",
            traveller_id=traveller.id,
            name=DEMO_TRIP_NAME,
            origin="Mangalore",
            destination="Bengaluru",
            departure_date=ist(2026, 10, 18, 8, 0),
            return_date=ist(2026, 10, 20, 18, 0),
            is_demo=True,
            notes="Hackathon demo trip — Mangalore to Bengaluru",
        )
        db.add(trip)
        print("  Created demo trip: Mangalore → Bengaluru")
    result["trip_id"] = trip.id

    # ─── Bookings ─────────────────────────────────────────────────────────────
    # 1. Original flight (will be disrupted)
    flight = db.query(Booking).filter_by(
        trip_id=trip.id, reference="AI-6E-2941"
    ).first()
    if not flight:
        flight = Booking(
            id="demo-booking-flight-001",
            trip_id=trip.id,
            booking_type=BookingType.TRANSPORT,
            transport_type=TransportType.FLIGHT,
            reference="AI-6E-2941",
            provider="IndiGo Airlines",
            origin="Mangalore (IXE)",
            destination="Bengaluru (BLR)",
            origin_lat=12.9611,
            origin_lon=74.8898,
            destination_lat=13.1986,
            destination_lon=77.7066,
            departure_time=ist(2026, 10, 18, 9, 0),
            arrival_time=ist(2026, 10, 18, 10, 10),
            price_inr=3500.0,
            status=BookingStatus.CONFIRMED,
            seat_class="Economy",
            notes="Window seat 14A",
            is_demo=True,
        )
        db.add(flight)
        print("  Created demo booking: IndiGo flight AI-6E-2941")
    result["flight_id"] = flight.id

    # 2. Hotel booking
    hotel = db.query(Booking).filter_by(
        trip_id=trip.id, reference="HTL-LEELA-001"
    ).first()
    if not hotel:
        hotel = Booking(
            id="demo-booking-hotel-001",
            trip_id=trip.id,
            booking_type=BookingType.HOTEL,
            reference="HTL-LEELA-001",
            provider="The Leela Palace Bengaluru",
            destination="Bengaluru",
            destination_lat=12.9716,
            destination_lon=77.5946,
            arrival_time=ist(2026, 10, 18, 14, 0),  # Check-in 2:00 PM
            price_inr=8500.0,
            status=BookingStatus.CONFIRMED,
            notes="Check-in: 2:00 PM. Deluxe Room, 2 nights.",
            is_demo=True,
        )
        db.add(hotel)
        print("  Created demo booking: Hotel Leela Palace")
    result["hotel_id"] = hotel.id

    # 3. Connecting journey
    connecting = db.query(Booking).filter_by(
        trip_id=trip.id, reference="RJ-BLR-MYS-55"
    ).first()
    if not connecting:
        connecting = Booking(
            id="demo-booking-connecting-001",
            trip_id=trip.id,
            booking_type=BookingType.TRANSPORT,
            transport_type=TransportType.TRAIN,
            reference="RJ-BLR-MYS-55",
            provider="Indian Railways",
            origin="Bengaluru City (SBC)",
            destination="Mysuru (MYS)",
            origin_lat=12.9716,
            origin_lon=77.5946,
            destination_lat=12.2958,
            destination_lon=76.6394,
            departure_time=ist(2026, 10, 18, 17, 0),  # Departs 5:00 PM
            arrival_time=ist(2026, 10, 18, 19, 30),
            price_inr=450.0,
            status=BookingStatus.CONFIRMED,
            seat_class="2A",
            notes="Connecting journey to Mysuru. Departure at 5:00 PM.",
            is_demo=True,
        )
        db.add(connecting)
        print("  Created demo booking: Train BLR → MYS")
    result["connecting_id"] = connecting.id

    # ─── Booking Dependencies ─────────────────────────────────────────────────
    dep1 = db.query(BookingDependency).filter_by(
        upstream_booking_id=flight.id, dependent_booking_id=hotel.id
    ).first()
    if not dep1:
        dep1 = BookingDependency(
            id="demo-dep-001",
            upstream_booking_id=flight.id,
            dependent_booking_id=hotel.id,
            dependency_type="hotel_checkin",
            notes="Hotel check-in at 2:00 PM — depends on flight arrival",
        )
        db.add(dep1)

    dep2 = db.query(BookingDependency).filter_by(
        upstream_booking_id=flight.id, dependent_booking_id=connecting.id
    ).first()
    if not dep2:
        dep2 = BookingDependency(
            id="demo-dep-002",
            upstream_booking_id=flight.id,
            dependent_booking_id=connecting.id,
            dependency_type="connection",
            min_connection_minutes=60,
            notes="Connection to train at 5:00 PM — needs arrival before 4:00 PM",
        )
        db.add(dep2)
    print("  Created booking dependencies")

    # ─── Traveller Constraints ────────────────────────────────────────────────
    constraint = db.query(TravellerConstraint).filter_by(
        traveller_id=traveller.id
    ).first()
    if not constraint:
        constraint = TravellerConstraint(
            id="demo-constraint-001",
            traveller_id=traveller.id,
            max_additional_budget_inr=1500.0,
            latest_arrival_time=ist(2026, 10, 18, 16, 0),  # Must arrive by 4:00 PM
            preferred_transport_types=json.dumps(["train", "flight"]),
            overnight_travel_ok=False,
            max_transfers=1,
            max_journey_duration_hours=8.0,
            requires_accessibility=False,
            preferred_departure_from="06:00",
            preferred_departure_to="14:00",
            critical_booking_ids=json.dumps([connecting.id]),
            notes="Must arrive by 4:00 PM to catch the connecting train to Mysuru at 5:00 PM. Max extra budget: ₹1,500.",
        )
        db.add(constraint)
        print("  Created traveller constraints")
    result["constraint_id"] = constraint.id

    # ─── Transport Alternatives ───────────────────────────────────────────────
    seed_date = "2026-10-18"
    alternatives_data = [
        # ✅ Option 1: TRAIN (satisfies deadline AND budget) — BEST OVERALL
        {
            "id": "alt-train-express-001",
            "transport_type": TransportType.TRAIN,
            "provider": "Indian Railways",
            "service_name": "Mangalore Express 16513",
            "origin": "Mangalore Central (MAQ)",
            "destination": "Bengaluru City (SBC)",
            "origin_lat": 12.8654,
            "origin_lon": 74.8420,
            "destination_lat": 12.9716,
            "destination_lon": 77.5946,
            "departure_time": ist(2026, 10, 18, 7, 30),
            "arrival_time": ist(2026, 10, 18, 13, 30),
            "price_inr": 4800.0,  # Original ₹3500, extra ₹1300 — within ₹1500 budget
            "available_seats": 45,
            "duration_minutes": 360,
            "stops": 1,
            "has_accessibility": True,
            "service_date": seed_date,
        },
        # ✅ Option 2: BUS (satisfies deadline, slightly higher cost)
        {
            "id": "alt-bus-ksrtc-001",
            "transport_type": TransportType.BUS,
            "provider": "KSRTC Airavat",
            "service_name": "KSRTC Airavat Club Class #2204",
            "origin": "Mangalore KSRTC Stand",
            "destination": "Bengaluru Majestic",
            "origin_lat": 12.8698,
            "origin_lon": 74.8426,
            "destination_lat": 12.9779,
            "destination_lon": 77.5713,
            "departure_time": ist(2026, 10, 18, 8, 0),
            "arrival_time": ist(2026, 10, 18, 15, 30),
            "price_inr": 5200.0,  # Extra ₹1700 — EXCEEDS ₹1500 budget limit
            "available_seats": 20,
            "duration_minutes": 450,
            "stops": 0,
            "has_accessibility": True,
            "service_date": seed_date,
        },
        # ❌ Option 3: FLIGHT (faster but exceeds extra budget)
        {
            "id": "alt-flight-air-india-001",
            "transport_type": TransportType.FLIGHT,
            "provider": "Air India",
            "service_name": "AI-560 Mangalore–Bengaluru",
            "origin": "Mangalore (IXE)",
            "destination": "Bengaluru (BLR)",
            "origin_lat": 12.9611,
            "origin_lon": 74.8898,
            "destination_lat": 13.1986,
            "destination_lon": 77.7066,
            "departure_time": ist(2026, 10, 18, 11, 0),
            "arrival_time": ist(2026, 10, 18, 12, 15),
            "price_inr": 7200.0,  # Extra ₹3700 — WAY over budget
            "available_seats": 8,
            "duration_minutes": 75,
            "stops": 0,
            "has_accessibility": True,
            "service_date": seed_date,
        },
        # ❌ Option 4: Arrives too late
        {
            "id": "alt-bus-private-001",
            "transport_type": TransportType.BUS,
            "provider": "SRS Travels",
            "service_name": "SRS Deluxe Sleeper #3301",
            "origin": "Mangalore Bus Stand",
            "destination": "Bengaluru Shantinagar",
            "origin_lat": 12.8698,
            "origin_lon": 74.8426,
            "destination_lat": 12.9606,
            "destination_lon": 77.5972,
            "departure_time": ist(2026, 10, 18, 10, 0),
            "arrival_time": ist(2026, 10, 18, 18, 0),  # Arrives 6 PM — LATE
            "price_inr": 4200.0,
            "available_seats": 12,
            "duration_minutes": 480,
            "stops": 2,
            "has_accessibility": False,
            "service_date": seed_date,
        },
        # ❌ Option 5: Transfer-based (too many stops)
        {
            "id": "alt-train-via-hassan-001",
            "transport_type": TransportType.TRAIN,
            "provider": "Indian Railways",
            "service_name": "Passenger via Hassan 56702",
            "origin": "Mangalore Junction (MAJN)",
            "destination": "Bengaluru City (SBC)",
            "origin_lat": 12.8654,
            "origin_lon": 74.8420,
            "destination_lat": 12.9716,
            "destination_lon": 77.5946,
            "departure_time": ist(2026, 10, 18, 6, 0),
            "arrival_time": ist(2026, 10, 18, 14, 45),
            "price_inr": 3800.0,  # Very cheap: extra ₹300
            "available_seats": 80,
            "duration_minutes": 525,
            "stops": 3,  # 3 stops — exceeds max_transfers of 1
            "has_accessibility": True,
            "service_date": seed_date,
        },
    ]

    for alt_data in alternatives_data:
        existing = db.query(TransportAlternative).filter_by(id=alt_data["id"]).first()
        if not existing:
            alt = TransportAlternative(**alt_data, is_demo=True)
            db.add(alt)

    print(f"  Created {len(alternatives_data)} demo transport alternatives")

    # ─── Audit Event ──────────────────────────────────────────────────────────
    db.add(AuditEvent(
        event_type="demo_seed",
        entity_type="system",
        entity_id="demo",
        description="Demo data seeded successfully.",
        metadata_json=json.dumps({"trip_id": trip.id, "traveller_id": traveller.id}),
    ))

    db.commit()
    print("✅ Demo data seeded successfully.")
    return result


def main():
    print("🚀 RouteRecover AI — Database Initialization")
    create_tables()
    db = SessionLocal()
    try:
        ids = seed_demo(db)
        print(f"\n📍 Demo IDs:")
        for k, v in ids.items():
            print(f"   {k}: {v}")
    finally:
        db.close()
    print("\n✅ Done. Run `uvicorn app.main:app --reload` to start the server.")


if __name__ == "__main__":
    main()

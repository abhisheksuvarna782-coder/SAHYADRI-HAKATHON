"""
Trip and Booking API routes — pydantic v2
"""
from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Trip, Booking, Traveller
from app.schemas.schemas import (
    TripCreate, TripRead, TripDetail,
    BookingCreate, BookingUpdate, BookingRead,
    TravellerCreate, TravellerRead,
)

router = APIRouter()


# ─── Travellers ──────────────────────────────────────────────────────────────

@router.get("/travellers", response_model=List[TravellerRead], tags=["Travellers"])
def list_travellers(db: Session = Depends(get_db)):
    return db.query(Traveller).all()


@router.post("/travellers", response_model=TravellerRead, status_code=201, tags=["Travellers"])
def create_traveller(body: TravellerCreate, db: Session = Depends(get_db)):
    existing = db.query(Traveller).filter_by(email=body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")
    traveller = Traveller(**body.model_dump())
    db.add(traveller)
    db.commit()
    db.refresh(traveller)
    return traveller


@router.get("/travellers/{traveller_id}", response_model=TravellerRead, tags=["Travellers"])
def get_traveller(traveller_id: str, db: Session = Depends(get_db)):
    t = db.query(Traveller).filter_by(id=traveller_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Traveller not found.")
    return t


# ─── Trips ────────────────────────────────────────────────────────────────────

@router.get("/trips", response_model=List[TripRead], tags=["Trips"])
def list_trips(
    traveller_id: Optional[str] = Query(None),
    is_demo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Trip)
    if traveller_id:
        q = q.filter(Trip.traveller_id == traveller_id)
    if is_demo is not None:
        q = q.filter(Trip.is_demo == is_demo)
    return q.order_by(Trip.created_at.desc()).all()


@router.post("/trips", response_model=TripRead, status_code=201, tags=["Trips"])
def create_trip(body: TripCreate, db: Session = Depends(get_db)):
    traveller = db.query(Traveller).filter_by(id=body.traveller_id).first()
    if not traveller:
        raise HTTPException(status_code=404, detail="Traveller not found.")
    trip = Trip(**body.model_dump())
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("/trips/{trip_id}", response_model=TripDetail, tags=["Trips"])
def get_trip(trip_id: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter_by(id=trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip


@router.delete("/trips/{trip_id}", status_code=204, tags=["Trips"])
def delete_trip(trip_id: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter_by(id=trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    db.delete(trip)
    db.commit()


# ─── Bookings ─────────────────────────────────────────────────────────────────

@router.get("/trips/{trip_id}/bookings", response_model=List[BookingRead], tags=["Bookings"])
def list_trip_bookings(trip_id: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter_by(id=trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return db.query(Booking).filter_by(trip_id=trip_id).all()


@router.post("/bookings", response_model=BookingRead, status_code=201, tags=["Bookings"])
def create_booking(body: BookingCreate, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter_by(id=body.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    booking = Booking(**body.model_dump())
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/bookings/{booking_id}", response_model=BookingRead, tags=["Bookings"])
def get_booking(booking_id: str, db: Session = Depends(get_db)):
    b = db.query(Booking).filter_by(id=booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return b


@router.patch("/bookings/{booking_id}", response_model=BookingRead, tags=["Bookings"])
def update_booking(booking_id: str, body: BookingUpdate, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter_by(id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(booking, field, value)
    db.commit()
    db.refresh(booking)
    return booking


@router.delete("/bookings/{booking_id}", status_code=204, tags=["Bookings"])
def delete_booking(booking_id: str, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter_by(id=booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    db.delete(booking)
    db.commit()

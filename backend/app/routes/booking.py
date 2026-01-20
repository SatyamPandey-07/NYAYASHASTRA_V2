"""
NyayaShastra - Booking Routes
API endpoints for lawyer consultation bookings.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from app.database import get_db
from app.models import Booking
from app.services.booking_service import (
    generate_booking_id,
    generate_meeting_id,
    generate_meeting_password,
    get_lawyer_for_domain,
    validate_booking_data,
    create_booking_response
)
from app.services.email_service import send_booking_confirmation_email
from app.services.clerk_auth import verify_clerk_token, get_user_id_from_claims

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/booking",
    tags=["booking"]
)


# Request/Response Models
class BookingRequest(BaseModel):
    """Request model for creating a booking."""
    domain: str = Field(..., description="Legal domain: criminal, civil, it, family, corporate")
    date: str = Field(..., description="Booking date in YYYY-MM-DD format")
    time: str = Field(..., description="Booking time in HH:MM format (24-hour)")
    category: str = Field(..., description="Category: urgent, sue, arrest, general")
    message: Optional[str] = Field(None, description="Additional message for the lawyer")
    user_email: str = Field(..., description="User's email address")
    transaction_id: Optional[str] = Field(None, description="Payment transaction ID")
    amount_paid: Optional[int] = Field(None, description="Amount paid in INR")

    class Config:
        json_schema_extra = {
            "example": {
                "domain": "it",
                "date": "2026-01-25",
                "time": "14:00",
                "category": "urgent",
                "message": "I need help with a cyber fraud case",
                "user_email": "user@example.com",
                "transaction_id": "TXN1234567890",
                "amount_paid": 1000
            }
        }



class BookingResponse(BaseModel):
    """Response model for booking creation."""
    success: bool
    booking_id: str
    lawyer_name: str
    meeting_id: str
    meeting_password: str
    details: dict
    message: str


class BookingListResponse(BaseModel):
    """Response model for listing bookings."""
    bookings: List[dict]
    total: int


@router.post("/book-consultation", response_model=BookingResponse)
async def book_consultation(
    request: BookingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    claims: dict = Depends(verify_clerk_token)
):
    """
    Book a lawyer consultation.
    
    This endpoint:
    1. Validates the booking data
    2. Generates unique booking ID, meeting ID, and password
    3. Assigns a lawyer based on the legal domain
    4. Saves the booking to the database
    5. Triggers an async email with meeting details
    6. Returns booking confirmation
    """
    
    # Get user ID from Clerk token
    clerk_user_id = get_user_id_from_claims(claims)
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    # Validate booking data
    errors = validate_booking_data(
        domain=request.domain,
        date=request.date,
        time=request.time,
        category=request.category
    )
    
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})
    
    # Generate booking details
    booking_id = generate_booking_id()
    meeting_id = generate_meeting_id()
    meeting_password = generate_meeting_password()
    lawyer_name = get_lawyer_for_domain(request.domain)
    
    # Create booking record
    booking = Booking(
        clerk_user_id=clerk_user_id,
        user_email=request.user_email,
        booking_id=booking_id,
        domain=request.domain.lower(),
        date=request.date,
        time=request.time,
        category=request.category.lower(),
        message=request.message,
        lawyer_name=lawyer_name,
        meeting_id=meeting_id,
        meeting_password=meeting_password,
        status="confirmed",
        transaction_id=request.transaction_id,
        amount_paid=request.amount_paid
    )
    
    try:
        db.add(booking)
        db.commit()
        db.refresh(booking)
        logger.info(f"Booking created: {booking_id} for user {clerk_user_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create booking: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create booking")
    
    # Send confirmation email in background
    background_tasks.add_task(
        send_booking_confirmation_email,
        user_email=request.user_email,
        booking_id=booking_id,
        lawyer_name=lawyer_name,
        domain=request.domain,
        date=request.date,
        time=request.time,
        category=request.category,
        meeting_id=meeting_id,
        meeting_password=meeting_password,
        message=request.message
    )
    
    # Return response
    return create_booking_response(
        booking_id=booking_id,
        lawyer_name=lawyer_name,
        meeting_id=meeting_id,
        meeting_password=meeting_password,
        domain=request.domain,
        date=request.date,
        time=request.time,
        category=request.category,
        user_email=request.user_email
    )


@router.get("/my-bookings", response_model=BookingListResponse)
async def get_my_bookings(
    db: Session = Depends(get_db),
    claims: dict = Depends(verify_clerk_token)
):
    """
    Get all bookings for the authenticated user.
    """
    clerk_user_id = get_user_id_from_claims(claims)
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    bookings = db.query(Booking).filter(
        Booking.clerk_user_id == clerk_user_id
    ).order_by(Booking.created_at.desc()).all()
    
    return {
        "bookings": [b.to_dict() for b in bookings],
        "total": len(bookings)
    }


@router.get("/booking/{booking_id}")
async def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(verify_clerk_token)
):
    """
    Get a specific booking by ID.
    """
    clerk_user_id = get_user_id_from_claims(claims)
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    booking = db.query(Booking).filter(
        Booking.booking_id == booking_id,
        Booking.clerk_user_id == clerk_user_id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return booking.to_dict()


@router.delete("/booking/{booking_id}")
async def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    claims: dict = Depends(verify_clerk_token)
):
    """
    Cancel a booking.
    """
    clerk_user_id = get_user_id_from_claims(claims)
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    booking = db.query(Booking).filter(
        Booking.booking_id == booking_id,
        Booking.clerk_user_id == clerk_user_id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking.status = "cancelled"
    db.commit()
    
    logger.info(f"Booking cancelled: {booking_id}")
    
    return {"success": True, "message": "Booking cancelled successfully"}

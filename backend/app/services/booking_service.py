"""
NyayaShastra - Booking Service
Business logic for lawyer consultation bookings.
"""

import random
import string
from datetime import datetime
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Lawyer mapping by domain
DOMAIN_LAWYER_MAP = {
    "criminal": "Adv. Rajesh Kumar",
    "civil": "Adv. Priya Sharma",
    "it": "Adv. Sarah Jenkins",
    "family": "Adv. Meera Reddy",
    "corporate": "Adv. Vikram Singh",
}


def generate_booking_id() -> str:
    """
    Generate a unique booking ID in format: LEG-YYYY-XXXX
    Example: LEG-2026-4829
    """
    year = datetime.now().year
    random_digits = ''.join(random.choices(string.digits, k=4))
    return f"LEG-{year}-{random_digits}"


def generate_meeting_id() -> str:
    """
    Generate a 9-digit meeting ID.
    Example: 123-456-789
    """
    digits = ''.join(random.choices(string.digits, k=9))
    return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"


def generate_meeting_password() -> str:
    """
    Generate a 6-character alphanumeric password.
    Example: Ab3Xy9
    """
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=6))


def get_lawyer_for_domain(domain: str) -> str:
    """
    Get the assigned lawyer name based on legal domain.
    
    Args:
        domain: Legal domain (criminal, civil, it, family, corporate)
    
    Returns:
        Lawyer name string
    """
    domain_lower = domain.lower()
    return DOMAIN_LAWYER_MAP.get(domain_lower, "Adv. Legal Expert")


def validate_booking_data(
    domain: str,
    date: str,
    time: str,
    category: str
) -> Dict[str, str]:
    """
    Validate booking data and return any errors.
    
    Returns:
        Dictionary of field -> error message, empty if valid
    """
    errors = {}
    
    # Validate domain
    valid_domains = ["criminal", "civil", "it", "family", "corporate"]
    if domain.lower() not in valid_domains:
        errors["domain"] = f"Invalid domain. Must be one of: {', '.join(valid_domains)}"
    
    # Validate date format and value
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d")
        if booking_date.date() < datetime.now().date():
            errors["date"] = "Booking date cannot be in the past"
    except ValueError:
        errors["date"] = "Invalid date format. Use YYYY-MM-DD"
    
    # Validate time format and value
    try:
        booking_time = datetime.strptime(time, "%H:%M")
        hour = booking_time.hour
        if hour < 10 or hour >= 18:
            errors["time"] = "Booking time must be between 10:00 AM and 6:00 PM"
    except ValueError:
        errors["time"] = "Invalid time format. Use HH:MM (24-hour format)"
    
    # Validate category
    valid_categories = ["urgent", "sue", "arrest", "general"]
    if category.lower() not in valid_categories:
        errors["category"] = f"Invalid category. Must be one of: {', '.join(valid_categories)}"
    
    return errors


def create_booking_response(
    booking_id: str,
    lawyer_name: str,
    meeting_id: str,
    meeting_password: str,
    domain: str,
    date: str,
    time: str,
    category: str,
    user_email: str
) -> Dict:
    """
    Create the booking response to return to the frontend.
    """
    return {
        "success": True,
        "booking_id": booking_id,
        "lawyer_name": lawyer_name,
        "meeting_id": meeting_id,
        "meeting_password": meeting_password,
        "details": {
            "domain": domain,
            "date": date,
            "time": time,
            "category": category,
            "user_email": user_email,
        },
        "message": f"Your consultation has been booked successfully. Please check {user_email} for meeting details."
    }

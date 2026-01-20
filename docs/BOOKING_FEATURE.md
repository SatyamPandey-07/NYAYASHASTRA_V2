# Lawyer Consultation Booking Feature

This document describes the lawyer consultation booking system implemented for NyayaShastra.

## Overview

The booking system allows authenticated users to:
1. Book video consultations with lawyers in different legal domains
2. Select date and time slots
3. Choose consultation categories (urgent, lawsuit, arrest, general)
4. Receive confirmation with meeting credentials via email

## Architecture

### Backend (FastAPI)

#### New Files Created:
- `app/routes/booking.py` - API endpoints for booking consultations
- `app/services/booking_service.py` - Business logic for bookings
- `app/services/email_service.py` - Email sending functionality
- `app/services/clerk_auth.py` - Clerk JWT token validation

#### Modified Files:
- `app/models.py` - Added `Booking` model
- `app/main.py` - Registered booking routes
- `app/routes/__init__.py` - Added booking import
- `requirements.txt` - Added PyJWT dependency
- `.env.example` - Added SMTP and Clerk configuration

### Database Model (Booking)

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| clerk_user_id | String(255) | Clerk user ID from JWT |
| user_email | String(255) | User's email address |
| booking_id | String(50) | Unique booking ID (LEG-YYYY-XXXX) |
| domain | String(50) | Legal domain (criminal, civil, it, family, corporate) |
| date | String(20) | Booking date (YYYY-MM-DD) |
| time | String(20) | Time slot (HH:MM) |
| category | String(50) | Category (urgent, sue, arrest, general) |
| message | Text | Optional additional message |
| lawyer_name | String(255) | Assigned lawyer name |
| meeting_id | String(20) | 9-digit meeting ID |
| meeting_password | String(10) | 6-character password |
| status | String(50) | Booking status |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### API Endpoints

#### POST /api/booking/book-consultation
Creates a new booking.

**Request Body:**
```json
{
  "domain": "it",
  "date": "2026-01-25",
  "time": "14:00",
  "category": "urgent",
  "message": "I need help with a cyber fraud case",
  "user_email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "booking_id": "LEG-2026-4829",
  "lawyer_name": "Adv. Sarah Jenkins",
  "meeting_id": "123-456-789",
  "meeting_password": "Ab3Xy9",
  "details": {
    "domain": "it",
    "date": "2026-01-25",
    "time": "14:00",
    "category": "urgent",
    "user_email": "user@example.com"
  },
  "message": "Your consultation has been booked successfully..."
}
```

#### GET /api/booking/my-bookings
Returns all bookings for the authenticated user.

#### GET /api/booking/booking/{booking_id}
Returns a specific booking by ID.

#### DELETE /api/booking/booking/{booking_id}
Cancels a booking.

### Frontend (React/TypeScript)

#### New Files Created:
- `src/pages/Booking.tsx` - Multi-step booking form
- `src/pages/BookingConfirmation.tsx` - Confirmation page with success animation
- `src/components/ConsultLawyerButton.tsx` - Reusable CTA button component

#### Modified Files:
- `src/App.tsx` - Added routes for /booking and /booking-confirmation
- `src/components/ChatInterface.tsx` - Added ConsultLawyerButton in welcome screen and input area

### Booking Flow

1. **Step 1 - Domain Selection**: User selects legal domain (Criminal, Civil, IT, Family, Corporate)
2. **Step 2 - Schedule**: User picks date (next 30 days) and time slot (10 AM - 6 PM)
3. **Step 3 - Details**: User selects category and optionally adds a message
4. **Confirmation**: On success, redirects to confirmation page with booking details

### Lawyer Assignment

Lawyers are assigned based on domain:
- Criminal → Adv. Rajesh Kumar
- Civil → Adv. Priya Sharma
- IT → Adv. Sarah Jenkins
- Family → Adv. Meera Reddy
- Corporate → Adv. Vikram Singh

### Email Notifications

When SMTP is configured, users receive a beautifully styled HTML email containing:
- Booking ID
- Assigned lawyer name
- Domain and category
- Date and time
- Meeting ID and password
- Important notes

## Environment Variables

### Backend (.env)
```
# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@nyayashastra.com
SMTP_FROM_NAME=NyayaShastra Legal Services
```

## Dependencies Added

### Backend
- `PyJWT>=2.8.0` - For Clerk JWT token verification

### Frontend
- `canvas-confetti` - For celebration animation on confirmation page

## Running the Application

### Start Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Start Frontend
```bash
npm install
npm run dev
```

## Testing

1. Sign in with Clerk
2. Click "Consult a Lawyer" button on the chat interface
3. Complete the 3-step booking form
4. Verify booking confirmation page displays correctly
5. Check email for meeting credentials (if SMTP configured)

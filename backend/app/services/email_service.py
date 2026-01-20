"""
NyayaShastra - Email Service
Asynchronous email service for sending booking confirmations.
"""

import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Email configuration (from settings)
SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USERNAME = settings.smtp_username
SMTP_PASSWORD = settings.smtp_password
SMTP_FROM_EMAIL = settings.smtp_from_email
SMTP_FROM_NAME = settings.smtp_from_name


def create_booking_email_html(
    user_email: str,
    booking_id: str,
    lawyer_name: str,
    domain: str,
    date: str,
    time: str,
    category: str,
    meeting_id: str,
    meeting_password: str,
    message: Optional[str] = None
) -> str:
    """Create HTML email content for booking confirmation."""
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Consultation Booking Confirmed</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #c9a227; margin: 0; font-size: 28px; font-weight: 600;">⚖️ NyayaShastra</h1>
                <p style="color: #a0a0a0; margin: 10px 0 0 0; font-size: 14px;">AI-Powered Legal Services</p>
            </div>
            
            <!-- Success Badge -->
            <div style="text-align: center; padding: 30px 0 10px 0;">
                <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; width: 80px; height: 80px; line-height: 80px;">
                    <span style="color: white; font-size: 40px;">✓</span>
                </div>
                <h2 style="color: #1a1a2e; margin: 20px 0 5px 0; font-size: 24px;">Booking Confirmed!</h2>
                <p style="color: #666; margin: 0; font-size: 14px;">Your consultation has been scheduled successfully</p>
            </div>
            
            <!-- Booking Details Card -->
            <div style="margin: 20px 30px; background: linear-gradient(135deg, #faf7f2 0%, #f5f0e6 100%); border-radius: 12px; padding: 25px; border: 1px solid #e0d5c5;">
                <h3 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #c9a227; padding-bottom: 10px;">📋 Booking Details</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px; width: 40%;">Booking ID</td>
                        <td style="padding: 10px 0; color: #1a1a2e; font-size: 14px; font-weight: 600;">{booking_id}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Assigned Lawyer</td>
                        <td style="padding: 10px 0; color: #1a1a2e; font-size: 14px; font-weight: 600;">👤 {lawyer_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Legal Domain</td>
                        <td style="padding: 10px 0; color: #1a1a2e; font-size: 14px; font-weight: 600;">{domain.upper()} Law</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Category</td>
                        <td style="padding: 10px 0; color: #1a1a2e; font-size: 14px; font-weight: 600;">{category.title()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Date</td>
                        <td style="padding: 10px 0; color: #1a1a2e; font-size: 14px; font-weight: 600;">📅 {date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666; font-size: 14px;">Time</td>
                        <td style="padding: 10px 0; color: #1a1a2e; font-size: 14px; font-weight: 600;">🕐 {time}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Meeting Details Card -->
            <div style="margin: 20px 30px; background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border-radius: 12px; padding: 25px; border: 1px solid #7dd3fc;">
                <h3 style="color: #0369a1; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">🎥 Meeting Credentials</h3>
                
                <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <p style="color: #666; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Meeting ID</p>
                    <p style="color: #1a1a2e; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">{meeting_id}</p>
                </div>
                
                <div style="background: white; border-radius: 8px; padding: 15px;">
                    <p style="color: #666; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Password</p>
                    <p style="color: #1a1a2e; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">{meeting_password}</p>
                </div>
                
                <p style="color: #0369a1; margin: 15px 0 0 0; font-size: 12px; text-align: center;">
                    Use these credentials to join your video consultation
                </p>
            </div>
            
            {f'''
            <!-- Additional Message -->
            <div style="margin: 20px 30px; background: #f9fafb; border-radius: 12px; padding: 20px; border-left: 4px solid #c9a227;">
                <h4 style="color: #1a1a2e; margin: 0 0 10px 0; font-size: 14px;">💬 Your Message</h4>
                <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.6;">{message}</p>
            </div>
            ''' if message else ''}
            
            <!-- Important Notes -->
            <div style="margin: 20px 30px; padding: 20px; background: #fffbeb; border-radius: 12px; border: 1px solid #fcd34d;">
                <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">⚠️ Important Notes</h4>
                <ul style="color: #78350f; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                    <li>Please join the meeting 5 minutes before the scheduled time</li>
                    <li>Keep all relevant documents ready for discussion</li>
                    <li>Ensure stable internet connection for uninterrupted consultation</li>
                    <li>This consultation is for informational purposes only</li>
                </ul>
            </div>
            
            <!-- Footer -->
            <div style="background: #1a1a2e; padding: 30px; text-align: center;">
                <p style="color: #c9a227; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">⚖️ NyayaShastra</p>
                <p style="color: #a0a0a0; margin: 0; font-size: 12px;">AI-Powered Legal Helper for India</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                    <p style="color: #666; margin: 0; font-size: 11px;">
                        This email was sent to {user_email}<br>
                        © 2026 NyayaShastra. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


def create_booking_email_text(
    booking_id: str,
    lawyer_name: str,
    domain: str,
    date: str,
    time: str,
    category: str,
    meeting_id: str,
    meeting_password: str,
    message: Optional[str] = None
) -> str:
    """Create plain text email content for booking confirmation."""
    
    text = f"""
    NyayaShastra - Consultation Booking Confirmed
    =============================================
    
    Your legal consultation has been scheduled successfully!
    
    BOOKING DETAILS
    ---------------
    Booking ID: {booking_id}
    Assigned Lawyer: {lawyer_name}
    Legal Domain: {domain.upper()} Law
    Category: {category.title()}
    Date: {date}
    Time: {time}
    
    MEETING CREDENTIALS
    -------------------
    Meeting ID: {meeting_id}
    Password: {meeting_password}
    
    {f"YOUR MESSAGE: {message}" if message else ""}
    
    IMPORTANT NOTES
    ---------------
    - Please join the meeting 5 minutes before the scheduled time
    - Keep all relevant documents ready for discussion
    - Ensure stable internet connection for uninterrupted consultation
    - This consultation is for informational purposes only
    
    ---
    NyayaShastra - AI-Powered Legal Helper for India
    © 2026 NyayaShastra. All rights reserved.
    """
    
    return text


async def send_booking_confirmation_email(
    user_email: str,
    booking_id: str,
    lawyer_name: str,
    domain: str,
    date: str,
    time: str,
    category: str,
    meeting_id: str,
    meeting_password: str,
    message: Optional[str] = None
) -> bool:
    """
    Send booking confirmation email asynchronously.
    
    Returns True if email was sent successfully, False otherwise.
    """
    
    # If SMTP credentials are not configured, log and return
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Email not sent.")
        logger.info(f"Would have sent booking confirmation to {user_email}")
        logger.info(f"Booking ID: {booking_id}, Lawyer: {lawyer_name}")
        logger.info(f"Meeting ID: {meeting_id}, Password: {meeting_password}")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"✅ Consultation Confirmed - {booking_id} | NyayaShastra"
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = user_email
        
        # Create text and HTML versions
        text_content = create_booking_email_text(
            booking_id, lawyer_name, domain, date, time,
            category, meeting_id, meeting_password, message
        )
        html_content = create_booking_email_html(
            user_email, booking_id, lawyer_name, domain, date, time,
            category, meeting_id, meeting_password, message
        )
        
        # Attach parts
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email in a thread to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_email, msg, user_email)
        
        logger.info(f"Booking confirmation email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {str(e)}")
        return False


def _send_email(msg: MIMEMultipart, recipient: str):
    """Synchronous email sending function to be run in executor."""
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, recipient, msg.as_string())

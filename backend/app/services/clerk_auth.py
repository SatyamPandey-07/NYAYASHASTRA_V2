"""
NyayaShastra - Clerk Authentication Service
JWT validation for Clerk authentication tokens.
"""

import httpx
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional, Dict
import logging

from app.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Clerk JWKS endpoint
CLERK_JWKS_URL = "https://apparent-trout-50.clerk.accounts.dev/.well-known/jwks.json"


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict:
    """
    Verify Clerk JWT token and extract user claims.
    
    Args:
        credentials: Bearer token from Authorization header
    
    Returns:
        Dictionary containing user claims (sub, email, etc.)
    
    Raises:
        HTTPException: If token is invalid or verification fails
    """
    token = credentials.credentials
    
    try:
        # Fetch JWKS and verify token
        jwks_client = PyJWKClient(CLERK_JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Decode and verify the token
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
            }
        )
        
        logger.info(f"Successfully verified token for user: {claims.get('sub')}")
        return claims
        
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )


def get_user_id_from_claims(claims: Dict) -> str:
    """Extract user ID from Clerk claims."""
    return claims.get("sub", "")


def get_user_email_from_claims(claims: Dict) -> Optional[str]:
    """Extract user email from Clerk claims."""
    # Clerk stores email in different places depending on configuration
    if "email" in claims:
        return claims["email"]
    if "email_addresses" in claims:
        email_addresses = claims["email_addresses"]
        if email_addresses and len(email_addresses) > 0:
            return email_addresses[0].get("email_address")
    return None

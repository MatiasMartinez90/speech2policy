import jwt
import json
import requests
from functools import lru_cache
from typing import Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer

from ..config import settings
from ..models import UserInfo

security = HTTPBearer()

@lru_cache()
def get_cognito_public_keys() -> Dict[str, Any]:
    """
    Fetch and cache Cognito public keys for JWT verification
    """
    try:
        url = f'https://cognito-idp.{settings.cognito_region}.amazonaws.com/{settings.cognito_user_pool_id}/.well-known/jwks.json'
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to fetch Cognito public keys: {str(e)}"
        )

def verify_cognito_jwt(token: str) -> Dict[str, Any]:
    """
    Verify and decode Cognito JWT token
    """
    try:
        # Get token header without verification
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')
        
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing key ID"
            )
        
        # Find the correct public key
        keys = get_cognito_public_keys()['keys']
        public_key = None
        
        for key in keys:
            if key['kid'] == kid:
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
                break
        
        if not public_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token key ID"
            )
        
        # Verify and decode the token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=settings.cognito_client_id,
            issuer=settings.cognito_issuer,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience"
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification error: {str(e)}"
        )

async def get_current_user(token: str = Depends(security)) -> UserInfo:
    """
    FastAPI dependency to get current authenticated user
    """
    payload = verify_cognito_jwt(token.credentials)
    
    return UserInfo(
        user_id=payload['sub'],
        email=payload['email'],
        name=payload.get('name', ''),
        picture=payload.get('picture', ''),
        username=payload['cognito:username']
    )

# Optional: Create a dependency for optional authentication
async def get_current_user_optional(token: str = Depends(HTTPBearer(auto_error=False))) -> UserInfo | None:
    """
    Optional authentication dependency - returns None if no valid token
    """
    if not token:
        return None
    
    try:
        return await get_current_user(token)
    except HTTPException:
        return None
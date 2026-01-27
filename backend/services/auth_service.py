"""
Authentication service for Google OAuth verification.
"""
import os
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# In-memory user storage (replace with database in production)
users_db: dict = {}


class AuthService:
    """Service for handling Google OAuth authentication."""
    
    def __init__(self):
        self.client_id = GOOGLE_CLIENT_ID
    
    async def verify_google_token(self, token: str) -> Optional[dict]:
        """
        Verify a Google ID token and return user info.
        
        Args:
            token: The Google ID token from the frontend
            
        Returns:
            User info dict if valid, None otherwise
        """
        try:
            # Verify the token with Google
            # Allow 10 seconds of clock skew to handle time sync issues
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                self.client_id,
                clock_skew_in_seconds=10
            )
            
            # Token is valid, extract user info
            user_info = {
                "google_id": idinfo["sub"],
                "email": idinfo.get("email", ""),
                "name": idinfo.get("name", ""),
                "picture": idinfo.get("picture", ""),
                "email_verified": idinfo.get("email_verified", False)
            }
            
            return user_info
            
        except ValueError as e:
            # Invalid token
            print(f"Token verification failed: {e}")
            return None
    
    def get_or_create_user(self, google_user_info: dict) -> dict:
        """
        Get existing user or create a new one from Google user info.
        
        Args:
            google_user_info: User info from Google token verification
            
        Returns:
            User dict with id and profile info
        """
        google_id = google_user_info["google_id"]
        
        if google_id in users_db:
            # Update existing user info
            users_db[google_id].update({
                "email": google_user_info["email"],
                "name": google_user_info["name"],
                "picture": google_user_info["picture"]
            })
            return users_db[google_id]
        
        # Create new user
        user = {
            "id": google_id,
            "google_id": google_id,
            "email": google_user_info["email"],
            "name": google_user_info["name"],
            "picture": google_user_info["picture"],
            "email_verified": google_user_info["email_verified"]
        }
        users_db[google_id] = user
        return user
    
    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get a user by their ID."""
        return users_db.get(user_id)


# Singleton instance
auth_service = AuthService()

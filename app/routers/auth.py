from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import jwt
from datetime import datetime, timedelta
from typing import List

from app.database import get_db, settings
from app.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])

# Temporary mock for DEV. Use PyJWT in prod properly.
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt

@router.post("/google")
def google_auth(
    token: str = Body(...), 
    face_encoding: List[float] = Body(None),
    db: Session = Depends(get_db)
):
    try:
        # Verify the Google Token
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            settings.google_client_id
        )

        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')

        # Check if user exists
        user = db.query(User).filter(User.google_id == google_id).first()

        if not user:
            # Require face_encoding for new accounts
            if not face_encoding or len(face_encoding) != 128:
                raise HTTPException(status_code=400, detail="Face encoding required for new accounts.")
            
            user = User(
                email=email,
                name=name,
                google_id=google_id,
                face_encoding=face_encoding
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Issue JWT
        access_token = create_access_token({"sub": str(user.id), "email": user.email})
        return {"access_token": access_token, "user": {"name": user.name, "email": user.email}}

    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid token")

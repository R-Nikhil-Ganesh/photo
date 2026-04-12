from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, settings
from app.models import SubscriptionRequest, SiteSettings, User
from app.schemas import AdminLogin, QrUpdate, SubscriptionRequestResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

router = APIRouter(prefix="/admin", tags=["Admin"])
security = HTTPBearer()

def get_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("sub") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized as admin")
        return True
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate admin credentials")

@router.post("/login")
def admin_login(creds: AdminLogin):
    # Setup standard admin credentials - ideally use env variables
    ADMIN_USERNAME = "admin"
    ADMIN_PASSWORD = "password123" # Hardcoded for demo

    if creds.username == ADMIN_USERNAME and creds.password == ADMIN_PASSWORD:
        from app.routers.auth import create_access_token
        token = create_access_token({"sub": "admin"})
        return {"access_token": token}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.put("/qr")
def update_qr(
    update: QrUpdate,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    setting = db.query(SiteSettings).filter(SiteSettings.key == "payment_qr_url").first()
    if not setting:
        setting = SiteSettings(key="payment_qr_url", value=update.qr_url)
        db.add(setting)
    else:
        setting.value = update.qr_url
    db.commit()
    return {"message": "QR code updated"}

@router.get("/requests")
def get_pending_requests(
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    # fetch all pending
    requests = db.query(SubscriptionRequest).filter(SubscriptionRequest.status == "pending").all()
    # attach emails
    res = []
    for r in requests:
        sr = SubscriptionRequestResponse.model_validate(r)
        if r.user:
            sr.user_email = r.user.email
        res.append(sr)
    return res

@router.post("/requests/{req_id}/approve")
def approve_request(
    req_id: str,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    req = db.query(SubscriptionRequest).filter(SubscriptionRequest.id == req_id, SubscriptionRequest.status == "pending").first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or not pending")
    
    req.status = "approved"
    
    # Increase user's folder limit
    user = db.query(User).filter(User.id == req.user_id).first()
    if user:
        user.folder_limit += req.requested_folders

    db.commit()
    return {"message": "Approved"}

@router.post("/requests/{req_id}/reject")
def reject_request(
    req_id: str,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    req = db.query(SubscriptionRequest).filter(SubscriptionRequest.id == req_id, SubscriptionRequest.status == "pending").first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or not pending")
    
    req.status = "rejected"
    db.commit()
    return {"message": "Rejected"}

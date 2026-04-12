from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, settings
from app.models import SubscriptionRequest, SiteSettings, User, Gallery, Photo, IndexedFace
from app.schemas import AdminLogin, QrUpdate, SubscriptionRequestResponse
from app.services.cloudinary_service import cloudinary
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

@router.get("/requests/history")
def get_requests_history(
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    # fetch all completed
    requests = db.query(SubscriptionRequest).filter(SubscriptionRequest.status != "pending").order_by(SubscriptionRequest.id).all()
    # attach emails
    res = []
    for r in requests:
        sr = SubscriptionRequestResponse.model_validate(r)
        if r.user:
            sr.user_email = r.user.email
        res.append(sr)
    return res


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    total_members = db.query(User).count()
    subscribed = db.query(User).filter(User.folder_limit > 1).count()
    total_photos = db.query(Photo).count()
    total_folders = db.query(Gallery).count()
    approved_requests = db.query(SubscriptionRequest).filter(SubscriptionRequest.status == "approved").all()
    total_revenue = sum(r.requested_folders * 120 for r in approved_requests)  # ₹120 per folder slot

    return {
        "total_members": total_members,
        "subscribed": subscribed,
        "total_photos": total_photos,
        "total_folders": total_folders,
        "total_revenue": total_revenue,
    }


@router.get("/galleries")
def get_all_galleries(
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    galleries = db.query(Gallery).all()
    result = []
    for g in galleries:
        owner = db.query(User).filter(User.id == g.owner_id).first()
        result.append({
            "id": str(g.id),
            "name": g.name,
            "access_link": g.access_link,
            "owner_email": owner.email if owner else "unknown",
            "photo_count": len(g.photos),
        })
    return result


@router.delete("/galleries/{gallery_id}")
def delete_gallery(
    gallery_id: str,
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_admin)
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    # Delete cloudinary assets
    import cloudinary.uploader
    for photo in gallery.photos:
        try:
            cloudinary.uploader.destroy(photo.cloudinary_public_id)
        except Exception:
            pass
        # Delete indexed faces for this photo
        db.query(IndexedFace).filter(IndexedFace.photo_id == photo.id).delete()

    # Delete photos
    db.query(Photo).filter(Photo.gallery_id == gallery.id).delete(synchronize_session=False)
    db.delete(gallery)
    db.commit()
    return {"message": "Gallery deleted"}

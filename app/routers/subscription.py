from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SubscriptionRequest, SiteSettings
from app.routers.auth import get_current_user
from app.schemas import SubscriptionRequestCreate, SubscriptionRequestResponse

router = APIRouter(prefix="/subscription", tags=["Subscription"])

@router.get("/qr")
def get_payment_qr(db: Session = Depends(get_db)):
    setting = db.query(SiteSettings).filter(SiteSettings.key == "payment_qr_url").first()
    if not setting or not setting.value:
        return {"qr_url": None}
    return {"qr_url": setting.value}

@router.post("/request", response_model=SubscriptionRequestResponse)
def submit_subscription_request(
    req: SubscriptionRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if there is already a pending request
    existing = db.query(SubscriptionRequest).filter(
        SubscriptionRequest.user_id == current_user.id,
        SubscriptionRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending subscription request.")

    new_sub = SubscriptionRequest(
        user_id=current_user.id,
        screenshot_url=req.screenshot_url,
        requested_folders=req.requested_folders,
        status="pending"
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    # Let's populate the user email manually for the response, though technically user is a relationship
    response = SubscriptionRequestResponse.model_validate(new_sub)
    response.user_email = current_user.email
    return response

@router.get("/status")
def check_subscription_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(SubscriptionRequest).filter(
        SubscriptionRequest.user_id == current_user.id,
        SubscriptionRequest.status == "pending"
    ).first()

    from app.models import Gallery
    owned = db.query(Gallery).filter(Gallery.owner_id == current_user.id).count()

    return {
        "allowed_galleries": current_user.folder_limit,
        "owned_galleries": owned,
        "can_create_gallery": owned < current_user.folder_limit,
        "has_pending_request": req is not None
    }

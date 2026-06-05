from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import User, SubscriptionRequest, SiteSettings
from app.routers.auth import get_current_user
from app.schemas import SubscriptionRequestCreate, SubscriptionRequestResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/subscription", tags=["Subscription"])

def auto_verify_subscription(request_id: str):
    db = SessionLocal()
    try:
        from app.services.google_service import google_ai
        from google.genai import types
        import requests
        import json

        req = db.query(SubscriptionRequest).filter(SubscriptionRequest.id == request_id).first()
        if not req or req.status != "pending":
            return

        logger.info(f"Starting Gemini auto-verification for subscription request {request_id}...")

        prompt = """
        Analyze this image. It is a screenshot submitted by a user as proof of payment for a premium photo gallery subscription.
        Determine:
        1. Is this a valid payment receipt, transaction confirmation, or transfer successful screenshot? (e.g. Google Pay, PhonePe, Paytm, UPI, Bank Transfer, Stripe receipt, etc.)
        2. What is the approximate payment amount mentioned?
        3. What is the transaction ID or reference number?
        
        Respond with a JSON object containing the keys:
        - "is_valid": true/false (must be true only if it is a successful payment confirmation receipt)
        - "amount": string or number
        - "transaction_id": string
        - "reason": brief explanation of your decision
        """

        response = requests.get(req.screenshot_url, timeout=20)
        if response.status_code == 200:
            mime_type = response.headers.get("content-type", "image/jpeg")
            
            res = google_ai.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(data=response.content, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            data = json.loads(res.text)
            logger.info(f"Gemini verification result: {data}")
            
            if data.get("is_valid") is True:
                req.status = "approved"
                user = db.query(User).filter(User.id == req.user_id).first()
                if user:
                    user.folder_limit += req.requested_folders
                db.commit()
                logger.info(f"Subscription request {request_id} AUTO-APPROVED by Gemini. Reason: {data.get('reason')}")
            else:
                logger.info(f"Subscription request {request_id} Gemini verification failed: {data.get('reason')}")
        else:
            logger.error(f"Could not download payment receipt screenshot. HTTP Status: {response.status_code}")
    except Exception as e:
        logger.error(f"Error during subscription auto-verification: {e}")
    finally:
        db.close()

@router.get("/qr")
def get_payment_qr(db: Session = Depends(get_db)):
    setting = db.query(SiteSettings).filter(SiteSettings.key == "payment_qr_url").first()
    if not setting or not setting.value:
        return {"qr_url": None}
    return {"qr_url": setting.value}

@router.post("/request", response_model=SubscriptionRequestResponse)
def submit_subscription_request(
    req: SubscriptionRequestCreate,
    background_tasks: BackgroundTasks,
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

    # Queue Gemini verification in the background
    background_tasks.add_task(auto_verify_subscription, str(new_sub.id))

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

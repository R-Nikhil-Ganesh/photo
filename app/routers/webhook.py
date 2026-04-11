import logging
from fastapi import APIRouter, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
from app.schemas import ClientUploadWebhook
from app.models import Photo, IndexedFace, Gallery, GalleryInvite, User
from app.services.email_service import send_matched_photos_email

router = APIRouter(prefix="/webhook", tags=["Webhook"])
logger = logging.getLogger(__name__)
DISTANCE_THRESHOLD = 0.5

def match_invited_users(db: Session, gallery_id: str, new_photo_id: str):
    """
    Checks all users invited to this gallery. If their encoding matches
    faces in the newly uploaded photo, fires an email to them!
    """
    # Find all invites for this gallery
    invites = db.query(GalleryInvite).filter(GalleryInvite.gallery_id == gallery_id).all()
    
    for invite in invites:
        # Get the registered user
        user = db.query(User).filter(User.email == invite.user_email).first()
        if not user or not user.face_encoding:
            continue

        # Convert float[] to string for pgvector query
        encoding_str = f"[{','.join(map(str, user.face_encoding))}]"
        
        # Look for matches specifically in this newly uploaded photo
        query = text(f"""
            SELECT DISTINCT p.url
            FROM photos p
            JOIN indexed_faces f ON p.id = f.photo_id
            WHERE p.id = :photo_id
            AND f.encoding <-> :user_encoding < :threshold
        """)

        result = db.execute(query, {
            "photo_id": new_photo_id,
            "user_encoding": encoding_str,
            "threshold": DISTANCE_THRESHOLD
        })

        matched_urls = [row[0] for row in result]
        
        if matched_urls:
            gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
            logger.info(f"Matched User {user.email} with {len(matched_urls)} photos! Triggering email.")
            # Trigger Email!
            send_matched_photos_email(user.email, gallery.name, matched_urls)


def process_and_index_faces(webhook_data: dict, gallery_id_str: str):
    db = SessionLocal()
    try:
        gallery = db.query(Gallery).filter(Gallery.id == gallery_id_str).first()
        if not gallery:
            return

        # 1. Create a Photo record
        new_photo = Photo(
            gallery_id=gallery.id,
            cloudinary_public_id=webhook_data['public_id'],
            width=webhook_data['width'],
            height=webhook_data['height'],
            url=webhook_data['secure_url']
        )
        db.add(new_photo)
        db.commit()
        db.refresh(new_photo)

        # 2. Save pre-computed IndexedFaces
        faces = webhook_data.get('faces', [])
        for face in faces:
            indexed_face = IndexedFace(
                photo_id=new_photo.id,
                encoding=face['encoding'],
                bounding_box=face['box']
            )
            db.add(indexed_face)
        db.commit()

        # 3. AUTOMATED MATCHING: Check if this new photo matches any invited users!
        match_invited_users(db, gallery.id, new_photo.id)

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
    finally:
        db.close()


@router.post("/cloudinary/{gallery_id}")
def cloudinary_webhook(gallery_id: str, payload: ClientUploadWebhook, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_and_index_faces, payload.model_dump(), gallery_id)
    return {"status": "ok", "message": "Indexing and matching process started."}

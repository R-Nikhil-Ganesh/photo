import logging
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.schemas import ClientUploadWebhook
from app.models import Photo, IndexedFace, Gallery, User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/webhook", tags=["Webhook"])
logger = logging.getLogger(__name__)

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

        logger.info(f"Successfully processed upload for {new_photo.url} with {len(faces)} faces.")

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
    finally:
        db.close()

@router.post("/cloudinary/{gallery_id}")
def cloudinary_webhook(
    gallery_id: str, 
    payload: ClientUploadWebhook, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    # Check image count limit
    db = SessionLocal()
    try:
        gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
        if not gallery or gallery.owner_id is None:
            return {"status": "error", "message": "Gallery not found or is a read-only demo."}
            
        photo_count = db.query(Photo).filter(Photo.gallery_id == gallery_id).count()
        if photo_count >= 200:
            return {"status": "error", "message": "Gallery full. Max 200 photos."}
    finally:
        db.close()

    background_tasks.add_task(process_and_index_faces, payload.model_dump(), gallery_id)
    return {"status": "ok", "message": "Indexing process started."}

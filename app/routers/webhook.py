import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.schemas import ClientUploadWebhook
from app.models import Photo, IndexedFace, Gallery

router = APIRouter(prefix="/webhook", tags=["Webhook"])

logger = logging.getLogger(__name__)

def process_and_index_faces(webhook_data: dict, gallery_id_str: str):
    """
    Saves the pre-computed faces sent by the frontend directly to the database.
    This avoids downloading the image entirely on the backend!
    """
    db = SessionLocal()
    try:
        # Check if gallery exists
        gallery = db.query(Gallery).filter(Gallery.id == gallery_id_str).first()
        if not gallery:
            logger.error(f"Gallery {gallery_id_str} not found. Cannot process photo.")
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

        # 2. Save IndexedFaces
        faces = webhook_data.get('faces', [])
        for face in faces:
            indexed_face = IndexedFace(
                photo_id=new_photo.id,
                encoding=face['encoding'],
                bounding_box=face['box']
            )
            db.add(indexed_face)
        
        db.commit()
        logger.info(f"Successfully indexed {len(faces)} pre-computed faces for photo {new_photo.id}")

    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
    finally:
        db.close()


@router.post("/cloudinary/{gallery_id}")
def cloudinary_webhook(gallery_id: str, payload: ClientUploadWebhook, background_tasks: BackgroundTasks):
    """
    The frontend calls this endpoint when an upload finishes successfully,
    passing the Cloudinary URL AND the pre-computed face vectors.
    """
    background_tasks.add_task(process_and_index_faces, payload.model_dump(), gallery_id)
    
    return {"status": "ok", "message": "Vectors saving to database."}

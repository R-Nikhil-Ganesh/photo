from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Gallery, Photo
from app.routers.auth import get_current_user
from app.services.google_service import google_ai
import cloudinary.uploader
from app.services.cloudinary_service import init_cloudinary
from pydantic import BaseModel
import io

router = APIRouter(prefix="/ai", tags=["AI Integration"])

class GenerateImageRequest(BaseModel):
    gallery_id: str
    prompt: str
    aspect_ratio: str = "1:1"

class AnalyzeImageRequest(BaseModel):
    image_url: str
    prompt: str

@router.post("/generate-to-gallery")
def generate_and_upload_to_gallery(
    req: GenerateImageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a high-quality image using Imagen 3 based on user prompt,
    uploads it to Cloudinary, auto-tags it with Gemini, and saves it in the gallery.
    """
    # Check if gallery exists and is owned by current user
    gallery = db.query(Gallery).filter(Gallery.id == req.gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    if gallery.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this gallery")

    try:
        # Initialize Cloudinary
        init_cloudinary()
        
        # 1. Generate image bytes using Imagen 3
        img_bytes = google_ai.generate_image(req.prompt, req.aspect_ratio)
        
        # 2. Upload to Cloudinary from memory
        upload_result = cloudinary.uploader.upload(
            io.BytesIO(img_bytes),
            folder=f"galleries/{gallery.id}"
        )
        
        # 3. Use Gemini to describe and tag the newly generated image for search indexing
        metadata = google_ai.generate_image_metadata(upload_result['secure_url'])
        
        # 4. Save to Database
        new_photo = Photo(
            gallery_id=gallery.id,
            cloudinary_public_id=upload_result['public_id'],
            width=upload_result.get('width', 1024),
            height=upload_result.get('height', 1024),
            url=upload_result['secure_url'],
            description=metadata.get("description", req.prompt),
            tags=metadata.get("tags", "imagen, generated, ai")
        )
        db.add(new_photo)
        db.commit()
        db.refresh(new_photo)
        
        return {
            "status": "success",
            "photo": {
                "id": str(new_photo.id),
                "url": new_photo.url,
                "description": new_photo.description,
                "tags": new_photo.tags
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate and upload image: {e}")

@router.post("/analyze-image")
async def analyze_image_url(
    req: AnalyzeImageRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Multimodal image analysis. Ask Gemini any question about an uploaded image.
    """
    try:
        result = await google_ai.analyze_image_url(req.prompt, req.image_url)
        return {"analysis": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

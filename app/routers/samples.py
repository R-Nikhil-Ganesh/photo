from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Gallery, Photo, IndexedFace
import secrets
import random

router = APIRouter(prefix="/samples", tags=["Samples"])

@router.post("/seed")
def seed_sample_gallery(db: Session = Depends(get_db)):
    # Check if a sample gallery already exists
    existing = db.query(Gallery).filter(Gallery.name == "Wedding Demo Gallery").first()
    if existing:
        return {"access_link": existing.access_link}

    # Create Gallery
    access_link = "framy-demo-sample" # Fixed slug for the demo
    new_gallery = Gallery(
        name="Wedding Demo Gallery",
        access_link=access_link,
        owner_id=None # No owner for sample
    )
    db.add(new_gallery)
    db.commit()
    db.refresh(new_gallery)

    # Sample Photo URLs (High quality unsplash Portraits - strictly human faces)
    sample_images = [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce",
        "https://images.unsplash.com/photo-1521119989657-183403b86968",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9"
    ]

    for url in sample_images:
        photo = Photo(
            gallery_id=new_gallery.id,
            url=url,
            # Force a placeholder ID to indicate these are immutable system samples
            cloudinary_public_id=f"framy_demo_{secrets.token_hex(4)}",
            width=1200,
            height=1600
        )
        db.add(photo)
        db.flush() 

        # Add 1 distinct face per photo for the demo tray
        random_vec = [random.uniform(-0.1, 0.1) + (0.05 * sample_images.index(url)) for _ in range(128)]
        face = IndexedFace(
            photo_id=photo.id,
            encoding=random_vec,
            bounding_box=None # Allow UI to use AI auto-crop (g_face) instead of fixed coordinates
        )
        db.add(face)
    
    db.commit()
    return {"access_link": access_link}

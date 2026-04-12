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

    # Sample Photo URLs (High quality unsplash wedding/event)
    sample_images = [
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622",
        "https://images.unsplash.com/photo-1519741497674-611481863552",
        "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf",
        "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3",
        "https://images.unsplash.com/photo-1513151233558-d860c5398176",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
        "https://images.unsplash.com/photo-1504703395950-b89145a5425b",
        "https://images.unsplash.com/photo-1520853502300-5d9a04be514d"
    ]

    for url in sample_images:
        photo = Photo(
            gallery_id=new_gallery.id,
            url=url,
            cloudinary_public_id=f"sample_{secrets.token_hex(4)}",
            width=1200,
            height=800
        )
        db.add(photo)
        db.flush() # get ID

        # Add 1-2 "synthetic" faces per photo so the UI bubbles appear
        for _ in range(random.randint(1, 2)):
            # Generate a random 128D vector
            random_vec = [random.uniform(-0.1, 0.1) for _ in range(128)]
            face = IndexedFace(
                photo_id=photo.id,
                encoding=random_vec,
                bounding_box={"top": 100, "right": 200, "bottom": 300, "left": 100}
            )
            db.add(face)
    
    db.commit()
    return {"access_link": access_link}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Gallery, User
from app.schemas import GalleryCreate, GalleryResponse
from app.routers.auth import get_current_user
import secrets
from typing import List

router = APIRouter(prefix="/gallery", tags=["Gallery"])

@router.post("/", response_model=GalleryResponse)
def create_gallery(
    gallery_in: GalleryCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check folder limits
    gallery_count = db.query(Gallery).filter(Gallery.owner_id == current_user.id).count()
    if gallery_count >= current_user.folder_limit:
        raise HTTPException(status_code=403, detail="FOLDER_LIMIT_REACHED")

    # Generate a random unique access link
    access_link = secrets.token_urlsafe(8)
    
    new_gallery = Gallery(
        name=gallery_in.name,
        access_link=access_link,
        owner_id=current_user.id
    )
    db.add(new_gallery)
    db.commit()
    db.refresh(new_gallery)
    
    return new_gallery

@router.get("/my", response_model=List[GalleryResponse])
def get_my_galleries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Gallery).filter(Gallery.owner_id == current_user.id).all()

@router.get("/{access_link}", response_model=GalleryResponse)
def get_gallery(access_link: str, db: Session = Depends(get_db)):
    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    return gallery
@router.get("/{gallery_id}/photos")
def get_gallery_photos(
    gallery_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    if gallery.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view entire gallery")

    return [{"url": p.url, "id": str(p.id)} for p in gallery.photos]

@router.get("/public/{access_link}")
def get_public_gallery_photos(access_link: str, db: Session = Depends(get_db)):
    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    return {
        "name": gallery.name,
        "photos": [{"url": p.url, "id": str(p.id)} for p in gallery.photos]
    }

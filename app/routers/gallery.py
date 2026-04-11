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

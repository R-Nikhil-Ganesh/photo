from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Gallery, User, Photo, IndexedFace
from app.schemas import GalleryCreate, GalleryResponse
from app.routers.auth import get_current_user
import secrets
from typing import List

router = APIRouter(prefix="/gallery", tags=["Gallery"])


@router.delete("/delete/{gallery_id}")
def delete_gallery(
    gallery_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    if gallery.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this gallery")

    # Remove Cloudinary assets and purge DB records
    import cloudinary.uploader
    for photo in gallery.photos:
        try:
            cloudinary.uploader.destroy(photo.cloudinary_public_id)
        except Exception:
            pass
        db.query(IndexedFace).filter(IndexedFace.photo_id == photo.id).delete()

    db.query(Photo).filter(Photo.gallery_id == gallery.id).delete(synchronize_session=False)
    db.delete(gallery)
    db.commit()
    return {"message": "Gallery deleted"}

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

@router.get("/public/{access_link}/faces")
def get_public_gallery_faces(access_link: str, db: Session = Depends(get_db)):
    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
        
    import math
    def l2_dist(v1, v2):
        return math.sqrt(sum((a - b)**2 for a, b in zip(v1, v2)))

    groups = []
    
    for photo in gallery.photos:
        for face in photo.faces:
            if face.encoding is None:
                continue
                
            vec = list(face.encoding)
            best_group = None
            best_dist = 0.52   # Stricter distance for distinct grouping
            
            for g in groups:
                dist = l2_dist(g["center"], vec)
                if dist < best_dist:
                    best_dist = dist
                    best_group = g
                    
            if best_group:
                best_group["matched_urls"].add(photo.url)
                
                # Dynamically update the centroid of the cluster (Geometric Drift)
                n = len(best_group["matched_urls"])
                best_group["center"] = [ ((c * (n - 1)) + v) / n for c, v in zip(best_group["center"], vec) ]
                
            else:
                groups.append({
                    "avatar_url": photo.url,
                    "bounding_box": face.bounding_box,
                    "matched_urls": {photo.url},
                    "center": vec
                })
                
    result = []
    for g in groups:
        # Only show faces that appear more than once to avoid showing random background blur faces as "people", unless the gallery is tiny
        # Wait, if we want to act like google photos, we show distinct faces. Let's just return all for now.
        result.append({
            "avatar_url": g["avatar_url"],
            "bounding_box": g["bounding_box"],
            "matched_urls": list(g["matched_urls"]),
            "count": len(g["matched_urls"])
        })
        
    result.sort(key=lambda x: x["count"], reverse=True)
    return result

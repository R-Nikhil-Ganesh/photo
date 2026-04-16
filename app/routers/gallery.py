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

    return [{"url": p.url, "id": str(p.id), "is_favorite": bool(p.is_favorite)} for p in gallery.photos]

@router.get("/public/{access_link}")
def get_public_gallery_photos(access_link: str, db: Session = Depends(get_db)):
    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    return {
        "name": gallery.name,
        "photos": [{"url": p.url, "id": str(p.id)} for p in gallery.photos]
    }

@router.post("/{gallery_id}/photos/{photo_id}/favorite")
def toggle_favorite(
    gallery_id: str,
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    if gallery.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.gallery_id == gallery.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    photo.is_favorite = 0 if photo.is_favorite else 1
    db.commit()
    return {"id": str(photo.id), "is_favorite": bool(photo.is_favorite)}


@router.get("/{gallery_id}/favorites")
def get_favorites(
    gallery_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gallery = db.query(Gallery).filter(Gallery.id == gallery_id).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    if gallery.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    favorites = db.query(Photo).filter(Photo.gallery_id == gallery.id, Photo.is_favorite == 1).all()
    return [{"url": p.url, "id": str(p.id), "is_favorite": True} for p in favorites]


@router.get("/public/{access_link}/faces")
def get_public_gallery_faces(access_link: str, db: Session = Depends(get_db)):
    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    import math

    def l2_dist(v1, v2):
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))

    # ── Step 1: collect all faces across the gallery ──────────────────────────
    all_faces = []  # { vec, photo_url, bounding_box, score }
    for photo in gallery.photos:
        for face in photo.faces:
            if face.encoding is None:
                continue
            vec = list(face.encoding)
            # Use bounding-box area as a proxy for face quality/size
            bb = face.bounding_box or [0, 0, 0, 0]
            area = max(0, (bb[2] - bb[0])) * max(0, (bb[1] - bb[3]))
            all_faces.append({
                "vec": vec,
                "photo_url": photo.url,
                "bounding_box": bb,
                "area": area,
            })

    if not all_faces:
        return []

    # ── Step 2: two-pass clustering ───────────────────────────────────────────
    # Pass 1 — build initial clusters with a relaxed threshold
    CLUSTER_THRESHOLD = 0.6   # generous enough to group same person across angles/lighting
    clusters = []  # { center, members: [{photo_url, bounding_box, area}], sum_vec }

    for face in all_faces:
        vec = face["vec"]
        best_idx, best_dist = -1, CLUSTER_THRESHOLD

        for ci, cluster in enumerate(clusters):
            d = l2_dist(cluster["center"], vec)
            if d < best_dist:
                best_dist = d
                best_idx = ci

        if best_idx >= 0:
            c = clusters[best_idx]
            c["members"].append(face)
            # Incremental mean update — more stable than geometric drift
            n = len(c["members"])
            c["center"] = [(c["sum_vec"][i] + vec[i]) / n for i in range(128)]
            c["sum_vec"] = [c["sum_vec"][i] + vec[i] for i in range(128)]
        else:
            clusters.append({
                "center": vec,
                "sum_vec": vec[:],
                "members": [face],
            })

    # Pass 2 — merge clusters whose centres are still close after averaging
    # (handles the case where two sub-clusters of the same person formed)
    MERGE_THRESHOLD = 0.55
    merged = True
    while merged:
        merged = False
        new_clusters = []
        used = set()
        for i, ci in enumerate(clusters):
            if i in used:
                continue
            for j, cj in enumerate(clusters):
                if j <= i or j in used:
                    continue
                if l2_dist(ci["center"], cj["center"]) < MERGE_THRESHOLD:
                    # Merge cj into ci
                    ci["members"].extend(cj["members"])
                    n = len(ci["members"])
                    ci["sum_vec"] = [ci["sum_vec"][k] + cj["sum_vec"][k] for k in range(128)]
                    ci["center"] = [ci["sum_vec"][k] / n for k in range(128)]
                    used.add(j)
                    merged = True
            new_clusters.append(ci)
        clusters = new_clusters

    # ── Step 3: build response ────────────────────────────────────────────────
    result = []
    for cluster in clusters:
        members = cluster["members"]
        unique_urls = list({m["photo_url"] for m in members})

        # Pick the best avatar: largest bounding box (clearest, most frontal face)
        best = max(members, key=lambda m: m["area"])

        bb = best["bounding_box"]
        result.append({
            "avatar_url": best["photo_url"],
            "bounding_box": bb,
            "matched_urls": unique_urls,
            "count": len(unique_urls),
        })

    result.sort(key=lambda x: x["count"], reverse=True)
    return result

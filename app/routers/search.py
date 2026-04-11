from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import Gallery, Photo, IndexedFace
from app.schemas import SearchRequest, SearchResponse

router = APIRouter(prefix="/search", tags=["Search"])

DISTANCE_THRESHOLD = 0.5

@router.post("/{access_link}", response_model=SearchResponse)
def search_faces_in_gallery(
    access_link: str, 
    payload: SearchRequest, 
    db: Session = Depends(get_db)
):
    """
    Frontend sends the pre-computed 128D vector of the user's selfie.
    We return Cloudinary public IDs of matched photos in the gallery.
    """
    if len(payload.encoding) != 128:
        raise HTTPException(status_code=400, detail="Invalid embedding size. Must be 128D.")

    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    # Format array for pgvector
    encoding_str = f"[{','.join(map(str, payload.encoding))}]"
    
    query = text(f"""
        SELECT DISTINCT p.cloudinary_public_id
        FROM photos p
        JOIN indexed_faces f ON p.id = f.photo_id
        WHERE p.gallery_id = :gallery_id
        AND f.encoding <-> :encoding < :threshold
    """)

    result = db.execute(query, {
        "gallery_id": gallery.id,
        "encoding": encoding_str,
        "threshold": DISTANCE_THRESHOLD
    })

    matched_ids = [row[0] for row in result]

    return {"matched_public_ids": matched_ids}

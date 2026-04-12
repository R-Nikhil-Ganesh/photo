from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import Gallery, User
from app.routers.auth import get_current_user
from app.schemas import SearchResponse

router = APIRouter(prefix="/search", tags=["Search"])

DISTANCE_THRESHOLD = 0.6  # Looser threshold for more matches

@router.get("/{access_link}", response_model=SearchResponse)
def search_faces_in_gallery(
    access_link: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    User hits this endpoint with a valid JWT.
    We pull their 128D encoding directly from the DB and execute the pgvector search.
    No need for them to send large arrays!
    """
    if not current_user.face_encoding or len(current_user.face_encoding) != 128:
        raise HTTPException(status_code=400, detail="User has no face encoding setup.")

    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    # Format array for pgvector
    encoding_str = f"[{','.join(map(str, current_user.face_encoding))}]"
    
    query = text(f"""
        SELECT DISTINCT p.url
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

    # Return fully formatted Cloudinary URLs!
    matched_urls = [row[0] for row in result]

    return {"matched_public_ids": matched_urls}

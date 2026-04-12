from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.database import get_db
from app.models import Gallery, User
from app.routers.auth import get_current_user
from app.schemas import SearchResponse, SearchRequest

router = APIRouter(prefix="/search", tags=["Search"])

DISTANCE_THRESHOLD = 0.65  # Looser threshold for more matches

def _run_vector_search(db: Session, gallery_id, encoding: list) -> list:
    """
    Common helper that executes the pgvector nearest-neighbour query.
    Returns a list of matching photo URLs.
    """
    encoding_str = f"[{','.join(map(str, encoding))}]"

    query = text("""
        SELECT DISTINCT p.url
        FROM photos p
        JOIN indexed_faces f ON p.id = f.photo_id
        WHERE p.gallery_id = :gallery_id
        AND f.encoding <-> cast(:encoding as vector) < :threshold
    """)

    result = db.execute(query, {
        "gallery_id": gallery_id,
        "encoding": encoding_str,
        "threshold": DISTANCE_THRESHOLD
    })

    return [row[0] for row in result]


@router.get("/{access_link}", response_model=SearchResponse)
def search_faces_authenticated(
    access_link: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Authenticated users hit this endpoint with a valid JWT.
    Their 128D encoding is pulled directly from the DB — no upload needed.
    Used by GalleryView when a logged-in user wants to filter by their face.
    """
    if current_user.face_encoding is None or len(current_user.face_encoding) != 128:
        raise HTTPException(
            status_code=400,
            detail="No face profile found. Please complete your profile setup first."
        )

    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    matched_urls = _run_vector_search(db, gallery.id, list(current_user.face_encoding))
    return {"matched_public_ids": matched_urls}


@router.post("/{access_link}", response_model=SearchResponse)
def search_faces_guest(
    access_link: str,
    body: SearchRequest,
    db: Session = Depends(get_db)
):
    """
    Guest / unauthenticated flow used by FindMeCapture.
    The frontend runs face-api.js locally and POSTs the 128D encoding here.
    No login required — anyone with the invite link can find their photos.
    """
    if not body.encoding or len(body.encoding) != 128:
        raise HTTPException(
            status_code=400,
            detail="A valid 128-dimension face encoding is required."
        )

    gallery = db.query(Gallery).filter(Gallery.access_link == access_link).first()
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")

    matched_urls = _run_vector_search(db, gallery.id, body.encoding)
    return {"matched_public_ids": matched_urls}

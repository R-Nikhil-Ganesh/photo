from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import Gallery, User
from app.routers.auth import get_current_user
from app.schemas import SearchResponse, SearchRequest

router = APIRouter(prefix="/search", tags=["Search"])

# Primary threshold — photos where ANY face is within this distance are included
PRIMARY_THRESHOLD = 0.55
# Fallback threshold — used if primary returns zero results (looser net)
FALLBACK_THRESHOLD = 0.68

def _run_vector_search(db: Session, gallery_id, encoding: list) -> list:
    """
    Two-pass ranked search:
    1. Tight pass — high-confidence matches
    2. Fallback pass — catches the same person in difficult lighting/angles
    Returns deduplicated photo URLs ordered by best match distance.
    """
    encoding_str = f"[{','.join(map(str, encoding))}]"

    # Ranked query — returns (url, best_distance) per photo
    query = text("""
        SELECT p.url, MIN(f.encoding <-> cast(:encoding as vector)) AS best_dist
        FROM photos p
        JOIN indexed_faces f ON p.id = f.photo_id
        WHERE p.gallery_id = :gallery_id
        GROUP BY p.url
        HAVING MIN(f.encoding <-> cast(:encoding as vector)) < :threshold
        ORDER BY best_dist ASC
    """)

    def run(threshold):
        rows = db.execute(query, {
            "gallery_id": gallery_id,
            "encoding": encoding_str,
            "threshold": threshold,
        }).fetchall()
        return [row[0] for row in rows]

    results = run(PRIMARY_THRESHOLD)
    if not results:
        results = run(FALLBACK_THRESHOLD)

    return results


@router.get("/{access_link}", response_model=SearchResponse)
def search_faces_authenticated(
    access_link: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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

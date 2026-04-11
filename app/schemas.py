from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional

class GalleryCreate(BaseModel):
    name: str

class GalleryResponse(BaseModel):
    id: UUID
    name: str
    access_link: str

    class Config:
        from_attributes = True

# We now accept the pre-computed face vectors from the frontend
class FaceData(BaseModel):
    encoding: List[float] # 128D array
    box: List[int]        # [top, right, bottom, left]

class ClientUploadWebhook(BaseModel):
    public_id: str
    secure_url: str
    width: int
    height: int
    faces: List[FaceData] # The frontend extracts these and sends them to us!

class SearchRequest(BaseModel):
    encoding: List[float] # 128D array sent from frontend

class SearchResponse(BaseModel):
    matched_public_ids: List[str]

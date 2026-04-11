import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSON
from pgvector.sqlalchemy import Vector
from .database import Base

class Gallery(Base):
    __tablename__ = "galleries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, index=True)
    access_link = Column(String, unique=True, index=True)

class Photo(Base):
    __tablename__ = "photos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gallery_id = Column(UUID(as_uuid=True), ForeignKey("galleries.id"))
    cloudinary_public_id = Column(String, index=True)
    width = Column(Integer)
    height = Column(Integer)
    url = Column(String)

class IndexedFace(Base):
    __tablename__ = "indexed_faces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photo_id = Column(UUID(as_uuid=True), ForeignKey("photos.id"))
    encoding = Column(Vector(128))
    bounding_box = Column(JSON) # [top, right, bottom, left]

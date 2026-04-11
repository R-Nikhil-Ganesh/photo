import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSON
from pgvector.sqlalchemy import Vector
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    google_id = Column(String, unique=True, index=True)
    face_encoding = Column(Vector(128)) # The user's persistent selfie encoding

class Gallery(Base):
    __tablename__ = "galleries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    name = Column(String, index=True)
    access_link = Column(String, unique=True, index=True)

class GalleryInvite(Base):
    __tablename__ = "gallery_invites"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gallery_id = Column(UUID(as_uuid=True), ForeignKey("galleries.id"))
    user_email = Column(String) # Email of the invited user

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

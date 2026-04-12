from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import gallery, webhook, search, auth, admin, subscription, samples
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)

# Setup Vector extension manually using raw SQL before tables are created
try:
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
except Exception as e:
    logging.error(f"Could not enable pgvector extension: {e}")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Framy API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(gallery.router)
app.include_router(webhook.router)
app.include_router(search.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(subscription.router)
app.include_router(samples.router)

@app.get("/")
def root():
    return {"message": "Framy API is running. Check /docs for documentation."}

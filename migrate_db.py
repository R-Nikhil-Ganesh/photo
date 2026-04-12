import os
from sqlalchemy import text
from app.database import engine, Base
from app.models import User, SubscriptionRequest, SiteSettings

print("Creating new tables if they don't exist...")
Base.metadata.create_all(bind=engine)

print("Adding folder_limit column to users table if not exists...")
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN folder_limit INTEGER DEFAULT 1;"))
        conn.commit()
    print("Column folder_limit added.")
except Exception as e:
    print(f"Column might already exist or error: {e}")

print("DB init complete.")

"""
Script to insert a payment (subscription request) record for a user.

Usage:
    python insert_payment_record.py --email user@example.com --screenshot "https://example.com/screenshot.png"
    python insert_payment_record.py --email user@example.com --screenshot "https://example.com/screenshot.png" --folders 3

Arguments:
    --email       : The email address of the user making the payment
    --screenshot  : URL of the payment screenshot (e.g. Cloudinary URL)
    --folders     : Number of folder slots requested (default: 1)
    --approve     : Auto-approve the request and increase the user's folder limit
"""

import argparse
import uuid
import sys
import os

# Ensure the project root is in sys.path so we can import `app`
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User, SubscriptionRequest


def main():
    parser = argparse.ArgumentParser(description="Insert a payment record for a user")
    parser.add_argument("--email", required=True, help="User's email address")
    parser.add_argument("--screenshot", required=True, help="URL of the payment screenshot")
    parser.add_argument("--folders", type=int, default=1, help="Number of folder slots requested (default: 1)")
    parser.add_argument("--approve", action="store_true", help="Auto-approve the request and increase folder limit")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        # ── 1. Look up the user by email ──
        user = db.query(User).filter(User.email == args.email).first()
        if not user:
            print(f"❌ No user found with email: {args.email}")
            print("\nExisting users:")
            all_users = db.query(User).all()
            if not all_users:
                print("   (no users in the database)")
            for u in all_users:
                print(f"   • {u.email}  (id: {u.id})")
            sys.exit(1)

        print(f"✅ Found user: {user.name or 'N/A'} ({user.email})")
        print(f"   Current folder limit: {user.folder_limit}")

        # ── 2. Check for existing pending request ──
        existing = db.query(SubscriptionRequest).filter(
            SubscriptionRequest.user_id == user.id,
            SubscriptionRequest.status == "pending"
        ).first()
        if existing:
            print(f"⚠️  User already has a pending request (id: {existing.id})")
            print(f"   Screenshot: {existing.screenshot_url}")
            proceed = input("   Insert another record anyway? (y/N): ").strip().lower()
            if proceed != "y":
                print("Aborted.")
                sys.exit(0)

        # ── 3. Create the subscription request record ──
        status = "approved" if args.approve else "pending"
        new_record = SubscriptionRequest(
            id=uuid.uuid4(),
            user_id=user.id,
            screenshot_url=args.screenshot,
            requested_folders=args.folders,
            status=status,
        )
        db.add(new_record)

        # ── 4. If auto-approving, bump the user's folder limit ──
        if args.approve:
            user.folder_limit += args.folders
            print(f"🔓 Auto-approved: folder limit increased to {user.folder_limit}")

        db.commit()
        db.refresh(new_record)

        print(f"\n🎉 Payment record inserted successfully!")
        print(f"   Record ID      : {new_record.id}")
        print(f"   User Email     : {args.email}")
        print(f"   Screenshot URL : {new_record.screenshot_url}")
        print(f"   Folders        : {new_record.requested_folders}")
        print(f"   Status         : {new_record.status}")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

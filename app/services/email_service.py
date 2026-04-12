import resend
from app.database import settings
import logging

resend.api_key = settings.resend_api_key

def send_matched_photos_email(user_email: str, gallery_name: str, photo_urls: list):
    """
    Sends an email to the user containing links to the photos they were found in.
    """
    if not settings.resend_api_key or settings.resend_api_key == "re_demo_key":
        logging.warning(f"Mock Email sent to {user_email} for gallery '{gallery_name}'. Found {len(photo_urls)} photos.")
        return

    html_links = "".join([
        f'<li><a href="{url}">View Photo</a></li>' for url in photo_urls
    ])

    html_content = f"""
    <h2>You were spotted!</h2>
    <p>Good news! Your host uploaded new photos to the <strong>{gallery_name}</strong> gallery, and our AI found you in them!</p>
    <ul>
        {html_links}
    </ul>
    """

    try:
        r = resend.Emails.send({
            "from": "Framy Alerts <onboarding@resend.dev>",
            "to": user_email,
            "subject": f"📸 New photos found of you in {gallery_name}!",
            "html": html_content
        })
        logging.info(f"Email sent successfully to {user_email}: {r}")
    except Exception as e:
        logging.error(f"Failed to send email to {user_email}: {e}")

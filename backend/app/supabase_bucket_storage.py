import os
import httpx


SUPABASE_URL = os.getenv("SUPABASE_URL")

SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

SUPABASE_AVATAR_BUCKET = os.getenv("SUPABASE_AVATAR_BUCKET", "avatars")


def public_avatar_path(user_id: str) -> str:
    return f"{SUPABASE_AVATAR_BUCKET}/{user_id}/profile"


def upload_avatar(user_id: str, data: bytes, content_type: str) -> str:
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{public_avatar_path(user_id)}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": content_type or "application/octet-stream",
        "x-upsert": "true",
    }
    with httpx.Client(timeout=10.0) as client:
        response = client.post(upload_url, content=data, headers=headers)
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Supabase upload failed ({response.status_code}): {response.text[:500]}")

    return public_avatar_path(user_id)

"""
Log redaction helpers for request/error payloads.
Parity: AUTH-001
"""
import json
import re
from typing import Any


REDACTED = "[REDACTED]"
SENSITIVE_KEYS = {
    "access_token",
    "accessToken",
    "apikey",
    "auth_code",
    "authCode",
    "authorization",
    "authorizationCode",
    "email",
    "id_token",
    "idToken",
    "jwt",
    "parent_email",
    "parentEmail",
    "parent_email_enc",
    "parent_phone",
    "parentPhone",
    "parent_phone_enc",
    "phone",
    "phone_number",
    "refresh_token",
    "refreshToken",
    "serviceRoleKey",
    "service_role_key",
    "supabaseServiceRoleKey",
    "supabase_service_role_key",
    "toss_user_key",
    "tossUserKey",
    "userKey",
}
SENSITIVE_ASSIGNMENT = re.compile(
    r"(?i)(authorizationCode|authorization[_-]?code|authCode|auth[_-]?code|accessToken|access[_-]?token|refreshToken|refresh[_-]?token|idToken|id[_-]?token|tossUserKey|toss[_-]?user[_-]?key|userKey|jwt|apiKey|api[_-]?key|serviceRoleKey|service[_-]?role[_-]?key|supabaseServiceRoleKey|supabase[_-]?service[_-]?role[_-]?key)"
    r"([\"'\s:=]+)"
    r"([^\"'\s,&}]+)"
)
BEARER_TOKEN = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+")
JWT_LIKE = re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")
EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE = re.compile(r"(?<!\d)(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}(?!\d)")


def _normalize_key(key: str) -> str:
    return key.replace("_", "").replace("-", "").lower()


def _is_sensitive_key(key: str) -> bool:
    normalized = _normalize_key(key)
    return any(_normalize_key(candidate) == normalized for candidate in SENSITIVE_KEYS)


def _redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: REDACTED if _is_sensitive_key(key) else _redact_value(nested)
            for key, nested in value.items()
        }
    if isinstance(value, list):
        return [_redact_value(item) for item in value]
    if isinstance(value, str):
        return redact_text(value)
    return value


def redact_text(value: str) -> str:
    """Redact common token and PII shapes in unstructured log text."""
    redacted = SENSITIVE_ASSIGNMENT.sub(lambda match: f"{match.group(1)}{match.group(2)}{REDACTED}", value)
    redacted = BEARER_TOKEN.sub(f"Bearer {REDACTED}", redacted)
    redacted = JWT_LIKE.sub(REDACTED, redacted)
    redacted = EMAIL.sub(REDACTED, redacted)
    redacted = PHONE.sub(REDACTED, redacted)
    return redacted


def redact_body_for_log(raw: bytes, limit: int = 500) -> str:
    """Return a bounded, redacted body string for logs."""
    text = raw.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return redact_text(text)[:limit]

    try:
        return json.dumps(_redact_value(parsed), ensure_ascii=False, separators=(",", ":"))[:limit]
    except (TypeError, ValueError):
        return redact_text(text)[:limit]

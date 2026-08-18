"""
Request log redaction tests.
Parity: AUTH-001
"""
import json

from app.core.log_redaction import REDACTED, redact_body_for_log, redact_text


def test_redact_body_for_log_masks_auth_tokens_and_pii_keys():
    raw = json.dumps(
        {
            "authorizationCode": "secret-auth-code",
            "auth_code": "secret-alt-auth-code",
            "access_token": "eyJhbGciOi.fake.signature",
            "idToken": "secret-id-token",
            "jwt": "secret-jwt",
            "refreshToken": "secret-refresh",
            "service_role_key": "secret-service-role",
            "supabaseServiceRoleKey": "secret-supabase-service-role",
            "profile": {
                "email": "parent@example.com",
                "phone_number": "010-1234-5678",
                "parentPhone": "010-7777-8888",
            },
            "safe": "visible",
        }
    ).encode()

    redacted = redact_body_for_log(raw)

    assert "secret-auth-code" not in redacted
    assert "secret-alt-auth-code" not in redacted
    assert "eyJhbGciOi.fake.signature" not in redacted
    assert "secret-id-token" not in redacted
    assert "secret-jwt" not in redacted
    assert "secret-refresh" not in redacted
    assert "secret-service-role" not in redacted
    assert "secret-supabase-service-role" not in redacted
    assert "parent@example.com" not in redacted
    assert "010-1234-5678" not in redacted
    assert "010-7777-8888" not in redacted
    assert f'"authorizationCode":"{REDACTED}"' in redacted
    assert '"safe":"visible"' in redacted


def test_redact_text_masks_unstructured_tokens_and_pii():
    text = (
        "Authorization: Bearer eyJhbGciOiJ.fake.signature "
        "authorizationCode=secret-code authorization_code=secret-underscore-code auth_code=secret-alt-code "
        "access_token=secret-token accessToken=secret-camel-access "
        "id_token=secret-id-token idToken=secret-camel-id jwt=secret-jwt "
        "service_role_key=secret-service-role serviceRoleKey=secret-camel-service-role "
        "supabaseServiceRoleKey=secret-camel-supabase-service-role apikey=secret-api-key apiKey=secret-camel-api-key "
        "tossUserKey=secret-camel-toss-user-key "
        "contact parent@example.com 01012345678"
    )

    redacted = redact_text(text)

    assert "eyJhbGciOiJ.fake.signature" not in redacted
    assert "secret-code" not in redacted
    assert "secret-underscore-code" not in redacted
    assert "secret-alt-code" not in redacted
    assert "secret-token" not in redacted
    assert "secret-camel-access" not in redacted
    assert "secret-id-token" not in redacted
    assert "secret-camel-id" not in redacted
    assert "secret-jwt" not in redacted
    assert "secret-service-role" not in redacted
    assert "secret-camel-service-role" not in redacted
    assert "secret-camel-supabase-service-role" not in redacted
    assert "secret-api-key" not in redacted
    assert "secret-camel-api-key" not in redacted
    assert "secret-camel-toss-user-key" not in redacted
    assert "parent@example.com" not in redacted
    assert "01012345678" not in redacted
    assert REDACTED in redacted

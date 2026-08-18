"""
리포트 서비스 검증 테스트 — 보호자 공유 인증
"""
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import date, datetime, timezone

import pytest
from fastapi import HTTPException

from app.core.exceptions import NotFoundException
from app.core.exceptions import ForbiddenException
from app.features.report import service as report_service
from app.features.report.schemas import CreateInteractionRequest, GenerateReportRequest
from app.features.report.service import (
    PARENT_SHARE_MAX_ATTEMPTS,
    create_interaction,
    generate_report,
    get_report_by_share_token,
    verify_parent_phone_last4,
    verify_report_access,
)


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _report_row():
    report = MagicMock()
    report.id = uuid4()
    report.dog_id = uuid4()
    report.report_date = date(2026, 6, 1)
    report.template_type = "hotel"
    report.created_by_org_id = uuid4()
    report.created_by_trainer_id = None
    report.behavior_summary = "summary"
    report.condition_notes = "notes"
    report.ai_coaching_oneliner = "coaching"
    report.seven_day_comparison = None
    report.highlight_photo_urls = []
    report.generation_status = "sent"
    report.ai_model = None
    report.ai_cost_usd = None
    report.generated_at = None
    report.scheduled_send_at = None
    report.sent_at = datetime.now(timezone.utc)
    report.share_token = "share-token"
    report.toss_share_url = None
    report.expires_at = datetime.now(timezone.utc)
    report.created_at = datetime.now(timezone.utc)
    return report


def _report_query_result(report):
    result = MagicMock()
    result.scalar_one_or_none.return_value = report
    return result


@pytest.fixture(autouse=True)
def reset_parent_share_attempts():
    report_service._reset_parent_share_attempts_for_tests()
    yield
    report_service._reset_parent_share_attempts_for_tests()


@pytest.mark.asyncio
async def test_get_report_by_share_token_requires_valid_last4_without_query():
    db = AsyncMock()

    with pytest.raises(NotFoundException):
        await get_report_by_share_token(db, "share-token", "12")

    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_get_report_by_share_token_returns_report_when_phone_matches():
    db = AsyncMock()
    report = _report_row()
    db.execute.return_value = _mock_scalar_result(report)

    result = await get_report_by_share_token(db, "share-token", "1234")

    assert result.id == report.id
    assert result.behavior_summary == "summary"
    assert not hasattr(result, "share_token")
    assert not hasattr(result, "ai_cost_usd")
    assert not hasattr(result, "created_by_org_id")
    db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_report_by_share_token_requires_active_org_dog_mapping():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result(_report_row())

    await get_report_by_share_token(db, "share-token", "1234")

    stmt = db.execute.call_args.args[0]
    assert "org_dogs.status = :status_1" in str(stmt)


@pytest.mark.asyncio
async def test_verify_parent_phone_last4_requires_active_org_dog_mapping():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result("1234")

    await verify_parent_phone_last4(db, "share-token", "1234")

    stmt = db.execute.call_args.args[0]
    assert "org_dogs.status = :status_1" in str(stmt)


@pytest.mark.asyncio
async def test_get_report_by_share_token_rejects_missing_or_mismatched_phone():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result(None)

    with pytest.raises(NotFoundException):
        await get_report_by_share_token(db, "share-token", "9999")


@pytest.mark.asyncio
async def test_verify_report_access_allows_org_member(monkeypatch):
    user_id = str(uuid4())
    report = _report_row()
    db = AsyncMock()
    db.execute.return_value = _report_query_result(report)
    verify_org = AsyncMock()
    verify_dog = AsyncMock()
    verify_org_dog = AsyncMock()
    monkeypatch.setattr(report_service, "verify_org_membership", verify_org)
    monkeypatch.setattr(report_service, "verify_dog_ownership", verify_dog)
    monkeypatch.setattr(report_service, "_verify_active_org_dog", verify_org_dog)

    result = await verify_report_access(db, report.id, user_id)

    assert result is report
    verify_org.assert_awaited_once_with(db, report.created_by_org_id, user_id)
    verify_org_dog.assert_awaited_once_with(db, report.created_by_org_id, report.dog_id)
    verify_dog.assert_not_awaited()


@pytest.mark.asyncio
async def test_verify_report_access_rejects_org_report_for_dog_outside_org(monkeypatch):
    user_id = str(uuid4())
    report = _report_row()
    db = AsyncMock()
    db.execute.side_effect = [
        _report_query_result(report),
        _mock_scalar_result(None),
    ]
    verify_org = AsyncMock()
    verify_dog = AsyncMock()
    monkeypatch.setattr(report_service, "verify_org_membership", verify_org)
    monkeypatch.setattr(report_service, "verify_dog_ownership", verify_dog)

    with pytest.raises(ForbiddenException):
        await verify_report_access(db, report.id, user_id)

    verify_org.assert_awaited_once_with(db, report.created_by_org_id, user_id)
    verify_dog.assert_not_awaited()


@pytest.mark.asyncio
async def test_verify_report_access_rejects_non_creator_trainer(monkeypatch):
    user_id = str(uuid4())
    report = _report_row()
    report.created_by_org_id = None
    report.created_by_trainer_id = uuid4()
    db = AsyncMock()
    db.execute.return_value = _report_query_result(report)
    verify_dog = AsyncMock(side_effect=ForbiddenException("Access denied"))
    monkeypatch.setattr(report_service, "verify_dog_ownership", verify_dog)

    with pytest.raises(ForbiddenException):
        await verify_report_access(db, report.id, user_id)

    verify_dog.assert_awaited_once_with(db, report.dog_id, user_id=user_id)


@pytest.mark.asyncio
async def test_verify_report_access_rechecks_creator_trainer_dog_ownership(monkeypatch):
    user_id = str(uuid4())
    report = _report_row()
    report.created_by_org_id = None
    report.created_by_trainer_id = user_id
    db = AsyncMock()
    db.execute.return_value = _report_query_result(report)
    verify_dog = AsyncMock()
    monkeypatch.setattr(report_service, "verify_dog_ownership", verify_dog)

    result = await verify_report_access(db, report.id, user_id)

    assert result is report
    verify_dog.assert_awaited_once_with(db, report.dog_id, user_id=user_id)


@pytest.mark.asyncio
async def test_verify_report_access_rejects_creator_trainer_foreign_dog(monkeypatch):
    user_id = str(uuid4())
    report = _report_row()
    report.created_by_org_id = None
    report.created_by_trainer_id = user_id
    db = AsyncMock()
    db.execute.return_value = _report_query_result(report)
    verify_dog = AsyncMock(side_effect=ForbiddenException("Access denied"))
    monkeypatch.setattr(report_service, "verify_dog_ownership", verify_dog)

    with pytest.raises(ForbiddenException):
        await verify_report_access(db, report.id, user_id)

    verify_dog.assert_awaited_once_with(db, report.dog_id, user_id=user_id)


@pytest.mark.asyncio
async def test_generate_report_rejects_spoofed_trainer_id(monkeypatch):
    db = AsyncMock()
    verify_dog = AsyncMock()
    monkeypatch.setattr(report_service, "verify_dog_ownership", verify_dog)
    user_id = str(uuid4())

    with pytest.raises(ForbiddenException):
        await generate_report(
            db,
            GenerateReportRequest(
                dog_id=str(uuid4()),
                report_date="2026-06-01",
                template_type="hotel",
                created_by_trainer_id=str(uuid4()),
            ),
            user_id=user_id,
        )

    verify_dog.assert_not_awaited()
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_generate_report_rejects_org_report_for_dog_outside_org(monkeypatch):
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result(None)
    verify_org = AsyncMock()
    verify_dog = AsyncMock()
    monkeypatch.setattr(report_service, "verify_org_membership", verify_org)
    monkeypatch.setattr(report_service, "verify_dog_ownership", verify_dog)
    user_id = str(uuid4())
    org_id = uuid4()

    with pytest.raises(ForbiddenException):
        await generate_report(
            db,
            GenerateReportRequest(
                dog_id=str(uuid4()),
                report_date="2026-06-01",
                template_type="hotel",
                created_by_org_id=str(org_id),
            ),
            user_id=user_id,
        )

    verify_org.assert_awaited_once_with(db, org_id, user_id)
    verify_dog.assert_not_awaited()
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_interaction_requires_parent_verification_when_unauthenticated():
    db = AsyncMock()

    with pytest.raises(ForbiddenException):
        await create_interaction(
            db,
            CreateInteractionRequest(
                report_id=str(uuid4()),
                interaction_type="like",
            ),
        )

    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_interaction_rejects_verification_for_different_report(monkeypatch):
    db = AsyncMock()
    verified_report = _report_row()
    verified_report.id = uuid4()
    requested_report_id = uuid4()
    get_by_token = AsyncMock(return_value=verified_report)
    monkeypatch.setattr(report_service, "get_report_by_share_token", get_by_token)

    with pytest.raises(ForbiddenException):
        await create_interaction(
            db,
            CreateInteractionRequest(
                report_id=str(requested_report_id),
                share_token="share-token",
                last4="1234",
                interaction_type="question",
                content="Can you explain this?",
            ),
        )

    get_by_token.assert_awaited_once_with(db, "share-token", "1234")
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_interaction_checks_report_access_when_authenticated(monkeypatch):
    db = AsyncMock()
    db.add = MagicMock()
    report_id = uuid4()
    user_id = str(uuid4())
    verify_access = AsyncMock()
    validate_response = MagicMock(return_value=MagicMock())
    monkeypatch.setattr(report_service, "verify_report_access", verify_access)
    monkeypatch.setattr(
        report_service.schemas.ParentInteractionResponse,
        "model_validate",
        validate_response,
    )

    await create_interaction(
        db,
        CreateInteractionRequest(
            report_id=str(report_id),
            parent_user_id=user_id,
            interaction_type="like",
        ),
        user_id=user_id,
    )

    verify_access.assert_awaited_once_with(db, report_id, user_id)
    interaction = db.add.call_args.args[0]
    assert str(interaction.parent_user_id) == user_id
    validate_response.assert_called_once()


@pytest.mark.asyncio
async def test_create_interaction_overrides_spoofed_parent_user_id_when_authenticated(monkeypatch):
    db = AsyncMock()
    db.add = MagicMock()
    report_id = uuid4()
    user_id = str(uuid4())
    spoofed_parent_id = str(uuid4())
    monkeypatch.setattr(report_service, "verify_report_access", AsyncMock())
    monkeypatch.setattr(
        report_service.schemas.ParentInteractionResponse,
        "model_validate",
        MagicMock(return_value=MagicMock()),
    )

    await create_interaction(
        db,
        CreateInteractionRequest(
            report_id=str(report_id),
            parent_user_id=spoofed_parent_id,
            interaction_type="like",
        ),
        user_id=user_id,
    )

    interaction = db.add.call_args.args[0]
    assert str(interaction.parent_user_id) == user_id
    assert str(interaction.parent_user_id) != spoofed_parent_id


@pytest.mark.asyncio
async def test_create_interaction_drops_parent_user_id_for_share_token_guest(monkeypatch):
    db = AsyncMock()
    db.add = MagicMock()
    report = _report_row()
    monkeypatch.setattr(report_service, "get_report_by_share_token", AsyncMock(return_value=report))
    monkeypatch.setattr(
        report_service.schemas.ParentInteractionResponse,
        "model_validate",
        MagicMock(return_value=MagicMock()),
    )

    await create_interaction(
        db,
        CreateInteractionRequest(
            report_id=str(report.id),
            parent_user_id=str(uuid4()),
            share_token="share-token",
            last4="1234",
            interaction_type="like",
        ),
    )

    interaction = db.add.call_args.args[0]
    assert interaction.parent_user_id is None


@pytest.mark.asyncio
async def test_verify_parent_phone_last4_returns_true_when_matched():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result("1234")

    result = await verify_parent_phone_last4(db, "share-token", "1234")

    assert result.verified is True


@pytest.mark.asyncio
async def test_verify_parent_phone_last4_returns_false_when_mismatched():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result("1234")

    result = await verify_parent_phone_last4(db, "share-token", "9999")

    assert result.verified is False


@pytest.mark.asyncio
async def test_verify_parent_phone_last4_rejects_invalid_last4_without_query():
    db = AsyncMock()

    result = await verify_parent_phone_last4(db, "share-token", "12")

    assert result.verified is False
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_verify_parent_phone_last4_throttles_repeated_failures_per_token_and_client():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result("1234")

    for _ in range(PARENT_SHARE_MAX_ATTEMPTS):
        result = await verify_parent_phone_last4(
            db,
            "share-token",
            "9999",
            attempt_key="203.0.113.10",
        )
        assert result.verified is False

    with pytest.raises(HTTPException) as exc:
        await verify_parent_phone_last4(
            db,
            "share-token",
            "9999",
            attempt_key="203.0.113.10",
        )

    assert exc.value.status_code == 429


@pytest.mark.asyncio
async def test_verify_parent_phone_last4_success_clears_failure_counter():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result("1234")

    for _ in range(PARENT_SHARE_MAX_ATTEMPTS - 1):
        result = await verify_parent_phone_last4(
            db,
            "share-token",
            "9999",
            attempt_key="203.0.113.20",
        )
        assert result.verified is False

    result = await verify_parent_phone_last4(
        db,
        "share-token",
        "1234",
        attempt_key="203.0.113.20",
    )
    assert result.verified is True

    for _ in range(PARENT_SHARE_MAX_ATTEMPTS):
        result = await verify_parent_phone_last4(
            db,
            "share-token",
            "9999",
            attempt_key="203.0.113.20",
        )
        assert result.verified is False

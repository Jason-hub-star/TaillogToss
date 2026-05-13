from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.features.coaching.training import (
    build_candidate_payload,
    build_telegram_review_preview,
    calculate_quality_score,
    infer_behavior_group,
    list_training_candidates,
    review_training_candidate,
)
from app.shared.models import AICoaching, ReportType


def _structured_blocks() -> dict:
    return {
        "action_plan": {
            "items": [
                {
                    "description": "문 앞에서 1초만 기다리는 연습을 해요.",
                    "technique": "체계적 둔감화",
                    "psychological_principle": "예측 가능성",
                    "tools": ["작은 간식"],
                    "environment_setup": "조용한 현관",
                    "steps": ["손잡이를 만져요", "1초 멈춰요", "돌아와 보상해요"],
                    "success_criteria": "짖지 않고 3회 성공",
                    "stop_criteria": "짖거나 문으로 달려가면 중단",
                    "reference_curriculum_ids": ["separation_anxiety"],
                }
            ]
        },
        "dog_voice": {"message": "문소리가 나면 심장이 두근거려요."},
        "next_7_days": {"days": [{"day_number": day, "tasks": ["짧게 연습"]} for day in range(1, 8)]},
        "risk_signals": {"overall_risk": "medium"},
    }


def test_quality_score_counts_structured_pro_action_fields():
    coaching = AICoaching(
        id=uuid4(),
        report_type=ReportType.DAILY,
        blocks=_structured_blocks(),
        is_synthetic=True,
    )

    assert calculate_quality_score(coaching) == 100


def test_training_candidate_payload_is_candidate_only_material():
    coaching = AICoaching(
        id=uuid4(),
        dog_id=uuid4(),
        report_type=ReportType.DAILY,
        blocks=_structured_blocks(),
        is_synthetic=True,
    )

    payload = build_candidate_payload(coaching)

    assert payload["source"] == "ai_coaching_synthetic"
    assert payload["status"] == "pending_curriculum_review"
    assert payload["behavior_group"] == "separation_anxiety"
    assert payload["reference_curriculum_ids"] == ["separation_anxiety"]
    assert "published" not in payload
    assert "runtime" not in payload


def test_telegram_preview_explains_no_app_curriculum_publish():
    coaching = AICoaching(
        id=uuid4(),
        report_type=ReportType.DAILY,
        blocks=_structured_blocks(),
        is_synthetic=True,
    )

    preview = build_telegram_review_preview(coaching)

    assert "AI 훈련데이터 후보" in preview
    assert "separation_anxiety" in preview
    assert "앱 커리큘럼에는 아직 반영되지 않아요" in preview


def test_infer_behavior_group_uses_keywords_when_reference_is_missing():
    blocks = {
        "action_plan": {
            "items": [
                {
                    "description": "실내 배변 실수가 줄도록 패드 주변 성공을 다시 쌓아요.",
                }
            ]
        }
    }

    assert infer_behavior_group(blocks) == "house_soiling"


@pytest.mark.asyncio
async def test_list_training_candidates_filters_behavior_group_after_summary():
    selected = AICoaching(
        id=uuid4(),
        report_type=ReportType.DAILY,
        blocks=_structured_blocks(),
        training_candidate=True,
        training_approved=False,
        is_synthetic=True,
    )
    other = AICoaching(
        id=uuid4(),
        report_type=ReportType.DAILY,
        blocks={"action_plan": {"items": [{"description": "실내 배변 실수를 줄여요."}]}},
        training_candidate=True,
        training_approved=False,
        is_synthetic=True,
    )
    result = MagicMock()
    result.scalars.return_value.all.return_value = [selected, other]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)

    candidates = await list_training_candidates(
        db,
        source="synthetic",
        behavior_group="separation_anxiety",
        limit=1,
    )

    assert len(candidates) == 1
    assert candidates[0]["id"] == selected.id
    assert candidates[0]["behavior_group"] == "separation_anxiety"


@pytest.mark.asyncio
async def test_review_training_candidate_approves_record_with_version():
    coaching = AICoaching(
        id=uuid4(),
        report_type=ReportType.DAILY,
        blocks=_structured_blocks(),
        is_synthetic=False,
    )
    result = MagicMock()
    result.scalar_one_or_none.return_value = coaching
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    reviewed = await review_training_candidate(
        db,
        coaching.id,
        approved=True,
        training_version="2026-05-W20",
    )

    assert reviewed is coaching
    assert reviewed.training_candidate is True
    assert reviewed.training_approved is True
    assert reviewed.training_approved_at is not None
    assert reviewed.training_version == "2026-05-W20"
    assert reviewed.training_quality_score == 100
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(coaching)


@pytest.mark.asyncio
async def test_review_training_candidate_rejects_record():
    coaching = AICoaching(
        id=uuid4(),
        report_type=ReportType.DAILY,
        blocks=_structured_blocks(),
        training_candidate=True,
        training_approved=True,
    )
    result = MagicMock()
    result.scalar_one_or_none.return_value = coaching
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    reviewed = await review_training_candidate(db, coaching.id, approved=False, quality_score=45)

    assert reviewed.training_candidate is False
    assert reviewed.training_approved is False
    assert reviewed.training_approved_at is None
    assert reviewed.training_quality_score == 45

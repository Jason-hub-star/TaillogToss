from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.features.coaching.training import calculate_quality_score, review_training_candidate
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

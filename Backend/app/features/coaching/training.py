"""
훈련 데이터 품질 평가 + JSONL 변환 모듈.
Fine-tuning 파이프라인의 핵심 — 후보 태깅 및 배치 준비.
Parity: AI-TRAIN-001
"""
import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.coaching.prompts import SYSTEM_PROMPT_6BLOCK
from app.features.coaching.synthetic import build_synthetic_user_prompt, SYNTHETIC_PROFILES
from app.shared.models import AICoaching, CoachingTrainingBatch

logger = logging.getLogger(__name__)

# 품질 점수 가중치 (합계 100점)
QUALITY_WEIGHTS = {
    "action_plan_concrete": 40,  # 훈련방법론 키워드 포함
    "dog_voice_sensory": 30,     # 감각적 표현 포함
    "day_plan_complete": 20,     # 7일 플랜 완전 (7개 day)
    "risk_signals_valid": 10,    # overall_risk 유효값
}

TRAINING_METHOD_KEYWORDS = [
    "클리커", "둔감화", "카운터컨디셔닝", "리다이렉팅", "긍정강화",
    "체계적 둔감화", "간헐강화", "타임아웃", "보상", "마커",
]

SENSORY_KEYWORDS = [
    "심장이", "귀가", "몸이", "철렁", "쿵", "띵", "움츠러",
    "떨려", "두근", "긴장", "벅차", "안도", "무거워", "가벼워",
]

VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}

STRUCTURED_ACTION_FIELDS = [
    "technique",
    "psychological_principle",
    "tools",
    "environment_setup",
    "steps",
    "success_criteria",
    "stop_criteria",
    "plan_b",
    "plan_c",
    "evidence_from_intake",
    "reference_curriculum_ids",
]


def _has_value(value) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return bool([item for item in value if str(item).strip()])
    return bool(value)


def _has_concrete_action_signal(item: dict) -> bool:
    """Pro 심화 필드나 기존 방법론 키워드가 있으면 구체적 액션으로 판단한다."""
    structured_count = sum(1 for field in STRUCTURED_ACTION_FIELDS if _has_value(item.get(field)))
    if structured_count >= 3:
        return True

    searchable_text = " ".join(
        str(item.get(field, ""))
        for field in [
            "description",
            "technique",
            "psychological_principle",
            "environment_setup",
            "success_criteria",
            "stop_criteria",
        ]
    )
    return any(kw in searchable_text for kw in TRAINING_METHOD_KEYWORDS)


def calculate_quality_score(coaching: AICoaching) -> int:
    """
    코칭 품질 점수 계산 (0~100).
    실 사용자: feedback_score 보너스 적용.
    합성 데이터: 구조 완성도만으로 평가.
    """
    blocks = coaching.blocks or {}
    score = 0

    # ① 실사용자 피드백 보너스 (합성 제외)
    if not coaching.is_synthetic and coaching.feedback_score:
        if coaching.feedback_score >= 4:
            score += 40
        elif coaching.feedback_score >= 3:
            score += 20

    # ② ActionPlan 훈련방법론 또는 Pro 심화 구조 필드 포함 여부
    action_items = blocks.get("action_plan", {}).get("items", [])
    if isinstance(action_items, list) and action_items and any(
        _has_concrete_action_signal(item)
        for item in action_items
        if isinstance(item, dict)
    ):
        score += QUALITY_WEIGHTS["action_plan_concrete"]

    # ③ DogVoice 감각적 표현 포함 여부
    dog_voice_text = blocks.get("dog_voice", {}).get("message", "")
    if any(kw in dog_voice_text for kw in SENSORY_KEYWORDS):
        score += QUALITY_WEIGHTS["dog_voice_sensory"]

    # ④ 7일 플랜 완전성 (정확히 7개)
    days = blocks.get("next_7_days", {}).get("days", [])
    if isinstance(days, list) and len(days) == 7:
        score += QUALITY_WEIGHTS["day_plan_complete"]

    # ⑤ 위험도 유효값 존재
    overall_risk = blocks.get("risk_signals", {}).get("overall_risk", "")
    if overall_risk in VALID_RISK_LEVELS:
        score += QUALITY_WEIGHTS["risk_signals_valid"]

    return min(score, 100)


async def tag_training_candidate(
    db: AsyncSession,
    coaching: AICoaching,
    threshold: int = 70,
) -> None:
    """
    코칭 품질 점수 계산 후 training_candidate 태깅.
    threshold(기본 70) 이상이면 후보로 표시.
    """
    score = calculate_quality_score(coaching)
    coaching.training_quality_score = score
    coaching.training_candidate = score >= threshold
    # flush만 — commit은 호출자 책임
    await db.flush()


async def tag_unscored_candidates(
    db: AsyncSession,
    threshold: int = 70,
    batch_size: int = 100,
) -> int:
    """
    training_quality_score가 NULL인 레코드 전체 태깅.
    반환: 처리된 건수
    """
    q = (
        select(AICoaching)
        .where(AICoaching.training_quality_score.is_(None))
        .limit(batch_size)
    )
    records = (await db.execute(q)).scalars().all()

    for coaching in records:
        score = calculate_quality_score(coaching)
        coaching.training_quality_score = score
        coaching.training_candidate = score >= threshold

    await db.commit()
    logger.info("tagged %d unscored coaching records", len(records))
    return len(records)


async def review_training_candidate(
    db: AsyncSession,
    coaching_id: UUID,
    approved: bool,
    training_version: str | None = None,
    quality_score: int | None = None,
) -> AICoaching | None:
    """
    관리자 검수 결과를 training_approved에 반영한다.
    승인 시 후보 플래그를 유지하고, 반려 시 후보/승인 상태를 함께 해제한다.
    """
    q = select(AICoaching).where(AICoaching.id == coaching_id)
    coaching = (await db.execute(q)).scalar_one_or_none()
    if coaching is None:
        return None

    coaching.training_quality_score = (
        quality_score if quality_score is not None else calculate_quality_score(coaching)
    )

    if approved:
        coaching.training_candidate = True
        coaching.training_approved = True
        coaching.training_approved_at = datetime.now(timezone.utc)
        if training_version:
            coaching.training_version = training_version
    else:
        coaching.training_candidate = False
        coaching.training_approved = False
        coaching.training_approved_at = None

    await db.commit()
    await db.refresh(coaching)
    return coaching


def _build_user_prompt_for_record(coaching: AICoaching) -> str:
    """
    JSONL 변환용 user_prompt 재구성.
    합성 데이터는 synthetic 프로필에서 복원, 실 데이터는 placeholder.
    """
    if coaching.is_synthetic:
        # blocks의 dog_voice emotion 힌트로 프로필 유추 (최선 노력)
        blocks = coaching.blocks or {}
        dog_voice = blocks.get("dog_voice", {}).get("message", "")
        # 첫 문장에서 이름 추출 시도
        name_hint = dog_voice[:10] if dog_voice else "합성견"
        return (
            f"Dog Profile:\n- Name: {name_hint}\n- Breed: 알 수 없음\n"
            f"- Primary Issues: 알 수 없음\n- (Synthetic training data)"
        )
    return (
        f"Dog Profile:\n- dog_id: {coaching.dog_id}\n"
        f"- Report type: {coaching.report_type}\n"
        f"- (Real user data — prompt reconstructed from coaching context)"
    )


def to_jsonl_record(coaching: AICoaching) -> dict:
    """단일 코칭 레코드를 OpenAI Fine-tuning JSONL 포맷으로 변환"""
    user_prompt = _build_user_prompt_for_record(coaching)
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_6BLOCK},
            {"role": "user", "content": user_prompt},
            {
                "role": "assistant",
                "content": json.dumps(coaching.blocks, ensure_ascii=False),
            },
        ]
    }


async def export_approved_to_jsonl(
    db: AsyncSession,
    batch_name: str,
) -> tuple[int, str]:
    """
    approved 레코드를 JSONL 문자열로 변환 + 배치 메타 기록.
    반환: (건수, jsonl_content)
    """
    q = select(AICoaching).where(
        AICoaching.training_candidate == True,
        AICoaching.training_approved == True,
    )
    records = (await db.execute(q)).scalars().all()

    lines = [json.dumps(to_jsonl_record(r), ensure_ascii=False) for r in records]
    content = "\n".join(lines)

    # 배치 기록
    batch = CoachingTrainingBatch(
        batch_name=batch_name,
        record_count=len(records),
        status="pending",
    )
    db.add(batch)
    await db.commit()

    logger.info("export_jsonl: batch=%s, count=%d", batch_name, len(records))
    return len(records), content

"""
훈련 데이터 품질 평가 + JSONL 변환 모듈.
Fine-tuning 파이프라인의 핵심 — 후보 태깅 및 배치 준비.
Parity: AI-TRAIN-001
"""
import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, select
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

BEHAVIOR_GROUP_ROTATION = [
    "separation_anxiety",
    "fear_desensitization",
    "reactivity_management",
    "impulse_control",
    "house_soiling",
    "jumping",
    "barking",
]

BEHAVIOR_GROUP_KEYWORDS = {
    "separation_anxiety": ["분리", "이탈", "혼자", "외출", "separation", "alone"],
    "fear_desensitization": ["소리", "둔감", "공포", "무서", "놀라", "클리퍼", "noise", "fear"],
    "reactivity_management": ["반응성", "다른 개", "낯선", "산책", "reactivity", "other dog"],
    "impulse_control": ["자원", "식사", "기다려", "흥분", "resource", "impulse"],
    "house_soiling": ["배변", "마킹", "소변", "실수", "house", "marking"],
    "jumping": ["점프", "뛰어오", "달려들", "jump"],
    "barking": ["짖", "吠", "bark"],
}

CURRICULUM_TO_BEHAVIOR_GROUP = {
    "separation_anxiety": "separation_anxiety",
    "fear_desensitization": "fear_desensitization",
    "reactivity_management": "reactivity_management",
    "impulse_control": "impulse_control",
}

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


def _collect_reference_curriculum_ids(blocks: dict) -> list[str]:
    refs: list[str] = []
    for item in blocks.get("action_plan", {}).get("items", []) or []:
        if isinstance(item, dict):
            refs.extend(item.get("reference_curriculum_ids") or [])
    for day in blocks.get("next_7_days", {}).get("days", []) or []:
        if isinstance(day, dict):
            refs.extend(day.get("reference_curriculum_ids") or [])
    deduped: list[str] = []
    for ref in refs:
        if isinstance(ref, str) and ref not in deduped:
            deduped.append(ref)
    return deduped


def _collect_training_text(blocks: dict) -> str:
    parts: list[str] = []
    for key in ["insight", "dog_voice", "risk_signals", "consultation_questions"]:
        value = blocks.get(key)
        if value:
            parts.append(json.dumps(value, ensure_ascii=False))
    for item in blocks.get("action_plan", {}).get("items", []) or []:
        if isinstance(item, dict):
            parts.append(json.dumps(item, ensure_ascii=False))
    return " ".join(parts).lower()


def infer_behavior_group(blocks: dict) -> str:
    """텔레그램 검수 큐의 행동군 순환 기준을 추정한다."""
    refs = _collect_reference_curriculum_ids(blocks)
    for ref in refs:
        mapped = CURRICULUM_TO_BEHAVIOR_GROUP.get(ref)
        if mapped:
            return mapped

    text = _collect_training_text(blocks)
    for group in BEHAVIOR_GROUP_ROTATION:
        if any(keyword.lower() in text for keyword in BEHAVIOR_GROUP_KEYWORDS[group]):
            return group
    return "barking"


def _first_action_items(blocks: dict, limit: int = 3) -> list[dict]:
    items = blocks.get("action_plan", {}).get("items", []) or []
    return [item for item in items if isinstance(item, dict)][:limit]


def _telegram_lines_for_candidate(coaching: AICoaching) -> list[str]:
    blocks = coaching.blocks or {}
    actions = _first_action_items(blocks)
    insight = blocks.get("insight", {}) if isinstance(blocks.get("insight"), dict) else {}
    risk = blocks.get("risk_signals", {}) if isinstance(blocks.get("risk_signals"), dict) else {}
    first_action = actions[0] if actions else {}

    summary_lines = [
        str(item.get("description") or "").strip()
        for item in actions
        if str(item.get("description") or "").strip()
    ][:3]
    if not summary_lines and insight.get("summary"):
        summary_lines = [str(insight["summary"]).strip()]

    return [
        "AI 훈련데이터 후보가 생겼어요",
        "",
        f"후보 ID: {str(coaching.id)[:8]}...",
        f"유형: 합성 케이스 · {infer_behavior_group(blocks)}",
        f"품질점수: {coaching.training_quality_score or calculate_quality_score(coaching)}점",
        "",
        "추천 요약",
        *[f"{index + 1}. {line}" for index, line in enumerate(summary_lines[:3])],
        "",
        f"기법: {first_action.get('technique') or '미기재'}",
        f"도구: {', '.join(first_action.get('tools') or []) if first_action.get('tools') else '미기재'}",
        f"성공 기준: {first_action.get('success_criteria') or '미기재'}",
        f"멈출 기준: {first_action.get('stop_criteria') or '미기재'}",
        f"위험도: {risk.get('overall_risk') or 'unknown'}",
        "",
        "승인해도 앱 커리큘럼에는 아직 반영되지 않아요.",
        "승인 시 후보 파일로만 저장돼요.",
    ]


def build_telegram_review_preview(coaching: AICoaching) -> str:
    """텔레그램에 보낼 짧은 검수 메시지."""
    return "\n".join(line for line in _telegram_lines_for_candidate(coaching) if line is not None).strip()


def build_candidate_payload(coaching: AICoaching) -> dict:
    """승인된 AI 코칭을 src/lib/data/candidates/ai-coaching 저장용 JSON으로 변환한다."""
    blocks = coaching.blocks or {}
    return {
        "source": "ai_coaching_synthetic" if coaching.is_synthetic else "ai_coaching_real_user",
        "status": "pending_curriculum_review",
        "coaching_id": str(coaching.id),
        "dog_id": str(coaching.dog_id) if coaching.dog_id else None,
        "behavior_group": infer_behavior_group(blocks),
        "training_quality_score": coaching.training_quality_score or calculate_quality_score(coaching),
        "created_at": coaching.created_at.isoformat() if coaching.created_at else None,
        "reference_curriculum_ids": _collect_reference_curriculum_ids(blocks),
        "action_plan": blocks.get("action_plan", {}),
        "next_7_days": blocks.get("next_7_days", {}),
        "risk_signals": blocks.get("risk_signals", {}),
        "evidence_from_intake": [
            item.get("evidence_from_intake")
            for item in _first_action_items(blocks, limit=10)
            if item.get("evidence_from_intake")
        ],
    }


def to_training_candidate_summary(coaching: AICoaching) -> dict:
    blocks = coaching.blocks or {}
    risk = blocks.get("risk_signals", {}) if isinstance(blocks.get("risk_signals"), dict) else {}
    return {
        "id": coaching.id,
        "is_synthetic": bool(coaching.is_synthetic),
        "behavior_group": infer_behavior_group(blocks),
        "training_quality_score": coaching.training_quality_score or calculate_quality_score(coaching),
        "risk_level": risk.get("overall_risk") or "unknown",
        "reference_curriculum_ids": _collect_reference_curriculum_ids(blocks),
        "telegram_preview": build_telegram_review_preview(coaching),
        "created_at": coaching.created_at,
    }


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


async def list_training_candidates(
    db: AsyncSession,
    source: str = "synthetic",
    behavior_group: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """텔레그램 자동화가 검수 후보를 고를 수 있게 후보 목록을 반환한다."""
    fetch_limit = max(1, min(limit * 5, 100))
    q = (
        select(AICoaching)
        .where(
            AICoaching.training_candidate == True,
            AICoaching.training_approved == False,
        )
        .order_by(desc(AICoaching.training_quality_score), desc(AICoaching.created_at))
        .limit(fetch_limit)
    )
    if source == "synthetic":
        q = q.where(AICoaching.is_synthetic == True)
    elif source == "real_user":
        q = q.where(AICoaching.is_synthetic == False)

    records = (await db.execute(q)).scalars().all()
    summaries = [to_training_candidate_summary(record) for record in records]
    if behavior_group:
        summaries = [item for item in summaries if item["behavior_group"] == behavior_group]
    return summaries[:limit]


async def get_training_candidate(db: AsyncSession, coaching_id: UUID) -> AICoaching | None:
    q = select(AICoaching).where(AICoaching.id == coaching_id)
    return (await db.execute(q)).scalar_one_or_none()


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

"""
규칙 기반 코칭 엔진 — AI 예산 소진 시 폴백
DogCoach ai_recommendations/rule_engine.py 마이그레이션
Parity: AI-001
"""
from app.features.coaching.schemas import (
    ActionItem,
    ActionPlanBlock,
    CoachingBlocks,
    ConsultationQuestionsBlock,
    DayPlan,
    DogVoiceBlock,
    InsightBlock,
    Next7DaysBlock,
    RiskSignal,
    RiskSignalsBlock,
)

ISSUE_LABELS = {
    "separation": "분리불안",
    "separation_anxiety": "분리불안",
    "barking": "짖음",
    "reactivity": "반응성",
    "anxiety": "불안",
    "resource_guarding": "자원 지킴",
    "destructive": "물어뜯기",
    "leash_pulling": "줄 당김",
    "jumping": "뛰어오름",
    "aggression": "공격성",
    "other": "행동 고민",
}

TRIGGER_LABELS = {
    "owner_leaves": "보호자 외출",
    "separation": "혼자 있는 상황",
    "other_dog": "다른 강아지",
    "other_dogs": "다른 강아지",
    "stranger": "낯선 사람",
    "strangers": "낯선 사람",
    "visitor": "방문객",
    "doorbell": "초인종",
    "noise": "소리 자극",
    "walk": "산책",
    "leash": "리드줄",
    "resource": "음식이나 장난감",
}


def _label(value: str, labels: dict[str, str], fallback: str) -> str:
    if not value:
        return fallback
    normalized = value.strip().lower()
    if not normalized:
        return fallback
    return labels.get(normalized, value if not normalized.isascii() else fallback)


def _build_rule_day(day_number: int, focus: str, primary_trigger: str) -> DayPlan:
    task_sets = [
        [
            f"트리거 없는 거리에서 이름 부르기 × 2회/3분 | 집 거실 | 성공: 바로 보호자를 보면 간식",
            f"{primary_trigger} 전조가 보이면 한 걸음 물러나기 × 1회/일 | 익숙한 장소 | 성공: 짖기 전 멈춤",
        ],
        [
            f"짧은 기다림 만들기 × 3회/5초 | 현관 안쪽 | 성공: 몸이 느슨하면 칭찬",
            f"좋아하는 간식으로 시선 돌리기 × 2회/3분 | 조용한 방 | 성공: 보호자를 다시 봄",
        ],
        [
            f"낮은 강도 자극 보기 × 2회/1분 | 안전거리 | 성공: 짖지 않고 간식 먹기",
            f"회복 시간 기록하기 × 1회/일 | 기록 직후 | 성공: 2분 안에 진정",
        ],
        [
            f"매트에서 쉬기 × 2회/4분 | 거실 한쪽 | 성공: 스스로 엎드림",
            f"{primary_trigger} 상황 전 간식 찾기 × 1회/일 | 안전 공간 | 성공: 냄새 맡기에 집중",
        ],
        [
            f"성공한 거리 반복하기 × 2회/3분 | 같은 장소 | 성공: 전날보다 회복이 빠름",
            f"실패 신호 확인하기 × 1회/일 | 훈련 뒤 | 성공: 짖음·회피 전 중단",
        ],
        [
            f"조금 쉬운 환경으로 복습하기 × 2회/5분 | 집 주변 | 성공: 보호자 신호에 반응",
            f"짧은 산책 보상 루틴 × 1회/일 | 조용한 길 | 성공: 리드줄이 느슨함",
        ],
        [
            f"가장 잘 된 루틴 반복하기 × 2회/5분 | 성공했던 장소 | 성공: 차분한 마무리",
            f"다음 주 기준 정하기 × 1회/일 | 기록 화면 | 성공: 유지할 거리와 시간을 적음",
        ],
    ]
    return DayPlan(
        day_number=day_number,
        focus=focus,
        tasks=task_sets[day_number - 1],
        session_duration_minutes=5,
        environment="집 안 또는 자극이 적은 익숙한 장소",
        tools=["좋아하는 간식", "영상 기록"],
        progression_rule="짖음, 회피, 얼어붙음이 없을 때만 거리나 시간을 아주 조금 늘려요.",
        reference_curriculum_ids=[],
    )


def generate_rule_based_blocks(
    dog_name: str,
    issues: list[str],
    triggers: list[str],
    total_logs: int,
    avg_intensity: float,
) -> CoachingBlocks:
    """규칙 기반 6블록 생성 (AI 호출 없음)"""
    primary_issue = _label(issues[0] if issues else "", ISSUE_LABELS, "행동 고민")
    primary_trigger = _label(triggers[0] if triggers else "", TRIGGER_LABELS, "특정 상황")

    # Block 1: 인사이트
    trend = "stable"
    if avg_intensity > 7:
        trend = "worsening"
    elif avg_intensity < 4:
        trend = "improving"

    insight = InsightBlock(
        title=f"{dog_name}의 행동 분석",
        summary=f"최근 {total_logs}건의 기록을 분석한 결과, "
                f"주요 행동은 '{primary_issue}'이며 "
                f"평균 강도는 {avg_intensity:.1f}/10입니다.",
        key_patterns=[
            f"주요 트리거: {primary_trigger}",
            f"평균 강도: {avg_intensity:.1f}",
            f"총 기록: {total_logs}건",
        ],
        trend=trend,
    )

    # Block 2: 실행 계획
    action_plan = ActionPlanBlock(
        title="이번 주 실천 계획",
        items=[
            ActionItem(
                id="a1",
                description=f"{primary_trigger} 상황에서는 바로 가까이 가지 말고, 차분히 볼 수 있는 거리부터 시작해요.",
                priority="high",
                technique="거리 조절과 좋은 경험 연결",
                psychological_principle="감당 가능한 선을 지키면 회복이 빨라져요.",
                tools=["좋아하는 간식", "영상 기록"],
                environment_setup="자극이 적은 익숙한 장소",
                steps=["자극을 멀리서 확인해요.", "짖기 전에 이름을 불러요.", "보호자를 보면 바로 보상해요."],
                success_criteria="3회 중 2회 이상 보호자를 다시 보면 성공이에요.",
                stop_criteria="짖음, 회피, 얼어붙음이 나오면 바로 거리를 늘려요.",
                plan_b="자극이 더 약한 시간대에 다시 해요.",
                plan_c="실내에서 이름 반응부터 복습해요.",
                evidence_from_intake=f"최근 {total_logs}건 기록과 평균 강도 {avg_intensity:.1f}/10 기준이에요.",
            ),
            ActionItem(
                id="a2",
                description="하루 2번, 5분 이하로 짧게 연습해요. 길게 버티는 것보다 성공으로 끝내는 게 더 좋아요.",
                priority="high",
                technique="짧은 반복 세션",
                psychological_principle="예측 가능한 반복이 안정감을 만들어요.",
                tools=["좋아하는 간식"],
                environment_setup="집 거실이나 현관 안쪽",
                steps=["1분 준비해요.", "3분 연습해요.", "1분 쉬며 기록해요."],
                success_criteria="훈련 뒤 2분 안에 평소 상태로 돌아와요.",
                stop_criteria="간식을 먹지 않거나 숨으려 하면 멈춰요.",
                plan_b="세션을 2분으로 줄여요.",
                plan_c="자극 없이 보호자 보기만 보상해요.",
                evidence_from_intake=f"평균 강도 {avg_intensity:.1f}/10 기준으로 낮은 단계부터 시작해요.",
            ),
            ActionItem(
                id="a3",
                description="차분한 순간을 바로 잡아서 칭찬하고 보상해요. 문제 행동 뒤보다 조용한 1초를 먼저 봐주세요.",
                priority="medium",
                technique="대체 행동 보상",
                psychological_principle="보상받은 행동은 다시 나올 가능성이 커져요.",
                tools=["표시어", "좋아하는 간식"],
                environment_setup="평소 생활 공간",
                steps=["조용한 순간을 봐요.", "표시어를 말해요.", "바로 보상해요."],
                success_criteria="하루에 차분한 순간을 5번 이상 표시해요.",
                stop_criteria="흥분이 올라가면 쉬는 공간으로 이동해요.",
                plan_b="보상 간격을 더 짧게 해요.",
                plan_c="가족 한 명만 참여해요.",
                evidence_from_intake=f"총 {total_logs}건 기록에서 반복 패턴을 줄이기 위한 기본 루틴이에요.",
            ),
        ],
    )

    # Block 3: 강아지 시점
    dog_voice = DogVoiceBlock(
        message=f"저도 {primary_issue}을(를) 하고 싶지 않아요. "
                f"조금만 더 이해해 주시면 함께 나아질 수 있어요!",
        emotion="hopeful",
    )

    # Block 4: 7일 플랜
    focus_list = [
        "안전거리 찾기", "짧은 성공 만들기", "낮은 강도 자극 보기",
        "쉬는 장소 연결", "성공 기준 반복", "조용한 환경 복습", "다음 주 기준 정리",
    ]
    days = [_build_rule_day(i + 1, focus_list[i], primary_trigger) for i in range(7)]
    next_7_days = Next7DaysBlock(days=days)

    # Block 5: 위험 신호
    signals = []
    overall_risk = "low"
    if avg_intensity > 7:
        signals.append(RiskSignal(
            type="intensity", description="행동 강도가 높습니다",
            severity="high", recommendation="전문가 상담 권장",
        ))
        overall_risk = "medium"
    if "aggression" in issues:
        signals.append(RiskSignal(
            type="aggression", description="공격 행동이 관찰됩니다",
            severity="high", recommendation="즉시 행동 전문가 상담 필요",
        ))
        overall_risk = "high"
    if total_logs >= 10 and overall_risk == "low":
        signals.append(RiskSignal(
            type="pattern", description=f"최근 {total_logs}건의 행동이 기록되었습니다",
            severity="low", recommendation="꾸준한 훈련으로 패턴을 개선해 보세요",
        ))
    if not signals:
        signals.append(RiskSignal(
            type="monitoring", description="현재 특이 위험 신호는 없습니다",
            severity="low", recommendation="현재 패턴을 유지하며 긍정 강화 훈련을 계속하세요",
        ))

    risk_signals = RiskSignalsBlock(signals=signals, overall_risk=overall_risk)

    # Block 6: 전문가 질문
    consultation = ConsultationQuestionsBlock(
        questions=[
            f"{dog_name}의 {primary_issue}가 언제부터 시작되었나요?",
            "특정 시간대에 더 심해지나요?",
            "이전에 시도한 훈련 방법이 있나요?",
        ],
        recommended_specialist="trainer" if overall_risk != "high" else "behaviorist",
    )

    return CoachingBlocks(
        insight=insight,
        action_plan=action_plan,
        dog_voice=dog_voice,
        next_7_days=next_7_days,
        risk_signals=risk_signals,
        consultation_questions=consultation,
    )

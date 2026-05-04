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


def generate_rule_based_blocks(
    dog_name: str,
    issues: list[str],
    triggers: list[str],
    total_logs: int,
    avg_intensity: float,
) -> CoachingBlocks:
    """규칙 기반 6블록 생성 (AI 호출 없음)"""
    primary_issue = issues[0] if issues else "행동 문제"
    primary_trigger = triggers[0] if triggers else "알 수 없는 상황"

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
            ActionItem(id="a1", description=f"{primary_trigger} 상황에서 거리 유지하기", priority="high"),
            ActionItem(id="a2", description="하루 2회 이상 짧은 훈련 세션 (5분)", priority="high"),
            ActionItem(id="a3", description="차분한 행동 시 즉시 보상하기", priority="medium"),
        ],
    )

    # Block 3: 강아지 시점
    dog_voice = DogVoiceBlock(
        message=f"저도 {primary_issue}을(를) 하고 싶지 않아요. "
                f"조금만 더 이해해 주시면 함께 나아질 수 있어요!",
        emotion="hopeful",
    )

    # Block 4: 7일 플랜
    days = []
    focus_list = [
        "기본 명령어 복습", "트리거 거리 유지", "긍정 강화 연습",
        "새로운 환경 노출", "인내심 훈련", "사회화 연습", "종합 복습",
    ]
    for i in range(7):
        days.append(DayPlan(
            day_number=i + 1,
            focus=focus_list[i],
            tasks=[f"{focus_list[i]} 5분", "산책 중 보상 훈련"],
        ))
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

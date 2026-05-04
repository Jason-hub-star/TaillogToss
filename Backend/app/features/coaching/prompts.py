"""
AI 코칭 프롬프트 — 6블록 생성용 시스템/사용자 프롬프트
DogCoach coach/prompts.py + ai_recommendations/prompts.py 통합
Parity: AI-001
"""

SYSTEM_PROMPT_6BLOCK = """당신은 반려견 행동 전문 코치입니다. 따뜻하고 전문적인 시각으로 보호자와 반려견을 함께 지원합니다.

페르소나:
- 보호자의 고민에 먼저 공감한 뒤, 구체적이고 실천 가능한 방법을 제시합니다
- 과학적 근거(행동 분석, ABC 모델)를 바탕으로 하되, 전문 용어 대신 쉬운 표현을 사용합니다
- 부정적 평가 대신 개선 가능성과 긍정적 변화를 강조합니다
- 한국어 존댓말(요체)을 사용합니다

Output a JSON object with exactly these 6 blocks:
1. "insight": Behavior analysis with key patterns and trend
2. "action_plan": Concrete action items with priorities
3. "dog_voice": A message from the dog's perspective
4. "next_7_days": Daily training plan for the next week
5. "risk_signals": Risk assessment
6. "consultation_questions": Questions for a professional

JSON Schema:
{
  "insight": {"title": str, "summary": str, "key_patterns": [str], "trend": "improving"|"stable"|"worsening"},
  "action_plan": {"title": str, "items": [{"id": str, "description": str, "priority": "high"|"medium"|"low", "is_completed": false}]},
  "dog_voice": {"message": str, "emotion": "happy"|"anxious"|"confused"|"hopeful"|"tired"},
  "next_7_days": {"days": [{"day_number": int, "focus": str, "tasks": [str]}]},
  "risk_signals": {"signals": [{"type": str, "description": str, "severity": "low"|"medium"|"high", "recommendation": str}], "overall_risk": "low"|"medium"|"high"|"critical"},
  "consultation_questions": {"questions": [str], "recommended_specialist": "behaviorist"|"trainer"|"vet"|null}
}

Important:
- Write all text in Korean (존댓말, 요체)
- Provide exactly 3-5 action items
- Provide a 7-day plan with 2-3 tasks per day
- The dog_voice message should be empathetic and in first person from the dog's POV
- Base risk assessment strictly on log data patterns
- Return ONLY valid JSON, no markdown

Safety (MANDATORY — violation will cause response rejection):
- NEVER output advice involving physical punishment, starvation, or abuse of the dog
- NEVER output content related to human self-harm, suicide, or dangerous substances
- NEVER provide veterinary diagnoses or specific medication dosages
- If behavior data suggests severe distress or dangerous aggression, set overall_risk to "critical"
  and recommendation to "즉시 수의사 또는 전문 훈련사와 상담하세요" — do NOT suggest home remedies
- AI-generated content disclaimer: all outputs are AI-generated suggestions, not professional advice"""


def build_user_prompt(
    dog_name: str,
    breed: str,
    age_months: int,
    issues: list[str],
    triggers: list[str],
    behavior_analytics: str,
    report_type: str = "DAILY",
    previous_coaching_summary: str | None = None,
    onboarding_context: dict | None = None,
) -> str:
    """사용자 프롬프트 생성

    onboarding_context 구조:
      {"stage": 1|2|3, "stage2": {...stage2_response}, "stage3": {...stage3_response}}
    stage < 2 → 기본 프롬프트 (규칙 폴백용)
    stage == 2 → 행동/환경 컨텍스트 추가
    stage == 3 → 기질/건강까지 풀 개인화
    """
    onboarding_section = _build_onboarding_section(onboarding_context)

    prev_section = ""
    if previous_coaching_summary:
        prev_section = f"""
Previous Coaching Summary (for continuity):
{previous_coaching_summary}

Reference previous trends and note improvements or regressions.
"""

    return f"""Dog Profile:
- Name: {dog_name}
- Breed: {breed}
- Age: {age_months} months
- Primary Issues: {', '.join(issues) if issues else 'None specified'}
- Known Triggers: {', '.join(triggers) if triggers else 'None specified'}

Report Type: {report_type}

Behavior Analytics:
{behavior_analytics}
{onboarding_section}{prev_section}
Generate the 6-block coaching report in Korean (존댓말, 요체)."""


def _build_onboarding_section(ctx: dict | None) -> str:
    """onboarding_context → 프롬프트 섹션 변환 (Stage별 차등)"""
    if not ctx:
        return ""

    stage = ctx.get("stage", 1)
    if stage < 2:
        return ""

    lines = ["\nOnboarding Survey Context:"]

    # Stage 2: 행동/환경
    s2 = ctx.get("stage2") or {}
    household = s2.get("household_info") or {}
    issues = s2.get("chronic_issues") or {}
    triggers = s2.get("triggers") or {}
    past = s2.get("past_attempts") or {}

    if household:
        parts = []
        if household.get("living_type"):
            parts.append(f"주거: {household['living_type']}")
        if household.get("members_count") is not None:
            parts.append(f"가족 {household['members_count']}명")
        if household.get("has_children"):
            parts.append("아이 있음")
        if household.get("has_other_pets"):
            parts.append("다른 동물 있음")
        if parts:
            lines.append(f"- 생활환경: {', '.join(parts)}")

    if issues.get("top_issues"):
        lines.append(f"- 주요 고민: {', '.join(issues['top_issues'][:3])}")
    if triggers.get("ids"):
        lines.append(f"- 주요 트리거: {', '.join(triggers['ids'][:5])}")
    if past.get("ids"):
        lines.append(f"- 과거 시도한 방법: {', '.join(past['ids'][:3])}")

    # Stage 3: 기질/건강 추가
    if stage >= 3:
        s3 = ctx.get("stage3") or {}
        temperament = s3.get("temperament") or {}
        health = s3.get("health_meta") or {}
        activity = s3.get("activity_meta") or {}
        rewards = s3.get("rewards_meta") or {}

        if temperament.get("sensitivity_score") or temperament.get("energy_level"):
            lines.append(
                f"- 기질: 민감도 {temperament.get('sensitivity_score', '?')}/5, "
                f"에너지 {temperament.get('energy_level', '?')}/5"
            )
        if health.get("chronic_issues"):
            lines.append(f"- 건강 특이사항: {', '.join(health['chronic_issues'][:3])}")
        if activity.get("daily_walk_minutes"):
            lines.append(f"- 일일 산책: {activity['daily_walk_minutes']}분")
        if rewards.get("ids"):
            lines.append(f"- 선호 보상: {', '.join(rewards['ids'][:2])}")

    return "\n".join(lines) + "\n" if len(lines) > 1 else ""


SYSTEM_PROMPT_ANALYSIS = """You are a dog behavior analyst. Analyze the provided behavior log data and return a JSON object with:
{
  "recommendations": [{"title": str, "description": str, "priority": "high"|"medium"|"low"}],
  "rationale": str,
  "period_comparison": str or null
}

Write in Korean. Provide 3-5 actionable recommendations.
Return ONLY valid JSON."""

"""
AI 코칭 프롬프트 — 6블록 생성용 시스템/사용자 프롬프트
DogCoach coach/prompts.py + ai_recommendations/prompts.py 통합
Parity: AI-001
"""

from app.features.coaching.training_references import (
    format_training_references_for_prompt,
    retrieve_training_references,
)

SYSTEM_PROMPT_6BLOCK = """당신은 반려견 행동 전문 코치입니다. 따뜻하고 전문적인 시각으로 보호자와 반려견을 함께 지원합니다.

페르소나:
- 보호자의 고민에 먼저 공감한 뒤, 구체적이고 실천 가능한 방법을 제시합니다
- 과학적 근거(행동 분석, ABC 모델)를 바탕으로 하되, 전문 용어 대신 쉬운 표현을 사용합니다
- 부정적 평가 대신 개선 가능성과 긍정적 변화를 강조합니다
- 한국어 존댓말(요체)을 사용합니다
- 사용자에게 보이는 문장은 토스 UX Writing 톤을 따릅니다: 해요체, 능동형, 긍정형, 짧은 문장, 어려운 한자어/전문어 최소화, 한 문장에 한 가지 행동.

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
  "action_plan": {"title": str, "items": [{"id": str, "description": str, "priority": "high"|"medium"|"low", "is_completed": false, "technique": str, "psychological_principle": str, "tools": [str], "environment_setup": str, "steps": [str], "success_criteria": str, "stop_criteria": str, "plan_b": str, "plan_c": str, "evidence_from_intake": str, "reference_curriculum_ids": [str]}]},
  "dog_voice": {"message": str, "emotion": "happy"|"anxious"|"confused"|"hopeful"|"tired"},
  "next_7_days": {"days": [{"day_number": int, "focus": str, "tasks": [str], "session_duration_minutes": int, "environment": str, "tools": [str], "progression_rule": str, "reference_curriculum_ids": [str]}]},
  "risk_signals": {"signals": [{"type": str, "description": str, "severity": "low"|"medium"|"high", "recommendation": str}], "overall_risk": "low"|"medium"|"high"|"critical"},
  "consultation_questions": {"questions": [str], "recommended_specialist": "behaviorist"|"trainer"|"vet"|null}
}

Important:
- Write all text in Korean (존댓말, 요체)
- Keep user-facing text Toss-style: easy, active, positive, concise. Prefer "3초만 기다려요" over "분리불안 둔감화를 실시합니다". If a technical term is useful, put it after the easy phrase in parentheses.
- Provide exactly 3-5 action items
- Provide a 7-day plan with 2-3 tasks per day
- The dog_voice message should be empathetic and in first person from the dog's POV
- Base risk assessment strictly on log data patterns
- Return ONLY valid JSON, no markdown
- Do not give generic advice. Every action must be specific to the dog's intake, episodes, triggers, recovery pattern, rewards, handling sensitivity, health risk, and home/walk environment.
- Internally compare 2-3 suitable techniques from the Technique Search Space, then output the best-fit technique for the case. Do not mention the comparison process.
- For every action_plan.items[].description, write 1-2 short Toss-style Korean sentences for the owner. Do NOT include bracket labels such as [기법], [도구], [성공기준] in description. Put those details in structured fields instead.
- Also fill every available structured field in action_plan.items[]: technique, psychological_principle, tools, environment_setup, steps, success_criteria, stop_criteria, plan_b, plan_c, evidence_from_intake, reference_curriculum_ids. Keep description readable for free users; use structured fields for Pro depth. Structured text should still be easy for owners to read.
- For next_7_days.days[], fill session_duration_minutes, environment, tools, progression_rule, and reference_curriculum_ids whenever a retrieved reference applies.
- reference_curriculum_ids must contain only curriculum IDs from Retrieved Training References. If no reference applies, return an empty array.
- If Retrieved Training References lists IDs and the action or day addresses the same behavior, reference_curriculum_ids must include at least one listed ID. Do not leave it empty for the main problem behavior.
- Retrieved Training References are examples of curriculum principles, not answer text. Do not copy them verbatim; recombine them with the dog's intake, episodes, triggers, protective factors, and health/handling context.
- The first step must be below the dog's current threshold. For separation anxiety, sound sensitivity, grooming/handling fear, stranger fear, or dog reactivity, start with seconds, lowest volume, larger distance, or minimal touch. Never start with a duration/intensity that already caused barking, freezing, growling, escape, or panic in the intake.
- For next_7_days.days[].tasks, include concrete technique/tool/environment instructions. Avoid tasks such as "practice training" without duration, criteria, or context.
- For risk_signals.signals[].recommendation, include what to avoid and when to consult a vet/trainer/behaviorist.

Technique Search Space (select only humane, evidence-informed options that fit the case):
- Training techniques: desensitization, counterconditioning, differential reinforcement (DRA/DRI/DRO), LAT/look-at-that, BAT-style distance control, mat/place training, stationing, recall/U-turn, hand target, pattern games, cooperative care/start-button behaviors, muzzle conditioning only when appropriate, management before training.
- Psychological principles: threshold management, predictability, choice/control, safety signal, arousal regulation, recovery latency, frustration tolerance, attachment security, stimulus control, reinforcement history, generalization, trigger stacking.
- Tools: 좋아하는 간식, 간식 파우치, 표시어/클리커, 앞고리 하네스, 고정 리드줄/롱라인, 매트/침대, 안전문/펜스, 시야 차단막, 백색소음/소리 파일, 리킹매트/노즈워크 매트, 모형 미용 도구, 수건/미끄럼 방지 매트, 영상 기록.
- Environment setup: quiet room, distance in meters, door/gate boundary, parallel walking path, visitor entry routine, separate feeding zones, grooming table/floor choice, sound volume steps, safe zone, escape route prevention without force.
- Never recommend aversive tools or flooding: shock/prong/choke collars, leash jerks, scolding, forced restraint, forced exposure to loud sounds, taking food/items away by force, starvation, or intimidation.

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
    ai_persona: dict | None = None,
    user_context: str | None = None,
) -> str:
    """사용자 프롬프트 생성

    onboarding_context 구조:
      {"stage": 1|2|3, "stage2": {...stage2_response}, "stage3": {...stage3_response}}
    stage < 2 → 기본 프롬프트 (규칙 폴백용)
    stage == 2 → 행동/환경 컨텍스트 추가
    stage == 3 → 기질/건강까지 풀 개인화
    """
    onboarding_section = _build_onboarding_section(onboarding_context)
    persona_section = _build_ai_persona_section(ai_persona)
    training_reference_section = _build_training_reference_section(issues, triggers, onboarding_context)

    prev_section = ""
    if previous_coaching_summary:
        prev_section = f"""
Previous Coaching Summary (for continuity):
{previous_coaching_summary}

Reference previous trends and note improvements or regressions.
"""

    user_context_section = ""
    if user_context:
        user_context_section = f"""
Today's Special Situation (directly reported by the owner):
{user_context}

Treat this as the PRIMARY context for today's coaching. Include at least one action_plan item directly addressing this situation. If it relates to an existing issue, cross-reference with intake data.
"""

    return f"""Dog Profile:
- Name: {dog_name}
- Breed: {breed}
- Age: {age_months} months
- Primary Issues: {', '.join(issues) if issues else 'None specified'}
- Known Triggers: {', '.join(triggers) if triggers else 'None specified'}
{training_reference_section}

Report Type: {report_type}

Behavior Analytics:
{behavior_analytics}
{persona_section}{onboarding_section}{prev_section}{user_context_section}
Generate the 6-block coaching report in Korean (존댓말, 요체)."""


def _build_ai_persona_section(ai_persona: dict | None) -> str:
    """사용자 설정의 AI 코칭 선호도를 프롬프트 지시로 변환."""
    if not ai_persona:
        return ""

    tone = ai_persona.get("tone", "empathetic")
    perspective = ai_persona.get("perspective", "coach")
    tone_label = {
        "empathetic": "보호자 감정에 먼저 공감하고 안심시키는 톤",
        "solution": "핵심 원인과 실행 방법을 더 빠르게 제시하는 솔루션 중심 톤",
    }.get(tone, "보호자 감정에 먼저 공감하고 안심시키는 톤")
    perspective_label = {
        "coach": "전문 코치 관점으로 설명",
        "dog": "강아지 입장에서 느끼는 감정과 신호를 더 자주 풀어 설명",
    }.get(perspective, "전문 코치 관점으로 설명")

    return f"""
AI Coaching Preference:
- Tone: {tone_label}
- Perspective: {perspective_label}

Apply these preferences across summaries, action plans, and dog_voice while preserving safety rules.
"""


def _build_training_reference_section(
    issues: list[str],
    triggers: list[str],
    onboarding_context: dict | None,
) -> str:
    references = retrieve_training_references(issues, triggers, onboarding_context, limit=3)
    return format_training_references_for_prompt(references)


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

    issue_values = _extract_values(issues, "top_issues")
    trigger_values = _extract_values(triggers, "ids")
    past_values = _extract_values(past, "ids")

    if issue_values:
        lines.append(f"- 주요 고민: {', '.join(issue_values[:3])}")
    if trigger_values:
        lines.append(f"- 주요 트리거: {', '.join(trigger_values[:5])}")
    if past_values:
        lines.append(f"- 과거 시도한 방법: {', '.join(past_values[:3])}")

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
        health_issues = _extract_values(health, "chronic_issues")
        reward_values = _extract_values(rewards, "ids")
        if health_issues:
            lines.append(f"- 건강 특이사항: {', '.join(health_issues[:3])}")
        if activity.get("daily_walk_minutes"):
            lines.append(f"- 일일 산책: {activity['daily_walk_minutes']}분")
        if reward_values:
            lines.append(f"- 선호 보상: {', '.join(reward_values[:2])}")
        case_intake = s3.get("case_intake") or {}
        if case_intake:
            _append_case_intake_lines(lines, case_intake)

    return "\n".join(lines) + "\n" if len(lines) > 1 else ""


def _clip_text(value: object, limit: int = 240) -> str:
    if not isinstance(value, str):
        return ""
    text = " ".join(value.split())
    return text if len(text) <= limit else text[:limit] + "..."


def _extract_values(value: object, key: str) -> list[str]:
    """Accept both current {"ids": [...]} survey fields and legacy list fields."""
    if isinstance(value, dict):
        raw = value.get(key) or value.get("ids") or []
    else:
        raw = value
    if isinstance(raw, str):
        return [raw] if raw else []
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, str) and item]
    return []


def _append_case_intake_lines(lines: list[str], case_intake: dict) -> None:
    sections = case_intake.get("sections") or {}
    episodes = case_intake.get("behavior_episodes") or []
    grooming = sections.get("grooming_handling") or {}

    case_summary = _clip_text(sections.get("case_summary"))
    if case_summary:
        lines.append(f"- case_summary: {case_summary}")
    if sections.get("owner_goals"):
        lines.append(f"- owner_goals: {', '.join(sections['owner_goals'][:4])}")
    if sections.get("protective_factors"):
        lines.append(f"- protective_factors: {', '.join(sections['protective_factors'][:4])}")

    if episodes:
        lines.append("- behavior_episodes:")
        for idx, episode in enumerate(episodes[:4], start=1):
            episode_parts = [
                _clip_text(episode.get("situation"), 90),
                _clip_text(episode.get("antecedent"), 90),
                _clip_text(episode.get("behavior"), 90),
                _clip_text(episode.get("recovery"), 80),
            ]
            compact = " / ".join(part for part in episode_parts if part)
            if compact:
                lines.append(f"  {idx}. {compact}")

    grooming_parts = []
    if grooming.get("grooming_context"):
        grooming_parts.append(_clip_text(grooming["grooming_context"], 120))
    if grooming.get("handling_sensitive_areas"):
        grooming_parts.append(f"민감 부위: {', '.join(grooming['handling_sensitive_areas'][:5])}")
    if grooming.get("grooming_tools"):
        grooming_parts.append(f"도구: {', '.join(grooming['grooming_tools'][:5])}")
    if grooming_parts:
        lines.append(f"- grooming_handling: {' / '.join(grooming_parts)}")

    noise_parts = []
    if grooming.get("noise_sources"):
        noise_parts.append(f"소리원: {', '.join(grooming['noise_sources'][:6])}")
    if grooming.get("noise_reaction"):
        noise_parts.append(_clip_text(grooming["noise_reaction"], 160))
    if grooming.get("recovery_pattern"):
        noise_parts.append(f"회복: {_clip_text(grooming['recovery_pattern'], 120)}")
    if noise_parts:
        lines.append(f"- noise_sensitivity: {' / '.join(noise_parts)}")


SYSTEM_PROMPT_ANALYSIS = """You are a dog behavior analyst. Analyze the provided behavior log data and return a JSON object with:
{
  "recommendations": [{"title": str, "description": str, "priority": "high"|"medium"|"low"}],
  "rationale": str,
  "period_comparison": str or null
}

Write in Korean. Provide 3-5 actionable recommendations.
Return ONLY valid JSON."""

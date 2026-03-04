"""
AI 코칭 프롬프트 — 6블록 생성용 시스템/사용자 프롬프트
DogCoach coach/prompts.py + ai_recommendations/prompts.py 통합
Parity: AI-001
"""

SYSTEM_PROMPT_6BLOCK = """You are an expert dog behavior analyst. Analyze the provided behavior logs and environment data to generate a comprehensive coaching report.

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
- Write all text in Korean
- Provide exactly 3-5 action items
- Provide a 7-day plan with 2-3 tasks per day
- The dog_voice message should be empathetic and in first person from the dog's POV
- Base risk assessment strictly on log data patterns
- Return ONLY valid JSON, no markdown"""


def build_user_prompt(
    dog_name: str,
    breed: str,
    age_months: int,
    issues: list[str],
    triggers: list[str],
    recent_logs_summary: str,
    report_type: str = "DAILY",
    previous_coaching_summary: str | None = None,
) -> str:
    """사용자 프롬프트 생성 — 이전 코칭 요약 포함 시 연속성 있는 코칭 제공"""
    prev_section = ""
    if previous_coaching_summary:
        prev_section = f"""
Previous Coaching Summary (for continuity):
{previous_coaching_summary}

When generating, reference previous trends and note improvements or regressions.
"""

    return f"""Dog Profile:
- Name: {dog_name}
- Breed: {breed}
- Age: {age_months} months
- Primary Issues: {', '.join(issues) if issues else 'None specified'}
- Known Triggers: {', '.join(triggers) if triggers else 'None specified'}

Report Type: {report_type}

Recent Behavior Logs:
{recent_logs_summary}
{prev_section}
Generate the 6-block coaching report in Korean."""


SYSTEM_PROMPT_ANALYSIS = """You are a dog behavior analyst. Analyze the provided behavior log data and return a JSON object with:
{
  "recommendations": [{"title": str, "description": str, "priority": "high"|"medium"|"low"}],
  "rationale": str,
  "period_comparison": str or null
}

Write in Korean. Provide 3-5 actionable recommendations.
Return ONLY valid JSON."""

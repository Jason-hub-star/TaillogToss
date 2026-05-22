from app.features.coaching import prompts


def test_build_user_prompt_includes_ai_persona_preferences():
    prompt = prompts.build_user_prompt(
        dog_name="정베",
        breed="믹스",
        age_months=24,
        issues=["barking"],
        triggers=["noise"],
        behavior_analytics="No recent logs",
        ai_persona={"tone": "solution", "perspective": "dog"},
    )

    assert "AI Coaching Preference" in prompt
    assert "솔루션 중심 톤" in prompt
    assert "강아지 입장에서" in prompt


def test_build_user_prompt_injects_user_context():
    """user_context가 프롬프트에 PRIMARY 컨텍스트로 주입되는지 확인"""
    ctx = "오늘 공원에서 다른 강아지를 보자마자 줄을 잡아당겼어요"
    prompt = prompts.build_user_prompt(
        dog_name="홀리",
        breed="말티즈",
        age_months=18,
        issues=["aggression"],
        triggers=["other_dogs"],
        behavior_analytics="3 logs this week",
        user_context=ctx,
    )
    assert "Today's Special Situation" in prompt
    assert ctx in prompt
    assert "PRIMARY" in prompt


def test_build_user_prompt_no_user_context_section_when_none():
    """user_context=None 이면 해당 섹션 미포함"""
    prompt = prompts.build_user_prompt(
        dog_name="홀리",
        breed="말티즈",
        age_months=18,
        issues=["barking"],
        triggers=["noise"],
        behavior_analytics="2 logs",
        user_context=None,
    )
    assert "Today's Special Situation" not in prompt
    assert "PRIMARY" not in prompt


def test_build_user_prompt_empty_string_user_context_not_injected():
    """user_context 빈 문자열도 섹션 미포함 (trim 처리 확인)"""
    prompt = prompts.build_user_prompt(
        dog_name="홀리",
        breed="말티즈",
        age_months=18,
        issues=["barking"],
        triggers=["noise"],
        behavior_analytics="2 logs",
        user_context="",
    )
    assert "Today's Special Situation" not in prompt


def test_build_user_prompt_multiple_situations_combined():
    """체크박스 + 자유입력 결합된 컨텍스트 처리"""
    ctx = "오늘 발생한 상황: 산책 중 줄 당김, 낯선 사람 방문 시 짖음\n문 앞에서 10분간 계속 짖었어요"
    prompt = prompts.build_user_prompt(
        dog_name="초코",
        breed="포메라니안",
        age_months=12,
        issues=["barking"],
        triggers=["strangers"],
        behavior_analytics="5 logs",
        user_context=ctx,
    )
    assert "산책 중 줄 당김" in prompt
    assert "낯선 사람 방문 시 짖음" in prompt
    assert "10분간 계속 짖었어요" in prompt


def test_build_user_prompt_focused_mode_emits_isolation_directive():
    """focused=True + user_context 있으면 격리 지시 포함, PRIMARY 지시는 미포함."""
    ctx = "분리불안이 심해졌어요. 외출하려고 신발 신는 순간부터 짖어요."
    prompt = prompts.build_user_prompt(
        dog_name="홀리",
        breed="말티즈",
        age_months=18,
        issues=["barking", "leash_pulling"],
        triggers=["other_dogs"],
        behavior_analytics="separation 12회, leash_pulling 8회",
        user_context=ctx,
        focused=True,
    )
    assert "Today's FOCUSED Question" in prompt
    assert "CRITICAL FOCUS DIRECTIVE" in prompt
    assert "Focus EXCLUSIVELY on the behaviors" in prompt
    assert ctx in prompt
    # 기존 비격리 지시는 포함되지 않아야 함
    assert "Today's Special Situation" not in prompt


def test_build_user_prompt_focused_false_keeps_legacy_section():
    """focused=False(기본값) + user_context 있으면 기존 PRIMARY 지시 사용, 격리 지시 미포함."""
    ctx = "오늘 산책 중 줄을 잡아당겼어요"
    prompt = prompts.build_user_prompt(
        dog_name="홀리",
        breed="말티즈",
        age_months=18,
        issues=["leash_pulling"],
        triggers=["other_dogs"],
        behavior_analytics="3 logs",
        user_context=ctx,
    )
    assert "Today's Special Situation" in prompt
    assert "PRIMARY context" in prompt
    assert "CRITICAL FOCUS DIRECTIVE" not in prompt


def test_build_user_prompt_focused_without_user_context_no_section():
    """focused=True여도 user_context 없으면 격리 섹션 자체가 나오지 않음."""
    prompt = prompts.build_user_prompt(
        dog_name="홀리",
        breed="말티즈",
        age_months=18,
        issues=["barking"],
        triggers=["noise"],
        behavior_analytics="2 logs",
        user_context=None,
        focused=True,
    )
    assert "Today's FOCUSED Question" not in prompt
    assert "CRITICAL FOCUS DIRECTIVE" not in prompt


def test_extract_behaviors_from_text_matches_korean_keywords():
    """training_references.extract_behaviors_from_text가 한국어 키워드를 정확히 추출."""
    from app.features.coaching.training_references import extract_behaviors_from_text

    # 분리불안 키워드
    assert "separation" in extract_behaviors_from_text("분리불안이 심해요")
    # 줄당김 키워드
    assert "leash_pulling" in extract_behaviors_from_text("산책할 때 줄 당김이 심함")
    # 짖음 키워드
    assert "barking" in extract_behaviors_from_text("초인종 소리에 짖어요")
    # 매칭 안 되는 텍스트는 빈 리스트
    assert extract_behaviors_from_text("오늘 날씨가 좋아요") == []
    # None/빈 문자열도 빈 리스트
    assert extract_behaviors_from_text(None) == []
    assert extract_behaviors_from_text("") == []


def test_build_user_prompt_accepts_legacy_list_onboarding_fields():
    """DEV_LOCAL 기존 세션처럼 설문 필드가 list로 저장된 경우도 프롬프트를 만든다."""
    prompt = prompts.build_user_prompt(
        dog_name="메이",
        breed="믹스",
        age_months=20,
        issues=["barking"],
        triggers=["visitor"],
        behavior_analytics="3 logs",
        onboarding_context={
            "stage": 2,
            "stage2": {
                "chronic_issues": ["짖음", "줄 당김"],
                "triggers": ["낯선 사람", "현관문"],
                "past_attempts": ["간식 보상"],
            },
        },
    )

    assert "주요 고민: 짖음, 줄 당김" in prompt
    assert "주요 트리거: 낯선 사람, 현관문" in prompt
    assert "과거 시도한 방법: 간식 보상" in prompt

from app.features.coaching import prompts


def _ctx(case_summary: str, episode_behavior: str, noise_reaction: str) -> dict:
    return {
        "stage": 3,
        "stage2": {
            "household_info": {"living_type": "apartment", "members_count": 2},
            "chronic_issues": {"top_issues": ["separation"]},
            "triggers": {"ids": ["owner_leaves"]},
            "past_attempts": {"ids": ["nosework"]},
        },
        "stage3": {
            "temperament": {"sensitivity_score": 5, "energy_level": 3},
            "health_meta": {"chronic_issues": []},
            "activity_meta": {"daily_walk_minutes": 30},
            "rewards_meta": {"ids": ["treat"]},
            "case_intake": {
                "status": "submitted",
                "source_context": "pro_intake",
                "sections": {
                    "case_summary": case_summary,
                    "owner_goals": ["보호자 일시 이탈 상황에서 1분 차분히 기다리기"],
                    "protective_factors": ["간식 보상 반응이 좋음"],
                    "grooming_handling": {
                        "grooming_context": "목욕 위탁 시 보호자가 나가면 문을 오래 바라봄",
                        "handling_sensitive_areas": ["얼굴", "발"],
                        "grooming_tools": ["클리퍼", "가위"],
                        "noise_sources": ["윗집 소리", "문 닫힘"],
                        "noise_reaction": noise_reaction,
                        "recovery_pattern": "오래 짖지는 않지만 빈도 증가",
                    },
                },
                "behavior_episodes": [
                    {
                        "situation": "두 보호자 산책 중 한 명이 편의점에 들어감",
                        "antecedent": "보호자가 시야에서 사라짐",
                        "behavior": episode_behavior,
                        "recovery": "재결합 시 크게 흥분",
                    }
                ],
            },
        },
    }


def test_pro_intake_context_is_included_in_prompt():
    prompt = prompts.build_user_prompt(
        dog_name="우디",
        breed="꼬똥 드 툴레이",
        age_months=5,
        issues=["separation"],
        triggers=["owner_leaves"],
        behavior_analytics="No recent logs",
        onboarding_context=_ctx(
            "보호자 일시 이탈, 미용 위탁 불안, 소리 민감이 핵심",
            "짖거나 따라가려 하고 간식은 먹지만 보호자를 계속 찾음",
            "윗집 발소리와 문 닫힘에 으르렁거리거나 짖음",
        ),
    )

    assert "case_summary" in prompt
    assert "behavior_episodes" in prompt
    assert "grooming_handling" in prompt
    assert "noise_sensitivity" in prompt
    assert "owner_goals" in prompt
    assert "protective_factors" in prompt
    assert "보호자 일시 이탈" in prompt
    assert "윗집 발소리" in prompt


def test_system_prompt_requires_specific_technique_tool_environment_search():
    system_prompt = prompts.SYSTEM_PROMPT_6BLOCK

    assert "Technique Search Space" in system_prompt
    assert "[기법]" in system_prompt
    assert "[심리원리]" in system_prompt
    assert "[도구]" in system_prompt
    assert "[환경]" in system_prompt
    assert "[성공기준]" in system_prompt
    assert "desensitization" in system_prompt
    assert "counterconditioning" in system_prompt
    assert "threshold management" in system_prompt
    assert "below the dog's current threshold" in system_prompt
    assert "Internally compare 2-3 suitable techniques" in system_prompt
    assert "Never recommend aversive tools" in system_prompt


def test_pro_intake_prompt_handles_multiple_fixture_shapes():
    fixture_markers = [
        ("어린 강아지 배변 실수와 흥분 점프", "방문객에게 점프하고 배변 실수", "청소기에는 금방 회복"),
        ("성견 산책 중 다른 개 반응성", "다른 개가 가까워지면 짖음", "소음 반응은 낮음"),
        ("노령견 통증 가능성과 핸들링 민감", "만지려 하면 몸을 피함", "큰 소리에 움츠림"),
        ("구조 이력 낯선 사람 회피와 환경 불안", "낯선 사람이 다가오면 숨음", "공사음에 오래 불안"),
        ("다견 가정 자원 보호와 식사 긴장", "밥그릇 주변에서 굳고 으르렁", "식기 소리에 경계"),
    ]

    for case_summary, behavior, noise in fixture_markers:
        prompt = prompts.build_user_prompt(
            dog_name="Fixture",
            breed="Mixed",
            age_months=24,
            issues=["fixture"],
            triggers=["fixture_trigger"],
            behavior_analytics="fixture analytics",
            onboarding_context=_ctx(case_summary, behavior, noise),
        )
        assert case_summary in prompt
        assert behavior in prompt
        assert noise in prompt

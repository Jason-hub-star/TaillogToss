from app.features.coaching.training_references import (
    extract_behavior_candidates,
    retrieve_training_references,
)


def _woody_context() -> dict:
    return {
        "stage": 3,
        "stage2": {
            "chronic_issues": {"top_issues": ["separation"]},
            "triggers": {"ids": ["owner_leaves"]},
        },
        "stage3": {
            "case_intake": {
                "sections": {
                    "case_summary": "보호자 일시 이탈, 미용 위탁 불안, 소리 민감",
                    "grooming_handling": {
                        "grooming_context": "목욕 위탁 시 보호자가 나가면 문을 오래 바라봄",
                        "noise_sources": ["윗집 발소리", "문 닫힘"],
                        "noise_reaction": "으르렁거리거나 짖음",
                    },
                },
                "behavior_episodes": [
                    {
                        "situation": "두 보호자 산책 중 한 명이 편의점에 들어감",
                        "behavior": "짖거나 따라가려 하고 불안해함",
                    }
                ],
            }
        },
    }


def test_retrieve_training_references_caps_at_three():
    refs = retrieve_training_references(
        issues=["separation", "reactivity", "resource_guarding", "leash_pulling", "jumping"],
        triggers=["owner_leaves", "other_dog", "food_bowl", "pulling"],
        onboarding_context={},
        limit=3,
    )

    assert len(refs) == 3
    assert len({ref.curriculum_id for ref in refs}) == len(refs)


def test_woody_case_extracts_expected_behavior_candidates_and_curricula():
    candidates = extract_behavior_candidates(
        issues=["separation"],
        triggers=["owner_leaves"],
        onboarding_context=_woody_context(),
    )
    refs = retrieve_training_references(
        issues=["separation"],
        triggers=["owner_leaves"],
        onboarding_context=_woody_context(),
    )

    assert "separation" in candidates
    assert "barking" in candidates
    assert "anxiety" in candidates
    assert [ref.curriculum_id for ref in refs] == [
        "separation_anxiety",
        "reactivity_management",
        "fear_desensitization",
    ]


def test_resource_guarding_takes_priority_over_generic_dog_reactivity():
    refs = retrieve_training_references(
        issues=["resource_guarding"],
        triggers=["food_bowl", "other_dog"],
        onboarding_context={
            "stage": 3,
            "stage3": {
                "case_intake": {
                    "sections": {"case_summary": "다견 가정, 자원 보호와 식사 관련 긴장"},
                    "behavior_episodes": [
                        {"behavior": "다른 개가 식사 공간에 오면 몸이 굳고 으르렁거림"}
                    ],
                }
            },
        },
    )

    assert refs[0].curriculum_id == "impulse_control"

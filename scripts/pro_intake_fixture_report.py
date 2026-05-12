#!/usr/bin/env python3
"""PRO-INTAKE-001 fixture recommendation report.

This script is deterministic and does not call external AI services. It builds
the same expanded onboarding context shape used by the coaching prompt and emits
a compact comparison table for review.
"""
from __future__ import annotations

from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "Backend"
sys.path.insert(0, str(BACKEND))

from app.features.coaching import prompts  # noqa: E402


@dataclass(frozen=True)
class FixtureCase:
    case_id: str
    dog_name: str
    profile: str
    input_core: str
    behavior: str
    risk_hint: str
    goals: tuple[str, ...]
    protective: tuple[str, ...]
    episode: str
    grooming_noise: str


FIXTURES = [
    FixtureCase(
        "Woody",
        "우디",
        "5개월 꼬똥 드 툴레이, 보상 반응 좋음",
        "보호자 일시 이탈, 미용 위탁 불안, 소리 민감",
        "분리 상황 탐색/짖음",
        "중간: 빈도 증가 추적 필요",
        ("편의점 앞 1분 대기", "미용실에서 보호자 퇴장 후 회복"),
        ("간식/사료 기호성 높음", "짖음 지속시간은 짧음"),
        "두 보호자 산책 중 한 명이 사라지면 짖고 따라가려 함",
        "얼굴/발 핸들링, 클리퍼, 윗집 발소리와 문 닫힘",
    ),
    FixtureCase(
        "Case A",
        "라떼",
        "어린 강아지, 건강 문제 없음",
        "배변 실수와 흥분 점프",
        "흥분 조절/배변 루틴 미성숙",
        "낮음: 성장기 관리",
        ("방문객 앞 네 발 바닥 유지", "배변 성공률 높이기"),
        ("회복 빠름", "놀이 동기 높음"),
        "방문객 입장 직후 점프하고 이후 실내 배변 실수",
        "청소기 소리에는 놀라지만 금방 회복",
    ),
    FixtureCase(
        "Case B",
        "보리",
        "성견, 하네스 사용, 회복 빠름",
        "산책 중 다른 개 반응성/짖음",
        "거리 조절 실패 시 경계성 짖음",
        "중간: 거리 임계값 관리",
        ("반대편 개를 보고도 보호자에게 돌아보기", "짖음 전 거리 확보"),
        ("회복 빠름", "하네스 적응됨"),
        "다른 개가 정면에서 가까워지면 멈추고 짖음",
        "소리 민감도는 낮음",
    ),
    FixtureCase(
        "Case C",
        "콩이",
        "노령견, 낮은 에너지",
        "통증 가능성, 핸들링 민감",
        "불편감 기반 회피 가능성",
        "높음: 수의학 확인 우선",
        ("통증 평가 후 핸들링 범위 정하기", "짧은 접촉 동의 신호 만들기"),
        ("활동량 낮아 과부하 조절 쉬움",),
        "발과 허리 주변을 만지면 몸을 돌리고 피함",
        "드라이기와 큰 소리에 움츠림",
    ),
    FixtureCase(
        "Case D",
        "모카",
        "입양/구조 이력, 낯선 환경 불안 높음",
        "낯선 사람 회피, 소리/환경 불안",
        "환경 예측성 부족과 회피 강화",
        "높음: 강제 노출 금지",
        ("방문객과 거리 유지", "안전지대에서 자발 접근"),
        ("두 번째 방문부터 회복 개선",),
        "낯선 사람이 다가오면 뒤로 물러나 숨음",
        "공사음과 엘리베이터 소리에 오래 불안",
    ),
    FixtureCase(
        "Case E",
        "두부",
        "다견 가정, 보호자 개입 이력",
        "자원 보호/식사 관련 긴장",
        "자원 접근 예측성과 경쟁 관리 필요",
        "중간~높음: 식사 분리 관리",
        ("식사 공간 분리", "그릇 주변 접근 시 긴장 낮추기"),
        ("보호자가 상황을 잘 관찰함",),
        "다른 개가 밥그릇 근처로 오면 굳고 으르렁거림",
        "식기 소리와 간식 봉지 소리에 경계",
    ),
]


def build_context(case: FixtureCase) -> dict:
    return {
        "stage": 3,
        "stage2": {
            "household_info": {"living_type": "apartment", "members_count": 2},
            "chronic_issues": {"top_issues": [case.input_core]},
            "triggers": {"ids": [case.episode]},
            "past_attempts": {"ids": ["보상 기반 관리"]},
        },
        "stage3": {
            "temperament": {"sensitivity_score": 4, "energy_level": 3},
            "health_meta": {"chronic_issues": []},
            "activity_meta": {"daily_walk_minutes": 30},
            "rewards_meta": {"ids": ["treat"]},
            "case_intake": {
                "status": "submitted",
                "source_context": "pro_intake",
                "sections": {
                    "case_summary": case.input_core,
                    "owner_goals": list(case.goals),
                    "protective_factors": list(case.protective),
                    "grooming_handling": {
                        "grooming_context": case.grooming_noise,
                        "handling_sensitive_areas": ["발"] if "발" in case.grooming_noise else [],
                        "grooming_tools": ["클리퍼"] if "클리퍼" in case.grooming_noise else [],
                        "noise_sources": [case.grooming_noise],
                        "noise_reaction": case.grooming_noise,
                        "recovery_pattern": case.risk_hint,
                    },
                },
                "behavior_episodes": [
                    {
                        "situation": case.episode,
                        "antecedent": "문제 상황 직전 단서",
                        "behavior": case.behavior,
                        "recovery": case.risk_hint,
                    }
                ],
            },
        },
    }


def recommend(case: FixtureCase) -> tuple[str, str, str]:
    if "통증" in case.input_core:
        return (
            "수의학적 통증 가능성을 먼저 배제한 뒤 핸들링 계획",
            "진료 체크, 동의 기반 접촉, 짧은 성공 반복",
            "통증 여부가 확인되지 않으면 행동 플랜 강도를 낮춰야 함",
        )
    if "자원" in case.input_core:
        return (
            "자원 접근 예측성과 다견 동선 분리가 핵심",
            "식사 분리, 교환 훈련, 접근 전 신호 만들기",
            "실제 공간 배치와 개별 식사 속도 데이터가 더 필요",
        )
    if "낯선 사람" in case.input_core:
        return (
            "회피를 줄이기보다 안전거리와 자발 접근을 보장",
            "안전지대, 방문객 무시 규칙, 소리 볼륨 단계화",
            "구조 전 이력과 회복 시간의 정량 기록이 필요",
        )
    if "다른 개" in case.input_core:
        return (
            "반응 전 거리 임계값을 찾아 대체 행동을 강화",
            "U턴, 시선 돌리기, 평행 산책 Plan A/B/C",
            "개 크기와 접근 방향별 차이를 더 나눠야 함",
        )
    if "배변" in case.input_core:
        return (
            "성장기 흥분-배변 루틴을 분리해 성공률을 높임",
            "방문객 루틴, 성공 즉시 보상, 점프 대체 행동",
            "실수 시간대와 식후 간격 기록이 더 있으면 정확해짐",
        )
    return (
        "분리 상황을 미세 단계로 쪼개고 재결합 흥분을 낮춤",
        "보호자 이탈 3초부터, 문 앞 대기, 차분한 재결합",
        "미용실 환경의 실제 영상/소리 강도 데이터가 있으면 더 좋음",
    )


def main() -> int:
    def evaluate(case: FixtureCase) -> tuple[FixtureCase, str, str, str, str]:
        prompt = prompts.build_user_prompt(
            dog_name=case.dog_name,
            breed=case.profile,
            age_months=24,
            issues=[case.input_core],
            triggers=[case.episode],
            behavior_analytics="fixture analytics",
            onboarding_context=build_context(case),
        )
        judgment, action, gap = recommend(case)
        evidence = "OK" if all(marker in prompt for marker in [
            "case_summary",
            "behavior_episodes",
            "grooming_handling",
            "noise_sensitivity",
            case.input_core,
        ]) else "CHECK"
        return case, judgment, action, gap, evidence

    print("| 케이스 | 입력 핵심 | AI 판단 | 추천 행동 | 아쉬운 점/개선 필요 | 반영 근거 |")
    print("|---|---|---|---|---|---|")
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(evaluate, FIXTURES))

    for case, judgment, action, gap, evidence in results:
        print(
            f"| {case.case_id} {case.dog_name} | {case.input_core} | "
            f"{judgment} | {action} | {gap} | {evidence}: {case.episode} |"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

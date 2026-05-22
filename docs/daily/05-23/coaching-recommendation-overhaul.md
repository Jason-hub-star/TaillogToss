# 2026-05-23 — AI 추천 디테일 + 컨텍스트 격리 + 추천 동기화 Overhaul

> Plan: `~/.claude/plans/majestic-fluttering-beaver.md`
> 영향 Parity: AI-001, UIUX-005, UI-TRAINING-PERSONALIZATION-001, UIUX-002

## Scope

표면 UX 3종 + 데이터/로직 근본 3종 문제를 한 번에 해결하는 통합 작업. 단일 세션에서 8 Phase 완료, 모든 단위 테스트 + DigitalOcean 배포 2회 검증.

## 완료된 Phase (8/9)

| Phase | 결과 | 핵심 변경 |
|---|---|---|
| **1. focused-coaching API** | ✅ + 배포 검증 | `/api/v1/coaching/generate-focused` 신규, `_filter_behavior_analytics_by_context()`, build_focused_user_prompt(), FE 라우팅 분기 |
| **2. behavior_analytics 다차원** | ✅ + 배포 검증 | 환경(location) top 3, 시간대 피크 건수, 메모 키워드 top 5 (~200 tokens 증가) |
| **3. AI 프롬프트 디테일** | ✅ + 배포 검증 | Block ① key_patterns 빈도 인용, Block ② evidence_from_intake 강제, Block ④ tasks 표준 포맷 |
| **4. DigitalOcean 배포** | ✅ | force-build 2회 (`720580a6`, `b9436988`) 모두 ACTIVE, `/health` 200 + `/generate-focused` 401 |
| **5. LockedBlock 미리보기** | ✅ | BLOCK_META.previewItems, lockTeaser 직후 bullet 4개 노출 |
| **6. 7일 플랜 Swipeable + dots** | ✅ | snapToInterval + 7 dots indicator + 오늘 day 자동 스크롤 |
| **7. 코칭↔Academy 동기화** | ✅ | engine 4번째 인자 `recentCoachingReferenceIds`, +20 coachingBonus, "최근 코칭 추천" 배지 |
| **8. ScoreBand v3 다차원** | ✅ | progressBonus(+8) + memoKeywordScore(0~15) + 종합 점수 게이지 + PRO 5종 분해 |
| **9. adb 실기기 QA** | ⏸ 남음 | 6장 스크린샷 시나리오 대기 (디바이스 연결 필요) |

## 검증 결과

| 카테고리 | 결과 |
|---|---|
| pytest (`tests/test_coaching_prompts.py`) | **12/12 PASS** (기존 6 + Phase 1 신규 4 + Phase 3 신규 2) |
| jest (engine + LockedBlock + coaching.ts) | **신규 15건 PASS** (LockedBlock 4·2 + engine 9, 회귀 무) |
| TypeScript `tsc --noEmit` | 깨끗 (별개 untracked ShareRewardCard 1건 무관) |
| DO `/health` | HTTP 200 |
| DO `/generate-focused` | HTTP 401 (라우터 등록 + 인증 미들웨어 작동) |
| DO `/generate` | HTTP 401 (회귀 없음) |
| 안전장치 (한국어/safety/risk≤3/7일×2-3) | 회귀 없음 |

## Commits (codex + main fast-forward 동기화)

- `4fe861e` — Phase 1: focused-coaching API + 격리 로직
- `_` — Phase 5+1회귀: LockedBlock previewItems + coaching.test 라우팅 분기
- `_` — Phase 6: 7일 Swipeable + dots
- `_` — Phase 7: 코칭↔Academy 동기화 + coachingBonus
- `_` — Phase 2+3: analytics 다차원 + 프롬프트 디테일
- `_` — Phase 8: ScoreBand v3 + 종합 점수 게이지

## 메모리 추가

- `feedback_be_deploy_required.md` — BE 수정 = DO 배포 + 프로덕션 헬스체크 1세트
- `feedback_adb_screenshot_qa.md` — FE UI 변경 = adb 실기기 스크린샷 의무
- `reference_do_backend_deploy_skill.md` — `~/.codex/skills/toss-do-backend-deploy` + force-build로 stale 405 해결 패턴

## Feature Flag

`src/lib/flags.ts:AI_RECOMMENDATION_V3 = true`. 문제 발생 시 false로 즉시 rollback (v2 fallback은 코드 경로상 자동 유지).

## 남은 작업 (Phase 9 QA)

| 시나리오 | 캡처 대상 |
|---|---|
| 1 | `/coaching/result` 무료 → 블록 ④⑤⑥ previewItems 노출 |
| 2 | `/coaching/result` PRO → 블록 ④ Swipeable + dots Day 1 |
| 3 | `/coaching/result` PRO → 블록 ④ Swipeable + dots Day 4 (스와이프 동작) |
| 4 | `/training/academy` 무료 → 종합 점수 게이지 + "PRO에서" CTA |
| 5 | user_context "분리불안" 입력 → 6블록 격리 결과 (다른 행동 누락) |
| 6 | 코칭 후 academy → "최근 코칭 추천" 배지 + ranking 변경 |

활용 스킬: `Skill("toss-dev-server")`, `Skill("toss-mock-auth-ops")`, `Skill("toss-sandbox-metro")`

## Risks / Follow-up

- LLM이 격리 지시 준수 여부는 실제 호출 검증 필요 (Phase 9 시나리오 5)
- ScoreBand v3 점수 분포 변경으로 기존 추천 ranking이 일부 바뀔 수 있음 → 사용자 학습 경로 영향 모니터링
- Phase 2 토큰 증가 ~200 → 일일 OpenAI 비용 약간 상승 예상 (budget 모니터링)

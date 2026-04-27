# 2026-04-27 / training/academy — AI 맞춤 추천 버그 수정

## 작업 범위
- Parity: UI-001, UI-TRAINING-PERSONALIZATION-001
- Board Status: QA

## 버그 분석 (DB 교차검증)
메이(진돗개, 3세) 로그 84건 — barking 28건(1위)임에도 "화장실 가이드" 추천 오류 확인
근본 원인 4개 + 스키마 드리프트 1개 발견 → 전부 수정

## 체크리스트

### Bug A — warm-start 로직 (academy.tsx)
- [x] `behaviors` 파라미터를 `behaviorAnalytics.top_behaviors` 기반으로 변경
- [x] `normalizeTopBehaviors()` 정규화 후 warm-start 경로에 적용
- [x] coldStartBehaviors fallback 체인 유지 (survey → DB → 'other')

### Bug B — cold-start survey 휘발성 (academy.tsx)
- [x] `useDogEnv(activeDog?.id)` 호출 추가
- [x] `dogEnv.chronic_issues.top_issues` DB 복원 경로 추가
- [x] 앱 재시작 후에도 설문 행동 기반 추천 유지
- [x] `behaviorText` useMemo도 동일 DB 복원 패턴 적용

### Bug C — TS 스키마 드리프트 (types/dog.ts)
- [x] `ChronicIssues` 인터페이스 신규 추가
- [x] `DogEnv`에 `chronic_issues?: ChronicIssues | null` 필드 추가
- [x] `rewards_meta?: Record<string, unknown> | null` 필드 추가

### Bug D — quick_category 정규화 (behaviorToCurriculum.ts)
- [x] `QUICK_CATEGORY_TO_BEHAVIOR_TYPE` 매핑 상수 추가
- [x] `normalizeTopBehaviors(string[]): BehaviorType[]` 함수 추가
- [x] `pulling → leash_pulling`, `biting → aggression` 불일치 해소

### 검증
- [x] `npx tsc --noEmit` — 에러 0개
- [ ] DevMenu PRO 오버라이드 → ScoreBand에 reactivity_management 점수 표시 확인 (앱 실행 필요)
- [ ] 앱 재시작 후 academy 진입 → 화장실 가이드 대신 짖음 관리 추천 확인

## 미완 / 후속
- [ ] 앱 실제 실행 후 추천 결과 시각 검증 (QA → Done 전환 조건)
- [ ] Backend `analytics/service.py` quick_category 정규화 추가 검토 (서버사이드 보강)

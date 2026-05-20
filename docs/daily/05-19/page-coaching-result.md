# 2026-05-19 Coaching Result Monetization Copy

## Scope

- [x] AI-001: FREE 기본 코칭 한도를 하루 1회로 낮추고 토큰팩 확장 한도는 서버 limit 기준으로 유지
- [x] AI-001: 무료 사용량 초과 배너를 `무료 1회` 기준으로 정리
- [x] PRO-INTAKE-001: 무료 코칭은 일반 설문+기록 기반, PRO는 Stage 3 상담지 기반 정밀 코칭임을 CTA에 명시
- [x] APP-001: Stage 2 인터셉트 문구에서 무료 사용자에게 6블록/7일 플랜이 모두 열리는 듯한 표현 제거

## Files

- `src/pages/coaching/result.tsx`
- `src/pages/coaching/CoachingDetailContent.tsx`
- `src/components/features/coaching/UsageLimitBanner.tsx`
- `src/components/features/survey/Stage2InterceptModal.tsx`
- `Backend/app/features/coaching/budget.py`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/11-FEATURE-PARITY-MATRIX.md`
- `docs/status/PAGE-UPGRADE-BOARD.md`

## Validation

- [x] `npx tsc --noEmit`
- [x] `Backend/venv/bin/pytest Backend/tests/test_routers.py Backend/tests/test_models.py -q`
- [x] `Backend/venv/bin/python -m py_compile Backend/app/features/coaching/budget.py Backend/app/features/coaching/service.py`
- [x] ADB `/settings/subscription` text dump: `AI 코칭 하루 10회`, `상담지 기반 정밀 코칭`, `하루 1회 + 토큰 충전`, `결제 복원`
- [x] `git diff --check -- <changed files>`

## Board Sync

- `/coaching/result`: `QA`

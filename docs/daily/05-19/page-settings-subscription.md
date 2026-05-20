# 2026-05-19 Subscription Price UI Hotfix

## Scope

- [x] IAP-001: IAP 상품 카탈로그에 콘솔 공급가, 판매가, 기준가, 프로모션 라벨을 한 곳으로 통합
- [x] IAP-001: PRO 월간 플랜을 `₩10,000` 기준가 + `₩7,920/월` 런칭 특가 UI로 교체
- [x] IAP-001: AI 토큰 10회를 `₩4,000` 기준가 + `₩2,750` 판매가 + 회당 `₩275`로 교체
- [x] IAP-001: AI 토큰 30회를 `₩10,000` 기준가 + `₩6,600` 판매가 + 회당 `₩220`로 교체
- [x] AI-001: FREE 사용자가 토큰팩으로 기본 1회 이후 추가 코칭을 사용할 수 있도록 사용량 UI를 서버 limit 기준으로 정렬
- [x] AI-001: FREE 기본 1회를 넘긴 코칭 생성 성공 시 `ai_tokens_remaining` 1회 차감
- [x] IAP-001: `구매 내역 복원`을 `결제 복원`으로 교체하고 구독/토큰 상태 복원 문구로 정리
- [x] PRO-INTAKE-001: PRO 가치를 `상담지 기반 정밀 코칭`으로 명시해 무료/PRO 코칭 경계를 안내

## Files

- `src/types/subscription.ts`
- `src/pages/settings/subscription.tsx`
- `src/components/features/training/ProUpgradeSheet.tsx`
- `src/pages/coaching/result.tsx`
- `src/components/features/coaching/UsageLimitBanner.tsx`
- `src/components/features/survey/Stage2InterceptModal.tsx`
- `Backend/app/features/coaching/budget.py`
- `Backend/app/features/coaching/service.py`
- `docs/status/PAGE-UPGRADE-BOARD.md`

## Validation

- [x] `npx tsc --noEmit`
- [x] `Backend/venv/bin/pytest Backend/tests/test_routers.py Backend/tests/test_models.py -q`
- [x] `Backend/venv/bin/python -m py_compile Backend/app/features/coaching/budget.py Backend/app/features/coaching/service.py`
- [x] ADB `/settings/subscription` UI dump: `런칭 특가`, `₩10,000`, `₩7,920/월`, `₩2,750`, `회당 ₩275`, `₩6,600`, `회당 ₩220` 확인
- [x] ADB `/settings/subscription` UI dump: `AI 코칭 하루 10회`, `상담지 기반 정밀 코칭`, `하루 1회 + 토큰 충전`, `결제 복원` 확인
- [x] `git diff --check -- <changed files>`

## Board Sync

- `/settings/subscription`: `QA`

# App Copy Pass — 2026-05-20

Scope: UI-001, APP-001, IAP-001, REG-001, B2B-001

## Done

- [x] 온보딩/코칭/훈련/설정/운영 화면의 딱딱한 문어체, 내부 용어, 영어 `Plan`/`Day` 라벨을 토스앱 톤의 해요체로 교체했다.
- [x] `/legal/terms` 유료 서비스 가격을 `IAP_PRODUCTS` 카탈로그 기준으로 연결해 구독 화면과 약관 가격이 따로 어긋나지 않게 했다.
- [x] `scripts/check-ux-copy.js`와 `npm run ux-copy:check`를 추가해 금지 패턴 재유입을 검사한다.

## Validation

- [x] `npm run ux-copy:check` PASS
- [x] `npm run typecheck` PASS
- [x] `npm run test:app -- --runInBand --passWithNoTests` PASS (19 suites / 116 tests)
- [x] Scoped `git diff --check` PASS

## Board Sync

- Board status remains unchanged for touched routes: existing `Done` and `QA` states preserved.
- Last-updated dates synced to `2026-05-20` for touched route rows in `docs/status/PAGE-UPGRADE-BOARD.md`.

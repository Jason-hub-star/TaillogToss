# 2026-05-03 / 배포 전 사전 점검

## 작업 내용

- [x] `src/pages/onboarding/welcome.tsx:192` — "90초면 기록 끝" → "30초면 기록 끝" 수정
- [x] `src/pages/ops/dog-add.tsx:257,295` — "DB 연동 준비 중 — 현재 로컬 보관" 힌트 텍스트 2개 제거
- [x] DevMenu — `{__DEV__ && <DevMenu />}` production 빌드에서 자동 숨겨짐 확인 (수정 불필요)
- [x] 설정 페이지(settings/index, settings/subscription) — 모두 실API 연동 확인 (mock 없음)
- [x] B2B 페이지(ops/today, ops/setup, ops/settings, ops/dog-add) — 모두 실API 연동 확인
- [x] `taillog-app.ait` 신규 빌드 완료 (`npm run build` → `ait build`)

## 검증

- tsc 0 errors
- ait build: 2801/2801 modules, 0 errors, 0 warnings (iOS + Android)
- 파일: `taillog-app.ait` 15.3MB, May 3 17:24 KST

## 상태

Board: `Done`
Parity: IAP-001 (AIT 빌드 완료)

## 다음 단계

1. AIT 콘솔 → `.ait` 업로드 → QR 스캔 (Phase 3)
2. IAP 샌드박스 3종 시나리오 실행 (Phase 4~7)

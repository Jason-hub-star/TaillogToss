# 2026-05-20 B2B Ops / Report Audit

Scope: `B2B-001`

## Findings

- [x] `/ops/today` 개별 기록 모달 SafeArea/keyboard gap 확인.
  - B2C `/dashboard/quick-log` 정상 패턴은 `SafeAreaView` + `KeyboardAvoidingView` + 입력 focus 시 scroll 보정.
  - B2B `RecordModal`은 RN `Modal` 내부 별도 native window인데 `SafeAreaProvider`/insets가 없고 footer가 하단 시스템 영역을 고려하지 않았음.
- [x] 즉시 패치.
  - `src/components/features/ops/RecordModal.tsx`: `SafeAreaProvider`, `useSafeAreaInsets`, `KeyboardAvoidingView`, `keyboardShouldPersistTaps`, memo focus scroll, footer bottom inset 적용.
  - `src/components/features/ops/ReportPreviewSheet.tsx`: 동일 패턴 적용.
- [x] 리포트 발송 기능 확인.
  - FE `sendReport()`와 BE `send_report()`는 `share_token`, `sent_at`, `expires_at`, `generation_status=sent`만 갱신.
  - 실제 Toss `getTossShareLink`, Smart Message, SMS/Alimtalk, Clipboard/ShareSheet 호출은 없음.
  - `ReportPreviewSheet`의 “공유 링크”는 실제 공유 URL 생성이 아니라 path 문자열 표시 수준.
- [x] 리포트 생성 기능 확인.
  - FastAPI `/api/v1/report/`는 `generation_status=pending` 빈 row 생성까지만 수행.
  - `supabase/functions/generate-report` Edge는 mock/real 생성 로직이 있으나 현재 FE/BE 생성 플로우와 직접 연결되어 있지 않음.
- [x] 내보내기 확인.
  - CSV/PDF/export 기능은 코드상 확인되지 않음. `MISSING-AND-UNIMPLEMENTED.md`에도 데이터 내보내기가 미구현/V2 후보로 남아 있음.
- [x] 로고 확인.
  - 스키마/타입/응답에는 `organizations.logo_url`이 있으나 `/ops/setup`, `/ops/settings`, `OrgInfoEditForm`, `updateOrg` UI/API 흐름에서 업로드/수정/표시가 없음.

## Schema Review

- `daily_reports`는 `share_token`, `toss_share_url`, `expires_at`, `sent_at`, `highlight_photo_urls`, AI 요약 필드를 갖고 있어 보호자 공유/발송/리포트 표시를 감당할 수 있음.
- `organizations.logo_url`도 있어 센터 로고 저장 구조는 있음.
- CSV/PDF 내보내기를 “즉시 생성 다운로드”로만 처리하면 현재 스키마로 가능하지만, 파일 보관/감사/재다운로드까지 요구하면 `report_exports` 같은 별도 테이블 또는 Storage object metadata가 필요함.

## Validation

- `npx tsc --noEmit` PASS
- `git diff --check -- src/components/features/ops/RecordModal.tsx src/components/features/ops/ReportPreviewSheet.tsx` PASS

## Next

- [ ] B2B 리포트 생성 플로우를 FastAPI 생성 후 Edge `generate-report` 실행 또는 FastAPI 내부 생성으로 연결.
- [ ] 발송을 `getTossShareLink` + 실제 공유/메시지 CTA로 교체하고 `daily_reports.toss_share_url` 저장.
- [ ] `/ops/settings` 센터 로고 업로드/표시/수정 추가.
- [ ] `/parent/reports`와 `/report/[shareToken]` 보호자 뷰를 B2C 수준의 읽기 UX로 재구성.

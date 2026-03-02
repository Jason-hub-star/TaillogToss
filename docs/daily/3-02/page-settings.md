# Settings UX 낙관 업데이트 보강 (2026-03-02)

Scope: APP-001
Route: `/settings`

## Checklist
- [x] 토글/스테퍼/AI 설정 값을 서버 응답 대기 없이 로컬 상태로 즉시 반영
- [x] 저장 상태를 비동기 동기화 상태(`동기화 중/실패/저장됨`)로 분리
- [x] 저장 중 UI 잠금 제거(토글 즉시 반응)
- [x] `급증 알림` 라벨을 의미가 드러나도록 보강 (`행동 급증 알림` + 설명 텍스트)
- [x] `npm run typecheck` 통과

## Files
- `src/pages/settings/index.tsx`
- `src/components/features/settings/SettingsToggleRow.tsx`
- `docs/status/PAGE-UPGRADE-BOARD.md`

## Board Sync
- `/settings` 상태: `Done -> QA`
- `last_updated`: `2026-03-02`

## Risks
- 저장 실패 시 현재는 상태 행으로만 실패를 보여주므로, 배포 전 `동기화 상태` 제거 시 실패 피드백 대안(토스트 등)이 필요함
- 빠른 연속 토글에서 마지막 요청 기준으로 동기화 상태를 갱신하므로, 요청별 상세 이력은 별도 로깅이 필요함

## Self-Review
- good: 체감 지연의 원인이던 `pending` 잠금을 제거하고 낙관 업데이트로 즉시 반응성을 확보함
- weak: `동기화 상태`를 제거할 최종 UX(대체 피드백)까지는 이번 작업 범위에 포함하지 않음
- verification-gap: 실기기에서 느린 네트워크(3G throttle) 기준 체감 테스트는 미수행

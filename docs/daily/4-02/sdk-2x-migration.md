# SDK 2.x 마이그레이션 (2026-04-02)

## 완료 항목

- [x] `@apps-in-toss/framework` 1.14.1 → 2.4.1
- [x] `@toss/tds-react-native` 1.3.8 → 2.0.2
- [x] `@granite-js/react-native` 0.1.34 → 1.0.4
- [x] `react` 18.2.0 → 19.2.3
- [x] `react-native` 0.72.6 → 0.84.0
- [x] `ait migrate react-native-0-84-0` 코드모드 실행
- [x] `package.json` build: `granite build` → `ait build`
- [x] `SurveyContainer.tsx` — `BackHandler.removeEventListener` → `subscription.remove()` (RN 0.84 API)
- [x] `deepEntry.ts` — `URL.pathname` read-only 대응 (RN 0.84)
- [x] `backend.ts` — unused DEV_LAN_BACKEND_URL 주석화
- [x] tsc 0 에러
- [x] 114 tests 전체 통과 (FE 83 + Edge 31)
- [x] `ait build` → `taillog-app.ait` 4.9MB (100MB 한도 대비 5%)

## 미수행 항목

- [ ] 실기기 Sandbox 검증 (SDK 2.x 빌드 번들)
- [ ] `checkoutPayment` — 미사용이라 변경 불필요했으나 향후 TossPay 사용 시 `params` 래핑 필요
- [ ] `getTossShareLink` — 주석만 있고 실호출 없음, 향후 사용 시 2번째 인자 삭제 필요

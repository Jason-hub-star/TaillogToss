# 2026-05-01 / settings/subscription

## 작업 내용

- [x] `src/types/subscription.ts` — IAP_PRODUCTS 3종 product_id 플레이스홀더 → AIT 콘솔 실ID 교체
  - PRO: `ait.0000020829.09e69bf9.90a91624b0.7443236299`
  - 토큰10: `ait.0000020829.b0b00d71.17c5290dc1.7444362301` (가격 1903→1892)
  - 토큰30: `ait.0000020829.32dc32cf.49e67a4cfa.7443541064`
- [x] `src/pages/settings/subscription.tsx` — 하드코딩 product_id → `product.product_id` 상수 참조
- [x] `subscription.tsx` — 회당 단가 동적 계산 (토큰10: 190→189 / 토큰30: 163→117)
- [x] `toss-dev-server` 스킬 — `npx granite dev` 버그 수정 + LAN IP 폴백 추가

## 검증

- tsc 0 errors
- AIT 콘솔 상품 ID 3종 육안 대조 완료

## 상태

Board: `Done`
Parity: IAP-001

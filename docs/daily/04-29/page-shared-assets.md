# Shared Asset Work — 2026-04-29

Parity: IAP-001, APP-001

## 완료 항목

- [x] `image_gen` 기반 IAP 프로모션 일러스트 마스터 3종 생성 (`/tmp/taillogtoss-promo-masters/`)
- [x] `scripts/build_promo_cards_from_masters.py` 신규 추가
- [x] `src/assets/promos/promo-taillog-pro-1024.png` 생성
- [x] `src/assets/promos/promo-ai-coaching-token-10-1024.png` 생성
- [x] `src/assets/promos/promo-ai-coaching-token-30-1024.png` 생성
- [x] 모든 프로모션 카드 `1024x1024 PNG` 규격 검증 완료
- [x] 최종 납품본은 카피/가격 텍스트를 모두 제거하고 `image_gen` 마스터 일러스트 스타일 그대로 교체

## Notes

- Scope: shared monetization/marketing asset work, not a single route.
- Board sync: N/A (no `docs/status/PAGE-UPGRADE-BOARD.md` row changed).
- Generation source: `image_gen` masters + `scripts/build_promo_cards_from_masters.py`
- Visual direction: 기존 앱 아이콘과 맞춘 navy + gold 브랜드 톤으로 귀여운 강아지 중심 IAP 광고 카드 구성.
- Final export revision: `src/assets/promos/*.png`와 `Downloads/*.png`는 회색 배경의 텍스트 없는 일러스트 버전으로 덮어씀.

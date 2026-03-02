# `page-dashboard-analysis-upgrade` (2026-03-02)

## Goal
- **Parity ID:** UIUX-001 (Dashboard Stabilization)
- **Target:** `/dashboard/analysis`
- **Issue:** 데이터 로딩 시 단순 인디케이터만 노출되어 UX가 단조롭고, 데이터가 없을 때의 시각적 피드백이 부족함.

## Execution Plan
- [x] **공통 로더 구현:** `SkeletonLoader.tsx` 생성 (Lottie `cute-doggie` + 메시지).
- [x] **로딩 상태 적용:** `analysis.tsx`의 `ActivityIndicator`를 `SkeletonLoader`로 교체.
- [x] **Empty State 개선:** `analysis.tsx`의 데이터 부재 시 Lottie `long-dog` 애니메이션 적용.

## Status Check
- [x] 로티 애니메이션 정상 재생 확인.
- [x] 데이터 부재 시 `EmptyState`의 시각적 완성도 향상.
- [x] `/dashboard/analysis` 경로의 로딩 전략 표준화.

---
*Self-Review: 기존 SkeletonBox 위주의 로딩보다 서비스의 성격(강아지 앱)을 더 잘 드러내는 로티 기반 로더로 개선함.*

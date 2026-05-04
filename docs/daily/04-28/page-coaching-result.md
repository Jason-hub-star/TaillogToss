# 코칭/분석 UX 개선 (UIUX-005) — 2026-04-28

Status: **Done**

## 작업 내역

### 문제 4종
1. 분석탭 "상세 분석 보기" 링크 → 흐름 분산
2. `/coaching/result` 최신탭 정보 과부하 (Block ④⑤⑥ 무료/Pro 구분 없음)
3. 심화인사이트 리포트 vs 6블록 코칭 차이 불명확
4. "새 코칭 받기" 한도 초과 시에도 API 호출 → 429

### Phase 1.5: UsageLimitBanner 신규
- [x] `src/components/features/coaching/UsageLimitBanner.tsx` 생성
  - `isPro: boolean`, `limit: number` props
  - `colors.orange50`/`colors.orange700` 토큰 사용
  - 재사용처: CoachingDetailContent, 향후 ask_coach 등

### Phase 1: CoachingBlockList isPro 분기
- [x] `isPro?: boolean` prop 추가 (기본값 `false`)
- [x] `LockedBlock` import 추가
- [x] Block ④⑤⑥ 조건부: `isPro ? UnlockedBlock : LockedBlock`

### Phase 2: CoachingDetailContent + result.tsx
- [x] `CoachingBlockList`에 `isPro` 전달
- [x] 심화인사이트 CTA 텍스트 개선: `'🔒 7일 플랜 + 위험신호 분석 + 전문가 상담 잠금 해제'`
- [x] `isLimitReached = usage != null && usage.used >= usage.limit`
- [x] `UsageLimitBanner` 버튼 위 삽입
- [x] 버튼 `disabled={isGenerating || isLimitReached}` + disabled 스타일
- [x] `onNavigateToAnalysis` prop 삭제 (`result.tsx` + `CoachingDetailContent`)

### Phase 3: dashboard/index.tsx
- [x] "상세 분석 보기" TouchableOpacity 링크 삭제
- [x] `analysisLink`, `analysisIcon`, `analysisText`, `analysisArrow` 스타일 4개 삭제

### Phase 4: dashboard/analysis.tsx
- [x] `useAuth`, `useIsPro`, `useDailyUsage` import 추가
- [x] hook: `user`, `isPro`, `dailyLimit`, `dailyUsageData` 추가
- [x] `CoachingPreviewCard`에 `dailyUsed`/`dailyLimit` prop 연결
- [x] 섹션 헤더: `{filteredLogs.length}건 기록 기반 · AI 코칭 받기`

## 검증
- tsc 0 errors ✅

## Board 상태
- `/coaching/result` → Done (2026-04-28)
- `/dashboard` → Done (2026-04-28)
- `/dashboard/analysis` → Done (2026-04-28)

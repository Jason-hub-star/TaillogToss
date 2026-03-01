# training/ — 훈련 컴포넌트

training/academy.tsx, training/detail.tsx 페이지에서 사용.

## 스킬 참조
- 와이어프레임: `Skill("toss_wireframes")` §9-7, 11.3
- 커리큘럼 데이터: `lib/data/published/runtime.ts`

## 파일

| 파일 | 용도 |
|------|------|
| `CurriculumCard.tsx` | 커리큘럼 GridList 카드 (진도율 ProgressBar) — legacy |
| `CurriculumShowcaseCard.tsx` | JourneyMap용 풀-width 쇼케이스 카드 |
| `CurriculumJourneyMap.tsx` | 세로 타임라인 + 좌우 교대 쇼케이스 카드 |
| `AIPersonalizedHero.tsx` | AI 맞춤 분석 히어로 (fade-in 연출) |
| `ProUpgradeBanner.tsx` | PRO 구독 유도 배너 |
| `InsightSummaryBar.tsx` | 반응 피드백 요약 바 |
| `StepCompletionSheet.tsx` | 스텝 완료 후 반응 피드백 바텀시트 |
| `DaySummarySheet.tsx` | Day 완료 축하 + 반응 요약 시트 |
| `RecommendationCard.tsx` | AI 맞춤 추천 카드 (fade-in 연출) |
| `MissionChecklist.tsx` | 미션 체크리스트 (체크 애니메이션 + 메모 + 팁) |
| `VariantSelector.tsx` | Plan A/B/C 전환 |
| `SkeletonAcademy.tsx` | 아카데미 로딩 스켈레톤 (JourneyMap 미러링) |

# onboarding/ — 최초 진입 플로우

Journey A (Cold Start < 3분): login → welcome → stage1-form(필수) → survey-result → notification → dashboard
Journey A' (Progressive Profiling): dashboard → stage2-form(소프트) → coaching/result / dashboard → stage3-form(Pro 유도)

## 스킬 참조
- 와이어프레임: `Skill("toss_wireframes")` §9-1, 9-2, 11.3
- 여정 흐름: `Skill("toss_journey")` Journey A

## 파일

| 파일 | 용도 | 레이아웃 |
|------|------|---------|
| `welcome.tsx` | 가치 제안 카드 + Lottie(cute-doggie) + CTA | Standalone |
| `stage1-form.tsx` | Stage 1 (7문항: 이름/견종/생년월일/성별/몸무게/중성화/사진) — 필수, 스킵 불가 | C (입력폼형) |
| `stage2-form.tsx` | Stage 2 (~9문항: 고민/주거/트리거/과거시도) — 소프트, "나중에 하기" 허용 | C (입력폼형) |
| `stage3-form.tsx` | Stage 3 (12문항: 기질/건강/활동성/보상) — Pro 유도, 완료 시 풀 개인화 코칭 | C (입력폼형) |
| `survey.tsx` | Legacy 7단계 설문 (SurveyContainer 위임) — deprecated | C (입력폼형) |
| `survey-result.tsx` | AI 요약 + Skeleton 블러 티저 + 광고/기록 CTA | B (상세형) |
| `notification.tsx` | 알림 허용 체크박스 3개 + Lottie(벨) | B (상세형) |

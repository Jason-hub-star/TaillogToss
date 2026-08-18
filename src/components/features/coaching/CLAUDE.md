# coaching/ — AI 코칭 결과 컴포넌트

coaching/result.tsx 페이지에서 사용하는 6블록 코칭 UI.

## 스킬 참조
- 와이어프레임: `Skill("toss_wireframes")` §9-6
- TDS 컴포넌트: `Skill("toss_apps")` §3

## 파일

| 파일 | 용도 |
|------|------|
| `FreeBlock.tsx` | 행동 분석, 실행 계획, 강아지 시점 블록 |
| `LockedBlock.tsx` | 7일플랜, 리스크, 전문가Q&A 렌더러 + legacy 잠금 프리뷰 |
| `PlanSelector.tsx` | 훈련 Plan A/B/C 선택 (Radio + 잠금 표시) |

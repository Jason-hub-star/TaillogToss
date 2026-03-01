# ops/ — B2B 운영 화면

Journey E (B2B Ops): subscription(B2B) → role 전환 → dashboard(운영탭) → ops-today

## 스킬 참조
- 와이어프레임: `Skill("toss_wireframes")` §9-10
- 여정 흐름: `Skill("toss_journey")` Journey E
- B2B 스키마: `docs/ref/SCHEMA-B2B.md`

## 파일

| 파일 | 용도 | 레이아웃 |
|------|------|---------|
| `today.tsx` | 오늘의 운영 대시보드 + FlatList 무한스크롤 + 기록 모달 | D+A (탭+목록) |
| `settings.tsx` | 조직 멤버/통계 관리 | A (목록형) |

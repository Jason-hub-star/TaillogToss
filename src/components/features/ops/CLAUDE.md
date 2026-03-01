# ops/ — B2B 운영 컴포넌트 (14종)

ops/today.tsx, ops/settings.tsx 페이지에서 사용.

## 스킬 참조
- 와이어프레임: `Skill("toss_wireframes")` §9-10
- B2B 스키마: `docs/ref/SCHEMA-B2B.md`
- 여정: `Skill("toss_journey")` Journey E

## 파일

| 파일 | 용도 |
|------|------|
| `OpsList.tsx` | FlatList 무한스크롤 목록 |
| `OpsListItem.tsx` | 운영 목록 아이템 (강아지+기록 요약) |
| `OpsBadge.tsx` | 상태 뱃지 (pending/done/missed) |
| `OpsBottomInfo.tsx` | 하단 통계 정보 |
| `RecordModal.tsx` | 기록 입력 모달 |
| `BulkActionBar.tsx` | 일괄 작업 바 |
| `BulkPresetSheet.tsx` | 프리셋 일괄 적용 시트 |
| `PresetChipGrid.tsx` | 프리셋 칩 그리드 |
| `PresetManager.tsx` | 프리셋 관리 (CRUD) |
| `ReportCard.tsx` | 리포트 카드 |
| `ReportPreviewSheet.tsx` | 리포트 미리보기 시트 |
| `MemberList.tsx` | 멤버 목록 + 역할 Badge |
| `InviteSheet.tsx` | 멤버 초대 시트 |
| `OrgStatsSheet.tsx` | 조직 통계 시트 |

# Training Plan Implementation Checklist
> 생성: 2026-04-22 | 플랜: 훈련 커리큘럼 철학 재정의 + 자동화 품질루프

## 현재 상태 스냅샷 (실행 전 측정)
- null altB 스텝 수: 74 (총 109개 중 35개만 altB 있음)
- null altC 스텝 수: ~104 (대부분 altC 없음)
- tsc --noEmit 에러 수: 0
- 커리큘럼 총: 7개 / 행동 매핑: 10개 확인됨

## 페이즈별 완료 기준

| 페이즈 | 완료 조건 | 자기리뷰 | 문서 | 상태 |
|--------|----------|---------|------|------|
| **Phase 1** (타입+메타) | tsc 통과, planMeta 7개 커리큘럼 모두 추가 | `/self-review` | `docs/weekly/2026-W17.md` | ✅ |
| **Phase 2** (스텝 재작성) | null altB 50% 이상 감소 (74 → 37 이하) | `/self-review` | `docs/weekly/2026-W17.md` | ✅ |
| **Phase 3** (UI 뱃지) | VariantSelector에 철학 뱃지 렌더링 | `/self-review` | `docs/weekly/2026-W17.md` | ✅ |
| **Phase 4** (자동화) | `training-data-maintenance.prompt.md` 생성, cron 등록 | `/self-review` | `docs/status/TRAINING-DATA-LOG.md` 초기화 | ✅ |

## 페이즈별 결과 기록

### Phase 1 ✅
- [x] `PlanPhilosophy` 타입 추가 (`src/types/training.ts`)
- [x] `PlanMeta` 인터페이스 추가
- [x] `Curriculum.planMeta` 필드 추가
- [x] planMeta 블록 7개 커리큘럼 모두 추가 (`curriculum.ts`)
- [x] tsc --noEmit 통과 확인

실제 null altB 수 (Phase 1 후): 74 (변동 없음, 타입/메타만 추가)
tsc 에러 수: 0

### Phase 2 ✅
- [x] basic_obedience 누락 altB/C 채우기 (15/15 완료)
- [x] leash_manners 누락 altB/C 채우기 (18/18 완료)
- [x] separation_anxiety 누락 altB/C 채우기 (8개 추가)
- [x] reactivity_management 누락 altB/C 채우기 (7개 추가)
- [x] impulse_control 누락 altB/C 채우기 (15/15 완료)
- [x] socialization 누락 altB/C 채우기 (15/15 완료)
- [x] fear_desensitization 누락 altB/C 채우기 (15/15 완료)

실제 null altB 수 (Phase 2 최종): 0 ✅
실제 null altC 수 (Phase 2 최종): 0 ✅
감소율: 100% ✅

### Phase 3 ✅
- [x] VariantSelector에 planMeta prop 추가
- [x] 철학 뱃지 (Focus/PlayBased/Adaptive) 표시 — PHILOSOPHY_LABEL 매핑
- [x] ideal_for 텍스트 표시 — idealForText 스타일 추가
- [x] detail.tsx에 planMeta 전달 — `planMeta={curriculum?.planMeta}`

### Phase 4 ✅
- [x] `training-data-maintenance.prompt.md` 생성
- [x] `TRAINING-DATA-LOG.md` 초기화 (커리큘럼 품질 지표 섹션 추가)
- [ ] CLAUDE.md 자동화 섹션 cron 등록 — 수동 cron 미지원, 자동화 파일로 대체

## 다음 플랜 이월 항목

1. 매주 금요일 `training-data-maintenance` 첫 실행 후 TRAINING-DATA-LOG.md 갱신 확인
2. 신규 커리큘럼 후보 갭 분석 (월 첫째 주 금요일 자동화)
3. tsc + 커버리지 검증 자동화 추가 검토

# training-data-maintenance

**Schedule**: taillog-weekly-orchestrator TASK 1
**월간 갭 분석**: 매월 첫째 주 금요일에만 STEP 3 추가 실행

---

## STEP 1: 선제적 콘텐츠 보강 (매주 실행)

1. `src/lib/data/published/v2026-03-02-auto-080532/curriculum.ts` 에서 `altB: null` 스텝 목록 추출
2. `altC: null` 스텝 목록 추출
3. 각 null 스텝에 대해:
   - **altB (PlayBased)**: "놀이/탐색 게임" 방식으로 초안 작성. 간식 중심 지시 → 탐색·게임·냄새 탐험으로 전환. 보상은 칭찬/놀이.
   - **altC (Adaptive)**: 환경·나이·체형 분기 조건부 버전 작성. 노견/아파트/트라우마 케이스 포함.
4. 초안을 `docs/daily/MM-DD/training-enrichment-draft.md`에 저장 (MM-DD = 실행 날짜)
5. **주인님 검수 후** curriculum.ts에 직접 반영 (자동 반영 금지)

---

## STEP 2: 품질 검증 (매주 실행)

아래 지표를 측정하여 `docs/status/TRAINING-DATA-LOG.md`를 업데이트:

| 지표 | 목표 | 경고 기준 |
|------|------|----------|
| altB 커버리지 | 100% | < 80% |
| altC 커버리지 | 100% | < 80% |
| 일일 duration 합계 | 20~40분/day | 이탈 시 ⚠️ |
| 커리큘럼 수 | 7개 (목표: 12~15개) | — |
| 행동-커리큘럼 매핑 중복 | 없음 | 중복 시 ⚠️ |

```
TRAINING-DATA-LOG.md 업데이트 포맷:
## [YYYY-MM-DD] 주간 품질 리포트
- altB null 수: N
- altC null 수: N
- 커버리지: altB X%, altC X%
- duration 이탈: [없음 | 목록]
- 중복 매핑: [없음 | 목록]
- 조치 필요: [없음 | 내용]
```

---

## STEP 3: 갭 분석 (매월 첫째 주 금요일에만)

현재 커버하지 못하는 행동 영역 분석:

**고정 갭 후보 목록** (우선순위 순):
1. `aggressive_biting` — 공격적 물기
2. `destructive_chewing` — 파괴적 씹기
3. `excessive_barking` — 과도한 짖기
4. `resource_guarding` — 자원 지키기
5. `jumping_on_people` — 사람에게 뛰어오르기

실행:
1. 현재 7개 커리큘럼이 위 행동 중 커버 못하는 영역 파악
2. 다음 추가 후보 커리큘럼 1개 선정
3. 스텝 뼈대 초안 작성 (5~6일, 각 3스텝)
4. `docs/daily/MM-DD/training-new-curriculum-draft.md`에 저장
5. **주인님 검수 후** 새 curriculum 파일 추가 (자동 추가 금지)

---

## 출력 파일 요약

| 파일 | 생성 주기 | 목적 |
|------|----------|------|
| `docs/daily/MM-DD/training-enrichment-draft.md` | 매주 | null 스텝 보강 초안 (검수용) |
| `docs/status/TRAINING-DATA-LOG.md` | 매주 업데이트 | 주간 품질 리포트 |
| `docs/daily/MM-DD/training-new-curriculum-draft.md` | 월 1회 | 신규 커리큘럼 초안 (검수용) |

---

## 자동화 철학

```
[사용자 반응 수집]
     ↓
[주간 자동화: null 스텝 감지 + 초안 생성]
     ↓
[주인님 검수 → curriculum.ts 갱신]
     ↓
[월간 자동화: 갭 분석 → 신규 커리큘럼 후보]
     ↓
(반복 → 데이터 기반으로 조금씩 영구 성장)
```

목표 커리큘럼 수: 7개 → 12~15개 (gap 채우기 기준). 그 이상은 실사용 데이터가 판단.

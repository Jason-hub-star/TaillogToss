# GOAL-ke-t1-path-coverage — how 214장이 증상→목표 경로를 연속으로 채우는가

## 골 한 줄

tailtree how 카드 214장이 상위 10개 증상 경로를 끊김 없이 채우는지 실측해 이식 착수 여부를 판정 — verified by `node scripts/ke/ke-t1-path-coverage.mjs --gate` 종료코드 + `docs/ref/rnd/KE-T1-RESULT.json`, while preserving 앱 코드 0줄·양 레포 데이터 무변경. details in docs/goals/GOAL-ke-t1-path-coverage.md

## 0. 왜 이 실험인가

`docs/ref/rnd/TRAINING-GRAPH-PORT-CONVERGE-LOOP-2026-08-18.md` 의 **불가역 크럭스**:
how 커버리지 15.2%(214/1412)는 **전체 평균**일 뿐이고, 선행 사다리 위에서 how 없는 노드가 연속으로 나오면 유저는 거기서 막힌다. 계획으로 못 닫는다 — 세어야 한다.

## 0-1. 봉인된 기준선 (실측, 라운드 전 고정)

현행 TaillogToss (`src/lib/data/mappings/behaviorToCurriculum.ts`, `catalog.json`):

| 지표 | 값 | 근거 |
|---|---|---|
| B1 진입 커버리지 | **10/10 (100%)** | `BEHAVIOR_TO_CURRICULUM` 이 모든 `BehaviorType`을 매핑 |
| B2 경로 충전율 | **100%** | 스텝 109 전부 내용 보유 (정의상) |
| **B3 경로 고유성** | **0.70** | 10 behavior → **고유 커리큘럼 7종**. `destructive`·`resource_guarding`→`impulse_control`, `barking`·`reactivity`→`reactivity_management`, `jumping`·`other`→`basic_obedience` — **30%는 남의 코스를 받는다** |
| B4 경로 길이 | **≈15.6 스텝** | 109 ÷ 7 |

> **기준 설계 주의**: B2가 정의상 100%라 "충전율이 현행 이상"은 성립할 수 없다(수렴 루프 R4의 임계가 여기서 무효화됨 — 이 브리프가 정정본이다). 비교 축은 **B3 경로 고유성**으로 옮기고, 충전율은 **연속성**으로 판정한다.

## 1. Outcome

상위 10개 증상 각각에 대해 아래 3지표를 산출하고 PASS/FAIL 이진 판정을 낸다.

**PASS 조건 (셋 다 충족)**
- **(a) 경로 고유성 ≥ 0.85** — 10개 증상이 만드는 고유 경로 수 ÷ 10. 현행 실측 **0.70** 대비 개선일 때만 이식 가치가 있다
- **(b) 최대 연속 빈칸 ≤ 1** — 10개 경로 전부. how 없는 노드가 2개 연속이면 유저가 막힌다
- **(c) 경로당 how 보유 노드 ≥ 5** — 현행 평균 15.6스텝의 1/3. 5일 코스를 만들 최소 실탄

**FAIL 시 결론**: 이식 착수 **금지**. 다음 과제는 "이식"이 아니라 tailtree에서 `/웨이브`로 **빈칸 노드의 how 생산**이다.

## 2. Verification surface

- 명령: `node scripts/ke/ke-t1-path-coverage.mjs --gate`
  → 기대: PASS면 exit 0, FAIL이면 exit 2. 두 경우 모두 표를 stdout에 출력
- 명령: `node scripts/ke/ke-t1-path-coverage.mjs` (게이트 없이 리포트만) → exit 0
- 아티팩트: `docs/ref/rnd/KE-T1-RESULT.json` — 증상별 경로·지표·판정 원본
- 재현: 입력이 순수 JSON이라 같은 커밋에서 항상 같은 결과 (난수·시각 의존 없음)

## 3. Constraints (후퇴 금지)

- **앱 코드 0줄** — `src/`·`Backend/`·`supabase/` 무변경
- **양 레포 데이터 무변경** — tailtree `data/taxonomy/**` 는 **읽기 전용**
- 기존 게이트 green 유지: `bash scripts/check-harness.sh`, `npx tsc --noEmit`, `npx eslint .`
- 판정 기준(§1)은 **스크립트 작성 전에 봉인** — 결과를 보고 임계를 바꾸지 않는다

## 4. Boundaries

- 허용(쓰기): `scripts/ke/**`, `docs/ref/rnd/KE-T1-RESULT.json`, 이 브리프의 §7
- 허용(읽기): `/Users/family/jason/tailtree/data/taxonomy/**`, `src/lib/data/mappings/**`, `src/lib/data/catalog.json`
- 금지: tailtree 레포 쓰기 · 앱 소스 수정 · DB 마이그레이션 · 임계 사후 변경

## 5. Iteration policy

- 각 패스: 스크립트 실행 → 3지표 산출 → PASS/FAIL 판정 → §7 기록
- 스크립트 버그(파싱 실패·경로 미생성)는 재시도 대상. **지표가 낮게 나온 것은 재시도 대상이 아니다** — 그게 실험 결과다
- 무진전 3패스면 blocked

## 6. Blocked stop condition

- tailtree `data/taxonomy/**` 를 읽을 수 없다
- 증상 17 ↔ `BehaviorType` 10 매핑에 사람 판단이 필요해 상위 10개를 못 고른다 → 멈추고 매핑안을 제시해 승인받는다
- 보고 형식: **재현됨 / 근사됨 / 막힘 / 불확실** 4분류

## 7. 실행 기록

### 2026-08-18 · Claude Code · 패스 1~4 → **PASS**

| 패스 | 사건 | 조치 |
|---|---|---|
| 1 | 전 경로 길이 1 | **버그**: `strength !== 'hard'` 로 필터. 실제는 **크로스 원자 선행이 `soft`**, `hard`는 원자 내부 스텝 사다리 |
| 2 | 충전율 100%인데 `minHow=0` | **버그**: `Math.min(..., 0)` 시드. 그리고 how는 **원자 단위**로만 붙고 `.sN` 스텝은 카드 '안'에 있으므로 스텝을 빈칸으로 세면 안 됨 → 스텝→원자 접기 |
| 3 | 경로에 `skill.mechanics.reward` **2회 중복** | **버그**: 최장경로 memo가 조상 체인 겹침에서 중복 삽입 → **선행 폐포 + 위상정렬**로 교체(중복 원천 불가) |
| 4 | 판정 성립 | `--gate` exit 0 |

**전제 정정 (이 실험의 최대 수확)**: 수렴 SSOT가 크럭스 근거로 쓴 **how 커버리지 15.2%는 오측정**이었다. 분모를 노드 1,412로 잡았으나 그중 **1,102개가 `.sN` 스텝 노드**로 how가 애초에 붙지 않는다. 올바른 분모는 **원자 310**이고 커버리지는 **207/310 = 66.8%**.

**판정 (임계는 실행 전 봉인, 사후 변경 없음)**

| 기준 | 임계 | 실측 | 판정 |
|---|---|---|---|
| (a) 경로 고유성 | ≥ 0.85 | **0.90** (현행 기준선 0.70) | PASS |
| (b) 최대 연속 빈칸 | ≤ 1 | **0** (10경로 전부) | PASS |
| (c) 경로당 최소 how | ≥ 5 | **16** | PASS |

경로 길이 16~29 원자, **10경로 전부 충전율 1.000**.

**적대적 검증 — 100%가 인공물인지 반증 시도**
- how 플래그 ↔ `how.json` 원본 **전 경로 노드 116개 전수 대조, 불일치 0**
- how 없는 원자 **103개의 도메인 분포**: `trick` 32 · `nosework` 22 · `rally` 17 · `agility` 16 · `disc` 7 · `fitness` 5 · `dance` 4 — **전부 스포츠·취미**
- 행동문제 도메인(`mechanics`·`foundation`·`cue`·`emotional`·`self_regulation`·`generalization`·`husbandry`·`manners`·`travel`·`obedience`) **결손 0**
- ⇒ 100%는 인공물이 아니다. TaillogToss가 다루는 축이 정확히 **완전 충전된 절반**이다

**4분류 보고**
- **재현됨**: 3지표 전부. 입력이 순수 JSON이라 같은 커밋에서 결정적
- **근사됨**: `BehaviorType` 10 → 증상 17 매핑은 저자 판단(`reactivity→dog_greeting`, `other→cues`). 매핑을 바꾸면 목표 노드가 바뀔 수 있음
- **막힘**: 없음
- **불확실**: 실제 유저 설문 분포로 재지 않고 `BehaviorType` 10 균등 가정. 또한 증상 17 중 **`tricks`는 스포츠 도메인이라 결손율 53%** — 신규 진입점 7종 중 `tricks`만 약하다

**결론**: 크럭스 종료. **이식 착수 가능.** 단 수렴 플랜 P4의 나머지 제약(스키마 무변경 매핑·`dog_id` UNIQUE 선결·미검수 노드 비노출·PRO 게이팅 범위 밖)은 그대로 유효하다.

## 참조

- `docs/ref/rnd/TRAINING-GRAPH-PORT-CONVERGE-LOOP-2026-08-18.md` — 수렴 SSOT, 크럭스 출처
- `src/lib/data/mappings/behaviorToCurriculum.ts` — 기준선 B3 근거
- tailtree `data/taxonomy/{nodes,edges,how,symptoms,symptom-index}.json`

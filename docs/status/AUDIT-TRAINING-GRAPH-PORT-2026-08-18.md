# 감사 — tailtree 훈련 그래프 이식 (설계 워크스루, 2026-08-18)

`/감사` 8 페르소나 도그푸딩. **코드 전 단계**라 설계 워크스루 모드.
대상: `docs/ref/rnd/TRAINING-GRAPH-PORT-CONVERGE-LOOP-2026-08-18.md` 의 수렴 플랜 P4 + UIUX 특정 결과.

**판정**: 현 명세대로는 착수 부적절. P0 3건 중 1건이 **수렴 플랜 자체의 명세 오류**.

발견은 등록만 한다 — 수정은 별도 마디(`/다음`). 스코프 크리프 방지.

## P0

- [ ] **A1 [안전] 마킹 = UTI 감별 문구 누락**
  tailtree `manifest.json` `review_flags` 에 *"실내 마킹 급증은 UTI·호르몬·불안 가능 — 수의 감별 문구 필수"* 가 `priority: "high"` **미해소** 상태다. `marking` 은 이식으로 새로 여는 진입점 7개 중 하나다. 감별 문구 없이 마킹 훈련을 주면 **비뇨기 질환을 훈련으로 다루게 된다**.
  · 근거: tailtree `data/taxonomy/manifest.json` → `review_flags[2]`, `symptoms.json` `marking`
  · 조치: 감별 문구가 콘텐츠에 들어가기 전에는 `marking` 진입점을 열지 않는다
  · Confidence: **Confirmed**

- [ ] **A2 [명세 오류] 안전 게이트가 존재하지 않는 필드를 가리킨다**
  수렴 플랜 P4 #6 이 *"`provenance.review` 통과 노드만 노출"* 로 잠갔으나 그 필드는 **0/1412** 존재하지 않는다. 노드 필드는 `age·assessmentPrompt·cgc·col·dom·evidence·id·label·mastery·secondary·type` 뿐이다.
  · 실제 검수 플래그는 **`how[].authored`** (214/214 = `'reviewed'`). 즉 게이트 단위가 **노드가 아니라 how 카드**다 — P4 #6 문장 자체가 바뀐다.
  · 근거: `nodes.json` 필드 실측, `how.json` `authored` 분포
  · Confidence: **Confirmed**

- [ ] **A3 [기능 파괴] AI 코칭 "관련 훈련 바로 시작하기" 버튼 사망**
  LLM 프롬프트가 *"Put the most relevant curriculum ID first **because the app uses the first valid ID for the 관련 훈련 바로 시작하기 button**"* 로 지시한다. `curriculum_id` 를 노드 id 로 갈아도 LLM 은 구 7종을 계속 뱉으므로 **존재하지 않는 커리큘럼으로 이동**한다.
  · 근거: `Backend/app/features/coaching/prompts.py:53`
  · 동반 수정: `training_references.py`(7 엔트리), `rule_engine.py:21`(id→한글 맵), `synthetic.py`, `deps.py`
  · Confidence: **Confirmed**

## P1

- [ ] **A4 [회귀] 오프라인 동작이 깨진다**
  현행 커리큘럼은 `src/lib/data/published/…/curriculum.ts` **번들 정적 데이터**라 네트워크 없이도 아카데미가 뜬다. 수렴 P4 #2 는 "그래프는 서버(재심사 회피)"로 잠갔으므로 **지하철에서 빈 화면**이 된다. `queryPersistence` 에 persist 설정 **0건**.
  · 조치: how 카드 클라이언트 캐시를 P4 #2 에 명문화 (경로 계산만 서버)
  · Confidence: **Confirmed**

- [ ] **A5 [기능 구멍] 막힘 처방을 눌렀는데 빈 화면**
  `stuck` 처방 247건의 점프 대상 **82종 중 17종에 how 가 없다**. 그중 6개는 `.s5`/`.s6` **스텝 노드**라 원리상 how 가 붙지 않는다.
  · 조치: 점프 대상이 how 없는 노드면 CTA 를 숨기거나 상위 원자로 접어 보낸다
  · Confidence: **Confirmed**

- [ ] **A6 [수익] 무료 급증으로 PRO 가치 하락**
  `trainingAccess.ts` 는 `difficulty === 'beginner'` 이면 무료로 준다. 노드엔 `difficulty` 가 없어 `type` 으로 대체하면 `foundation` 14 + `mechanics` 42 = **56장이 무료**가 된다.
  · 근거: `src/lib/data/trainingAccess.ts:9-13`, how 보유 원자 타입 분포
  · Confidence: **Likely** (대체 축 미정)

- [ ] **A7 [UX] 5일 → 16~29단계, 완주 심리와 `DayTabBar` 붕괴**
  `DayTabBar` 는 Day 1~N 가로 탭이다. 29탭이면 가로 스크롤 지옥. "완주까지 N" 숫자가 격려가 아니라 부채로 읽힌다.
  · 조치: 단계 그룹핑(접기) 없이는 이식 불가
  · Confidence: **Confirmed**

## P2

- [ ] **A8 [기회] 훈련사 신뢰 근거를 표시할 자리가 없다**
  노드에 `cgc`(CGC 10항목 앵커)·`secondary`(Pryor·FearFree·Dunbar)·`mastery`·`evidence[]` 가 있는데 UI 에 표기 위치가 없다. **손해가 아니라 놓치는 기회** — B2B 리포트 신뢰도에 직결.
  · Confidence: Confirmed

- [ ] **A9 [심사] 신규 UI 3개의 TDS 준수**
  막힘 처방 시트·선행 계보 패널·증상 칩 진입이 TDS 밖으로 나가면 반려. 탭 바는 **이미 `[⚠️]` 자체 구현** 상태이므로 **이번 변경에서 네비게이션은 건드리지 않는다**.
  · 근거: `docs/ref/AIT-PUBLISHING-READINESS.md:105-112`
  · Confidence: Confirmed

## 반증 — 안전하다고 확인한 것 (거짓양성 억제)

| 의심 | 판정 | 근거 |
|---|---|---|
| 파인튜닝·합성 데이터 폐기 | **Refuted** | 누적 6행 (`coaching-review-queue` 4 + `feedback` 2) |
| B2B 리포트 파손 | **Refuted** | `/parent/reports`·`/ops/today` 에 curriculum 참조 0건 |
| 대시보드 파손 | **Refuted** | `TrainingEffectCard` 는 `curriculumTitle`(제목)만 사용, id 미사용 |
| stuck 유령 노드 | **Refuted** | 점프 대상 82종 전부 실존 |
| 번들 100MB 압박 | **Refuted** | 2.06MB (KE-T1) |
| 미검수 how 콘텐츠 혼입 | **Refuted** | how 214장 전부 `authored='reviewed'` |

## 잘되는 점 — 회귀 금지

- `MissionChecklist` ↔ how 5스텝 **정확히 일치** (재작성 불필요)
- 행동문제 도메인 how 결손 **0** (KE-T1)
- 현행 A/B/C 개인화(*"청각이 예민한 강아지는 자극 강도 최소로"*)는 **tailtree 에 없는 강점**
- 오프라인 동작 (번들 정적) — A4 가 지키려는 대상

## 참조

- `docs/ref/rnd/TRAINING-GRAPH-PORT-CONVERGE-LOOP-2026-08-18.md` — 수렴 SSOT (A2 가 §4 P4 #6 을 정정)
- `docs/goals/GOAL-ke-t1-path-coverage.md` — KE-T1 결과

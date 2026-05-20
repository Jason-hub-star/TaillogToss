# TaillogToss Agent Orchestration

이 문서는 TaillogToss에서 에이전트가 긴 작업을 더 안정적으로 수행하도록 만드는 운영 레이어다.

## Goals

- 요청을 빠르게 `plan`, `implement`, `review`, `doc-sync`, `ops`, `qa`로 분류한다.
- page skill 1개 + feature skill 최대 2개 규칙을 작업 초기에 고정한다.
- cross-cutting 변경은 영향 범위와 검증 매트릭스를 먼저 남긴다.
- 완료 전 evidence와 handoff를 남겨 다음 세션 재진입 비용을 줄인다.

## Canonical Flow

1. `/intake`로 요청 성격, parity ID, 필요한 skill, 현재 phase를 정한다.
2. `/impact-map`으로 핵심 경로, companion docs, verify matrix를 적는다.
3. 필요한 경우 `/profile-recommend`로 작업 프로필을 선택한다.
4. 구현 또는 조사 작업을 수행한다.
5. `/evidence-review`로 실제 검증 결과와 남은 리스크를 정리한다.
6. 세션이 길어지거나 미완료면 `/handoff`로 다음 시작점을 남긴다.
7. 코드 변경이 있었다면 `/doc-update`와 Completion Format으로 상태 문서를 맞춘다.

## Required Artifacts

- `docs/ref/PROJECT-PLAN.md`
  - `Task Intake`
  - `Impact Map`
  - `Verify Matrix`
  - `Sub-Agent Notes`
- `docs/status/PROJECT-STATUS.md`
  - latest one-line state
  - evidence summary
- `docs/status/DECISION-LOG.md`
  - architecture or workflow decisions with date and consequence

## Stack Profiles

작업 시작 전에 아래 중 하나를 고른다.

- `frontend-page`
  - route/page UI, layout, hooks, page skill 중심
- `backend-api`
  - FastAPI, schema, tests, response contracts
- `edge-runtime`
  - Supabase Edge, auth, mTLS, IAP/message flows
- `runtime-qa`
  - AIT, device, Metro, host/runtime divergence
- `docs-automation`
  - status sync, commands, nightly automation, audit docs

## Decision Rules

- parity ID 없이 구현을 시작하지 않는다.
- `impact-map` 없이 여러 레이어를 동시에 건드리는 변경을 밀지 않는다.
- evidence 없이 Done 판정하지 않는다.
- AIT/device/runtime 이슈는 코드 추측보다 실증 로그를 우선한다.
- 문서 갱신은 가능한 가장 가까운 정본만 바꾸고, 나머지는 링크/포인터로 처리한다.

## Verify Checklist

- 선택한 parity ID가 `docs/status/11-FEATURE-PARITY-MATRIX.md`와 모순되지 않는다.
- 선택한 skill이 `AGENTS.md`의 page/feature 규칙을 지킨다.
- verify command가 실제 변경 종류와 맞다.
- daily log와 `PAGE-UPGRADE-BOARD.md` 상태가 어긋나지 않는다.

## When To Skip

아래는 축약 가능하다.

- 단순 사실 확인
- 1파일 내 오탈자/문구 수정
- 코드 변경 없는 문서 질문

이 경우에도 최소한 changed scope와 verify result는 남긴다.

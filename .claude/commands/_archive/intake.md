# /intake — 작업 분류 시작점

새 요청을 받으면 구현 전에 아래를 먼저 채운다.

## 목적

- 요청을 `plan`, `implement`, `review`, `doc-sync`, `ops`, `qa` 중 하나로 분류
- parity ID와 skill 범위를 조기 고정
- 불필요한 탐색과 과도한 context loading 방지

## 실행 절차

1. `AGENTS.md`, `CLAUDE.md`, `docs/status/PROJECT-STATUS.md`를 확인한다.
2. 관련 parity ID를 `docs/status/11-FEATURE-PARITY-MATRIX.md`에서 고른다.
3. route 작업이면 page skill 1개를 고르고 feature skill은 최대 2개로 제한한다.
4. `docs/ref/PROJECT-PLAN.md`의 `Task Intake` 섹션을 채운다.

## 기록 포맷

```md
## Task Intake
- verdict:
- parity IDs:
- chosen page skill:
- chosen feature skills:
- stack profile:
- current phase:
- user intent summary:
```

## 규칙

- parity ID 없는 구현 시작 금지
- page skill과 feature skill은 필요한 최소만 로드
- cross-cutting 의심 시 바로 `/impact-map`으로 넘어간다

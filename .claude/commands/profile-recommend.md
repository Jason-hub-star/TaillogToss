# /profile-recommend — 작업 프로필 선택

작업이 어느 레이어 중심인지 헷갈릴 때 이 커맨드로 시작 프로필을 고른다.

## 목적

- 먼저 읽을 문서와 기본 검증 세트를 고정
- 같은 유형의 작업에서 탐색 비용 감소

## 프로필

- `frontend-page`
- `backend-api`
- `edge-runtime`
- `runtime-qa`
- `docs-automation`

## 실행 절차

1. 요청의 중심 변경 경로를 확인한다.
2. `docs/ref/STACK-PROFILES.md`에서 가장 가까운 프로필을 선택한다.
3. 해당 프로필의 `Read first`와 `Default verify`를 `PROJECT-PLAN.md`에 반영한다.

## 규칙

- 여러 프로필에 걸쳐도 주 프로필은 1개만 선택
- 보조 레이어는 `/impact-map`의 companion docs로 처리

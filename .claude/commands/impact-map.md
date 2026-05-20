# /impact-map — 영향 범위와 검증 경로 정리

여러 레이어를 건드리거나 문서 동기화가 필요한 작업 전 사용한다.

## 목적

- 코드 경로와 동기화 문서를 미리 정리
- verify matrix를 먼저 선언
- 문서 누락과 과잉 수정 둘 다 줄이기

## 실행 절차

1. 변경될 가능성이 있는 코드 경로를 적는다.
2. 꼭 같이 봐야 하는 companion docs를 적는다.
3. 검증 명령과 수동 검증 포인트를 정한다.
4. `docs/ref/PROJECT-PLAN.md`의 `Impact Map`과 `Verify Matrix`를 채운다.

## 기록 포맷

```md
## Impact Map
- change type:
- core paths:
- companion docs:
- verify matrix:
- rollout notes:
- residual risk:
```

## 힌트

- route/page: `PAGE-UPGRADE-BOARD.md`, `SKILL-DOC-MATRIX.md`
- backend/schema: `BACKEND-PLAN.md`, `SUPABASE-SCHEMA-INDEX.md`
- edge/runtime: publishing/readiness, IAP/message refs
- docs/automation: `AUTOMATION-HEALTH.md`, relevant prompt docs

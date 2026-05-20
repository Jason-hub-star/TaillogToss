# /handoff — 다음 세션 재진입 캡슐

작업이 끝나지 않았거나, 런타임 QA/외부 확인 대기가 남았을 때 사용한다.

## 목적

- 다음 세션이 바로 읽어야 할 파일과 첫 검증을 남긴다
- blocker와 미결정을 분리한다

## 실행 절차

1. `docs/ref/PROJECT-PLAN.md`의 `Handoff Capsule`을 채운다.
2. 필요하면 `docs/status/PROJECT-STATUS.md` 한 줄 상태에도 blocker를 반영한다.

## 기록 포맷

```md
## Handoff Capsule
- next entrypoint:
- read first:
- blocker:
- unfinished decisions:
- first verify:
```

## 규칙

- "나중에 보기" 같은 표현 금지
- 다음 사람이 바로 실행할 첫 명령 또는 첫 파일을 적는다

# /evidence-review — 완료 근거 점검

구현 또는 조사 작업 후, 완료 선언 전에 실제 근거를 정리한다.

## 목적

- "된 것 같음"이 아니라 실행한 검증 중심으로 종료
- 남은 리스크를 명시해 다음 세션 재탐색 비용 절감

## 실행 절차

1. 실행한 검증 명령을 나열한다.
2. 문서 갱신 파일을 적는다.
3. 가정과 미검증 영역을 적는다.
4. release verdict를 `safe`, `needs-qa`, `blocked` 중 하나로 판정한다.

## 기록 포맷

```md
## Evidence Review
- executed verify:
- changed docs:
- assumptions:
- residual risks:
- release verdict:
```

## 규칙

- 실행하지 않은 검증은 쓰지 않는다
- device/runtime 미검증이면 `needs-qa` 또는 `blocked`로 남긴다
- 문서 변경이 있었다면 `/doc-update` 기준과 모순 없는지 본다

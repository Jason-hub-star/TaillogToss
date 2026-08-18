---
name: 다음
description: 추천 말고 바로 다음 백로그 항목을 실행하는 커맨드. PAGE-UPGRADE-BOARD·PROJECT-STATUS를 소스로 최소구현→검증→기록까지 한 마디(1항목) 사이클. 항목 1개 끝나면 정지한다.
user_invocable: true
tags: [meta, execute, write]
trigger: "추천 말고 다음 작업을 실제로 실행할 때. '다음 거 해', '이어서 진행'"
version: 1
---

# /다음 — 백로그 다음 항목 실행 (1마디)

`/상태`는 추천만 하고 멈춘다. 이 스킬은 **실행한다.** 대신 **한 항목만** 하고 정지한다.

## Steps

1. **대상 선택** — 인자로 지정했으면 그것. 아니면 이 순서로 첫 미완료 1개:
   `docs/status/PAGE-UPGRADE-BOARD.md`(라우트 보드) → `docs/status/PROJECT-STATUS.md`(다음 걸음) → `CLAUDE.md` Current Priority.
   보드와 우선순위가 어긋나면 **보드가 이긴다**(라우트 단위가 실행 단위다).
2. **스킬 로드** — `/명령어` 라우팅 표대로 `page-*` 1개 + `feature-*` 최대 2개. 그 이상 열지 않는다.
3. **최소 구현** — YAGNI → 재사용 → 표준 → 최소 코드. 하드코딩 hex/fontSize 금지(`src/styles/tokens.ts`).
4. **검증(성역)** — 아래 실행할 것. 증거 없이 체크박스 `[x]` 금지.
5. **기록** — `docs/daily/MM-DD/page-<route-slug>.md` 체크박스 + `PAGE-UPGRADE-BOARD.md` 상태(`Ready|InProgress|QA|Done|Hold`) 동기화.
6. **정지 보고(BLUF)** — 완료+증거 / 막힘+원인 / 다음 후보+이유.

## 실행할 것 (검증)

```bash
npm run typecheck          # tsc --noEmit
npm run ux-copy:check
npm run test:app
bash scripts/check-harness.sh
```
FE UI를 건드렸으면 **adb 실기기 스크린샷 + 버튼 인터랙션까지** 확인한다 — 타입 통과는 렌더 증거가 아니다.
BE를 건드렸으면 배포 + 프로덕션 헬스체크까지가 1세트다.

## 승인 규약

- `/다음` 호출 = **그 항목 1개**에 대한 실행 승인이다.
- 단 ①진행 중 설계·스코프 변경이 필요해지면 **멈추고 상의** ②항목 1개 끝나면 **정지**(자율 체인 금지) ③커밋·배포·승격은 별도 승인.

## Verify

- 대상 `[ ]`가 `[x]`로 바뀌었다면 그 옆에 **증거**(file:line 또는 게이트 PASS 로그)가 있는가
- 보드 상태와 daily 체크박스가 **둘 다** 갱신됐는가 (한쪽만 고치면 다음 세션이 어긋난다)
- `git status --short`에 의도하지 않은 파일이 없는가

## 하지 말 것

- 항목 2개 이상 이어서 하기 — 정지가 이 스킬의 계약이다
- 검증을 토큰 아끼려 건너뛰기
- 보드에 없는 일을 "겸사겸사" 끼워넣기

## 다음

- 끝났고 세션도 닫는다 → `/마감`.
- 막혔다 → `/진단 <증상>`.
- 항목이 phase 3개 이상으로 커졌다 → `/다음`이 아니라 `페이즈루프`.

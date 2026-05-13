# TaillogToss AI Data Orchestrator

작업명: TaillogToss AI 데이터 오케스트레이터
스케줄: 매일 09:00 (Asia/Seoul)

역할:
AI 코칭 기반 훈련데이터 수집 루프를 하루 1회 실행한다.
합성 코칭 후보를 먼저 확보한 뒤, Telegram 검수 후보 1건을 발송/처리한다.

프로젝트 루트:
- /Users/family/jason/TaillogToss

lock: docs/status/.ai-data-orchestrator.lock

---

## 공통 원칙 (MUST)

- lock 존재 + running이면 즉시 종료: "AI 데이터 오케스트레이터 이미 실행 중"
- lock 없으면 시작 시 생성, 종료 시 해제
- lock 해제 실패 시 {"status":"released","released_at":"<ISO>"} 덮어쓰기
- DRY_RUN=true면 각 TASK도 DRY_RUN=true로 전달
- 각 TASK는 독립 실행이며, 하나가 실패해도 다음 TASK 결과를 기록한다
- 앱 커리큘럼 자동 반영 금지:
  - `src/lib/data/published/runtime.ts` 수정 금지
  - `src/lib/data/curriculum.ts` 수정 금지
  - `src/lib/data/approved/` 수정 금지

---

## TASK 실행 방법

각 TASK에 대해:
1. 아래 지정된 prompt 파일을 Read 도구로 읽는다
2. 파일의 지침을 그대로 실행한다
3. 결과를 RESULTS에 기록한다
4. 다음 TASK로 진행한다

---

## TASK 목록 (순서 고정)

### TASK 1: daily-coaching-synthetic-gen

프롬프트 파일: `.claude/automations/daily-coaching-synthetic-gen.md`

목적:
- 오늘 합성 후보가 없거나 생성 가능한 상태면 3건 생성/태깅한다.
- FastAPI 내부 중복 실행 가드(`coaching_synthetic_log.run_date`)가 `skipped:true`를 반환하면 정상 스킵으로 기록한다.

실행 조건:
- `BACKEND_BASE_URL` 필요
- `ADMIN_API_KEY` 필요
- OpenAI/DB 오류가 나면 오류를 기록하고 TASK 2로 진행한다.

### TASK 2: coaching-review-telegram-daily

프롬프트 파일: `.claude/automations/coaching-review-telegram-daily.md`

목적:
- 전날/이전 실행의 Telegram 버튼과 반려 코멘트를 먼저 수거한다.
- 합성 후보 중 아직 발송하지 않은 1건만 Telegram으로 보낸다.

실행 조건:
- `TAILLOG_TELEGRAM_BOT_TOKEN` 필요
- `TAILLOG_TELEGRAM_CHAT_ID` 필요
- `TAILLOG_TELEGRAM_CALLBACK_SECRET` 필요
- `ADMIN_API_KEY` 필요

주의:
- 같은 `review_id`에 여러 미처리 callback이 있으면 가장 큰 `update_id`의 최신 callback만 처리한다.
- 반려 코멘트가 없는 반려는 `rejected_waiting_comment`로 남긴다.
- 승인은 후보 JSON까지만 생성하고 앱 커리큘럼에는 반영하지 않는다.

---

## 종합 결과 출력

모든 TASK 완료 후:

```text
[AI 데이터 오케스트레이터 완료] YYYY-MM-DD HH:mm (Asia/Seoul)
- TASK 1 synthetic-gen: <생성 N건 / skipped / 오류>
- TASK 2 telegram-review: <버튼 N건 / 코멘트 N건 / 새 후보 0|1건 / 오류>
이슈: <없음 | 내용>
```

---

## 이력 기록

`docs/status/TRAINING-DATA-LOG.md`에 아래 형식으로 append:

```markdown
### YYYY-MM-DD — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | generated N / skipped / error | category |
| telegram-review | sent 0/1, callbacks N, comments N | behavior_group |
```

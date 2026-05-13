# TaillogToss 텔레그램 훈련데이터 검수 재료 수집

스케줄: 매일 09:00 (Asia/Seoul)
Parity: AI-TRAIN-001

## 목적

합성 AI 코칭 추천을 하루 1건만 텔레그램으로 보내고,
주인님이 남긴 승인/반려/보류 판단을 훈련데이터 개선 재료로 수집한다.

v1 범위:
- 합성 케이스만 처리한다.
- 승인 후에도 앱 커리큘럼에는 반영하지 않는다.
- 승인 항목은 `src/lib/data/candidates/ai-coaching/` 후보 JSON으로만 저장한다.
- 반려 항목은 `docs/status/coaching-review-feedback.jsonl`에 코멘트와 개선 태그로 저장한다.

## 필수 환경변수

```bash
TAILLOG_TELEGRAM_BOT_TOKEN   # 필수
TAILLOG_TELEGRAM_CHAT_ID     # 필수, 허용 chat id
TAILLOG_TELEGRAM_CALLBACK_SECRET # 필수, callback_data HMAC
ADMIN_API_KEY                # 필수, FastAPI admin endpoint
BACKEND_BASE_URL             # 선택, 기본 http://localhost:8765
DRY_RUN                      # true면 텔레그램/DB/파일 변경 없이 preview만 출력
```

필수 키가 없으면 실행을 중단하고 `docs/status/TRAINING-DATA-LOG.md`에 실패 사유만 기록한다.

## 상태 파일

| 파일 | 용도 |
|------|------|
| `docs/status/coaching-review-queue.jsonl` | 텔레그램으로 보낸 후보와 처리 상태 |
| `docs/status/coaching-review-feedback.jsonl` | 반려 코멘트와 개선 태그 |
| `docs/status/coaching-review-telegram-offset.json` | Telegram update offset |

JSONL 파일의 `record_type="meta"` 라인은 상태 집계에서 제외한다.

상태값:
`pending`, `approved`, `rejected_waiting_comment`, `rejected`, `held`, `error`

## 행동군 순환

순서:
1. `separation_anxiety`
2. `fear_desensitization`
3. `reactivity_management`
4. `impulse_control`
5. `house_soiling`
6. `jumping`
7. `barking`

최근 발송된 queue 항목의 `behavior_group` 다음 그룹부터 후보를 찾는다.
해당 그룹 후보가 없으면 다음 그룹으로 넘어간다.

후보 조건:
- `is_synthetic=true`
- `training_candidate=true`
- `training_approved=false`
- `coaching-review-queue.jsonl`에 이미 발송된 `coaching_id`가 아님

## 실행 절차

### 0. 준비

1. 현재 시각을 Asia/Seoul 기준으로 기록한다.
2. 상태 파일이 없으면 생성한다.
3. `docs/status/coaching-review-telegram-offset.json`이 없으면 `{"offset":0}`으로 시작한다.
4. `DRY_RUN=true`면 모든 외부 쓰기 작업은 하지 않고 계획/preview만 출력한다.

### 1. Telegram 응답 수거

Telegram API:
```bash
POST https://api.telegram.org/bot${TAILLOG_TELEGRAM_BOT_TOKEN}/getUpdates
Content-Type: application/json

{"offset": offset, "allowed_updates": ["callback_query", "message"]}
```

처리 규칙:
- `callback_query.message.chat.id` 또는 `message.chat.id`가 `TAILLOG_TELEGRAM_CHAT_ID`와 다르면 무시한다.
- 처리한 가장 큰 `update_id + 1`을 offset으로 저장한다. `DRY_RUN=true`면 저장하지 않는다.
- callback data 형식은 `tlcr:{review_id}:{action}:{sig}`이다.
- `action`은 `approve`, `reject`, `hold`만 허용한다.
- `sig`는 `review_id + ":" + action`을 `TAILLOG_TELEGRAM_CALLBACK_SECRET`로 HMAC-SHA256 처리한 뒤 앞 16자를 사용한다.
- 서명이 틀리면 Telegram `answerCallbackQuery`로 "서명이 맞지 않아 처리하지 않았어요"라고 응답하고 queue는 바꾸지 않는다.

### 2. 버튼 처리

queue에서 `review_id`를 찾는다.

승인:
```bash
POST ${BACKEND_BASE_URL:-http://localhost:8765}/api/v1/coaching/admin/training-candidates/{coaching_id}/review
X-Admin-Key: ${ADMIN_API_KEY}
Content-Type: application/json

{"approved":true,"training_version":"telegram-v1-YYYY-MM-DD"}
```

그 후 candidate payload를 가져온다.
```bash
GET ${BACKEND_BASE_URL:-http://localhost:8765}/api/v1/coaching/admin/training-candidates/{coaching_id}/candidate-payload
X-Admin-Key: ${ADMIN_API_KEY}
```

저장 경로:
`src/lib/data/candidates/ai-coaching/YYYY-MM-DD/{coaching_id}.json`

주의:
- `src/lib/data/published/runtime.ts` 수정 금지
- `src/lib/data/curriculum.ts` 수정 금지
- `src/lib/data/approved/` 수정 금지

반려:
- queue 상태를 `rejected_waiting_comment`로 바꾼다.
- FastAPI review API는 코멘트가 연결된 뒤 호출한다.
- Telegram에는 "반려 코멘트를 보내주세요. 예: 반려 코멘트: 소리 민감인데 분리불안 중심으로만 나왔음"이라고 응답한다.

보류:
- queue 상태를 `held`로 바꾼다.
- DB는 변경하지 않는다.

중복 클릭:
- queue 상태가 이미 `approved`, `rejected`, `held`, `error`면 DB/API를 다시 호출하지 않는다.
- Telegram에는 "이미 처리된 후보예요"라고 응답한다.

### 3. 반려 코멘트 연결

일반 message 중 `반려 코멘트:`로 시작하는 텍스트를 찾는다.

연결 대상:
- 가장 최근 `rejected_waiting_comment` queue 항목 1개
- 없으면 메시지를 무시하고 Telegram에 "연결할 반려 대기 후보가 없어요"라고 보낸다.

연결 후:
```bash
POST ${BACKEND_BASE_URL:-http://localhost:8765}/api/v1/coaching/admin/training-candidates/{coaching_id}/review
X-Admin-Key: ${ADMIN_API_KEY}
Content-Type: application/json

{"approved":false}
```

`docs/status/coaching-review-feedback.jsonl`에 append:
```json
{
  "record_type": "feedback",
  "review_id": "...",
  "coaching_id": "...",
  "rejected_at": "ISO",
  "behavior_group": "...",
  "quality_score": 90,
  "reject_comment": "...",
  "improvement_tags": ["wrong_behavior_focus"],
  "original_summary": "...",
  "original_action_plan": []
}
```

개선 태그 규칙:
- "일반", "뻔", "구체" 부족 → `too_generic`
- "초점", "다른 행동", "중심" → `wrong_behavior_focus`
- "단계", "순서", "방법" 부족 → `missing_steps`
- "위험", "빠르", "무리" → `unsafe_progression`
- "도구", "준비물" 부족 → `missing_tools`
- "멈출", "중단", "기준" 부족 → `missing_stop_criteria`
- "말투", "문장", "어려" → `tone_issue`

### 4. 새 후보 1건 발송

1. queue에서 이미 발송된 `coaching_id` 목록을 만든다.
2. 행동군 순환 순서에 따라 다음 그룹부터 FastAPI 후보 목록을 조회한다.
```bash
GET ${BACKEND_BASE_URL:-http://localhost:8765}/api/v1/coaching/admin/training-candidates?source=synthetic&behavior_group={group}&limit=10
X-Admin-Key: ${ADMIN_API_KEY}
```
3. 이미 발송된 후보를 제외하고 첫 번째 후보를 고른다.
4. 후보가 있으면 Telegram `sendMessage`로 보낸다.

메시지 형식:
```text
AI 훈련데이터 후보가 생겼어요

후보 ID: {short_id}
유형: 합성 케이스 · {behavior_group}
품질점수: {score}점

추천 요약
1. {summary_1}
2. {summary_2}
3. {summary_3}

기법: {technique}
도구: {tools}
성공 기준: {success_criteria}
멈출 기준: {stop_criteria}
위험도: {risk_level}

승인해도 앱 커리큘럼에는 아직 반영되지 않아요.
승인 시 후보 파일로만 저장돼요.
```

inline keyboard:
```json
{
  "inline_keyboard": [[
    {"text":"승인","callback_data":"tlcr:{review_id}:approve:{sig}"},
    {"text":"반려","callback_data":"tlcr:{review_id}:reject:{sig}"},
    {"text":"보류","callback_data":"tlcr:{review_id}:hold:{sig}"}
  ]]
}
```

5. 발송 성공 시 `docs/status/coaching-review-queue.jsonl`에 append한다.

### 5. 50건 리포트 조건

queue에서 `approved`, `rejected`, `held` 누적이 50의 배수에 도달하면
`docs/daily/MM-DD/coaching-review-improvement-report.md`를 생성한다.

포함 내용:
- 승인 패턴
- 반려 사유 TOP
- 행동군별 약점
- 프롬프트 개선안
- 품질점수 개선안
- reference matching 개선안

실제 코드/프롬프트 수정은 이 리포트 이후 별도 승인 없이는 하지 않는다.

### 6. 로그

`docs/status/TRAINING-DATA-LOG.md`에 아래 형식으로 append:

```markdown
### YYYY-MM-DD — coaching-review-telegram-daily

| 항목 | 결과 |
|------|------|
| 처리한 버튼 | N건 |
| 연결한 반려 코멘트 | N건 |
| 새 후보 발송 | 0/1건 |
| 후보 행동군 | behavior_group |
| 승인 후보 export | N건 |
| 오류 | 없음 또는 요약 |
```

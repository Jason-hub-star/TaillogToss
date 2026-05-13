# Coaching Review Telegram Runbook

Parity: AI-TRAIN-001

## Purpose

This runbook turns AI coaching recommendations into reviewed training-data improvement material.

The v1 loop is intentionally conservative:
- Send at most 1 synthetic candidate per day.
- Collect owner decisions through Telegram: approve, reject, hold.
- Store approved items as candidate JSON only.
- Store rejected items as improvement feedback only after a rejection comment is linked.
- Do not publish to app curriculum, `published/runtime.ts`, or fine-tuning automatically.

## Required Environment

Use a Taillog-only Telegram bot and a private admin chat.

```bash
export TAILLOG_TELEGRAM_BOT_TOKEN="..."
export TAILLOG_TELEGRAM_CHAT_ID="..."
export TAILLOG_TELEGRAM_CALLBACK_SECRET="long-random-secret"
export ADMIN_API_KEY="..."
export BACKEND_BASE_URL="http://localhost:8765"
```

`TAILLOG_TELEGRAM_CHAT_ID` must be the only chat id accepted by the automation.

## First Real Send Checklist

1. Start FastAPI.

```bash
cd Backend
venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload
```

2. Confirm admin candidate APIs are alive.

```bash
curl -sS \
  -H "X-Admin-Key: ${ADMIN_API_KEY}" \
  "${BACKEND_BASE_URL:-http://localhost:8765}/api/v1/coaching/admin/training-candidates?source=synthetic&limit=1"
```

Expected:
- `[]` means no synthetic candidate is ready yet.
- A list with `telegram_preview` means a candidate can be sent.
- `403` means `ADMIN_API_KEY` is missing or wrong.

3. Preview without external writes.

```bash
DRY_RUN=true
```

Ask the automation to run `.claude/automations/coaching-review-telegram-daily.md`.
In dry run, it should print or summarize the Telegram message preview and must not:
- call Telegram `sendMessage`
- update queue status
- update Telegram offset
- call the review API
- write candidate JSON

4. Send exactly 1 candidate.

```bash
DRY_RUN=false
```

Expected Telegram message shape:

```text
AI 훈련데이터 후보가 생겼어요

후보 ID: abcd1234...
유형: 합성 케이스 · separation_anxiety
품질점수: 90점

추천 요약
1. ...
2. ...
3. ...

기법: ...
도구: ...
성공 기준: ...
멈출 기준: ...
위험도: ...

승인해도 앱 커리큘럼에는 아직 반영되지 않아요.
승인 시 후보 파일로만 저장돼요.
```

Buttons:
- `승인`
- `반려`
- `보류`

5. Confirm queue state.

```bash
tail -n 5 docs/status/coaching-review-queue.jsonl
```

Expected state after send:
- `record_type="review"`
- `status="pending"`
- `coaching_id`
- `behavior_group`
- `telegram_message_id`

## Approval Scenario

1. Tap `승인`.
2. Run the daily automation again.
3. Confirm:
   - queue status becomes `approved`
   - FastAPI review API sets `training_approved=true`
   - candidate JSON is created under:

```text
src/lib/data/candidates/ai-coaching/YYYY-MM-DD/{coaching_id}.json
```

4. Confirm these paths are unchanged:

```bash
git diff -- src/lib/data/published/runtime.ts src/lib/data/curriculum.ts src/lib/data/approved/
```

Expected: no diff.

## Rejection Scenario

1. Tap `반려`.
2. Send a normal Telegram message:

```text
반려 코멘트: 소리 민감 케이스인데 분리불안 중심으로만 나왔음
```

3. Run the daily automation again.
4. Confirm:
   - queue state moves from `rejected_waiting_comment` to `rejected`
   - FastAPI review API sets `training_candidate=false`, `training_approved=false`
   - feedback is appended to:

```text
docs/status/coaching-review-feedback.jsonl
```

5. Confirm no candidate JSON was created for the rejected item.

## Hold Scenario

1. Tap `보류`.
2. Run the daily automation again.
3. Confirm:
   - queue status becomes `held`
   - DB is not changed
   - no candidate JSON is created

## Safety Checks

Run these after each real-send test:

```bash
git diff -- src/lib/data/published/runtime.ts src/lib/data/curriculum.ts src/lib/data/approved/
python -m json.tool docs/status/coaching-review-telegram-offset.json >/dev/null
awk 'NF { print }' docs/status/coaching-review-queue.jsonl >/dev/null
awk 'NF { print }' docs/status/coaching-review-feedback.jsonl >/dev/null
```

The automation must ignore:
- callbacks from any chat id other than `TAILLOG_TELEGRAM_CHAT_ID`
- callback data with invalid HMAC signature
- duplicate callbacks for already finalized queue records

If several unprocessed callbacks arrive for the same `review_id`, the automation must process only the callback with the largest Telegram `update_id`.

Example:
- `approve` arrives as `update_id=10`
- `reject` arrives as `update_id=11`
- process `reject`
- ignore `approve`
- advance the offset past both updates
- keep one final queue transition for that candidate

## Self-Review Notes

Good:
- v1 keeps AI recommendations out of live curriculum by default.
- Approval, rejection, and hold have separate persistence outcomes.
- Rejection comments become structured improvement material instead of disappearing into chat history.

Weak:
- Behavior-group matching is inferred from reference ids and text keywords, not a dedicated DB column.
- The automation is still documented as a Codex daily prompt; it is not yet a standalone executable script.
- Real Telegram delivery is unverified until bot token, chat id, and callback secret are provided.

Verification gap:
- Run one dry-run preview.
- Run one real Telegram send.
- Test approve, reject-with-comment, hold, invalid chat id, invalid signature, duplicate callback, and latest-callback-wins.

## Promotion Rule

After every 50 finalized decisions (`approved`, `rejected`, `held`), create an improvement report with:
- approved patterns
- top rejection reasons
- behavior-group weaknesses
- prompt improvements
- quality-score improvements
- reference matching improvements

Do not modify app curriculum, prompts, or fine-tuning jobs from this loop without a separate approval.

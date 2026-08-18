# 2026-05-22 Challenge Submission URL Runbook

## Scope

- Parity IDs: `REG-001`, `APP-001`
- Context: Apps in Toss Vibe Coding Challenge submission

## Status

- User-reported `출시하기` complete.
- User-reported actual Toss app search visibility by registered Korean mini-app name.
- User-provided public mini-app share URL: `https://minion.toss.im/L1o5uCsg`.
- Submission blocker is not code-side deployment. The remaining action is pasting the captured URL into the challenge form.

## URL Rule

Use the URL copied from the actual Toss app mini-app navigation bar share action:

- `https://minion.toss.im/L1o5uCsg`

Do not use:

- `intoss-private://...`
- AIT deploymentId/private test URLs
- B2B report share links generated from `/ops/today` report sharing, even though they can also use the `minion.toss.im` domain
- Internal deep links such as `intoss://taillog-app/...`

## Capture Steps

1. Open the actual Toss app.
2. Search the registered Korean mini-app name `테일로그`.
3. Enter the mini-app from the search result.
4. Tap the top navigation bar share action, or open the top-right more menu and tap share.
5. Choose copy from the OS share sheet.
6. Paste the copied public URL into the challenge form field `미니앱 공유하기 URL`.

## Form Copy

- 미니앱 한줄 소개: `반려견 훈련과 성장 기록을 귀엽게 이어주는 미니앱`
- 주제 연관성: `테일로그는 반려견의 훈련, 성향, 성장 변화를 귀여운 UX로 기록하고 돌아보게 해요. 사용자가 매일의 작은 행동을 사랑스럽게 남기며, ‘귀여운 게 최고야’라는 주제를 서비스 경험 전체로 전달합니다.`

## Sync

- `docs/status/PROJECT-STATUS.md`: updated with challenge submission URL rule.
- `docs/ref/AIT-PUBLISHING-READINESS.md`: updated publishing checklist and challenge URL capture runbook.
- `docs/status/RELEASE-GATE-AUDIT.md`: changed from release-blocked framing to released/submission-pending framing based on user-reported search visibility.
- `docs/status/PRELAUNCH-BLOCKER-SCAN.md`: console/publishing row updated to PASS/PARTIAL with public share URL capture as the remaining submission action.

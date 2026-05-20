# /onboarding/welcome QA Sync

- [x] AUTH-001: `토스로 시작하기` now sends `flow: B2C`, stores B2C entry mode, normalizes the current session role to `user`, and navigates existing users to `/dashboard`.
- [x] B2B-001: The B2B self-join link keeps `flow: B2B`; accidental B2C `/ops/today` entry redirects back to `/dashboard`.
- [x] UI-001: Local real-device QA confirmed B2C dashboard bottom navigation renders 3 tabs: `홈`, `훈련`, `설정`.

Validation:
- `npx jest src/lib/api/__tests__/auth.test.ts supabase/functions/__tests__/login-with-toss.test.ts src/lib/guards/__tests__/roleGuard.test.ts --runInBand`
- `npm run typecheck`
- `git diff --check`
- Local device: `intoss://taillog-app/onboarding/welcome` -> `토스로 시작하기` -> `/dashboard` with 3-tab B2C nav.
- Local device: B2C `intoss://taillog-app/ops/today` -> `/dashboard` guard redirect.

# 2026-05-20 AIT Coaching Limit Build

## Training Academy Hotfix

- [x] AIT device QA found `/training/academy` AI hero showing raw `separation_anxiety` in the copy.
- [x] Hotfix applied in `src/pages/training/academy.tsx`: `separation_anxiety` now renders as `분리불안`.
- [x] Added Stage 2 persisted keys to the same label map (`bathroom_miss`, `destructive`) and changed unknown behavior fallback from raw key to `기타`.
- [x] Validation: `npx tsc --noEmit` PASS, scoped `git diff --check -- src/pages/training/academy.tsx` PASS.
- [x] AIT rebuild/upload PASS: `deploymentId=019e432f-33e9-7013-a44f-2942848a16d1`, SHA256 `571f1e6230561840960c7e76483ed22e9321c97c4db5c1ab3e57020a251898a5`.
- [x] Bundle scan PASS: `separation_anxiety 행동` `0`, `ait-ad-test-*` `0`, Railway marker `0`, secret markers `0`, DigitalOcean backend marker present, HTTPS brand icon marker present.
- [ ] Metro-off device launch for the new deployment is BLOCKED at the AIT host layer: real Toss shows `지금은 서비스를 사용할 수 없어요`, private test host shows `앱 실행도중 문제가 발생했습니다`; no new `ReactNativeJS`/`AIT-BUILD` marker reached logcat.
- [x] DEV_LOCAL retry PASS after `src/lib/api/backend.ts` dev resolver hotfix: Metro `packager-status:running`, FastAPI `/health` `ok`, adb reverse `8081/8765`, Toss test host opened `/dashboard` and `/training/academy`; FastAPI received `GET /api/v1/training/...` from `127.0.0.1` with 200.

## DigitalOcean Backend Cutover

- [x] `Backend/.env` `OCEAN_API_KEY` verified against DigitalOcean account API (HTTP 200).
- [x] Backend hotfix committed/pushed: `4ceb3c2 fix: enforce free coaching and log counts`.
- [x] Supabase `behavior_logs` occurrence columns applied live with additive migration SQL.
- [x] DigitalOcean App Platform created with cheapest fixed service size: `apps-s-1vcpu-0.5gb`, `instance_count=1`, region `sgp`, estimated cost `$5/mo`.
- [x] DigitalOcean app ACTIVE: `app_id=ae33cc5a-0811-48d1-b8bb-ae78f4e768b7`, deployment `dfa26336-53f0-433d-befc-3f0ef71e9d79`.
- [x] New backend URL: `https://taillogtoss-backend-l35lj.ondigitalocean.app`.
- [x] Smoke: `/health` HTTP 200 `{"status":"ok"}`; `/api/v1/subscription/`, `/api/v1/coaching/usage/daily`, `/api/v1/logs/quick` return HTTP 401 when unauthenticated.
- [x] AIT backend fallback committed/pushed: `73718e9 chore: point backend fallback to digitalocean`.
- [x] AIT build/upload PASS: `deploymentId=019e431b-e775-7044-ab90-96d92933e91e`, SHA256 `6f97723c5a521a33ad4fb1e3793419affb91c73cbf4a420dbfea86dab87295f5`.
- [x] Bundle scan: DigitalOcean URL `8`, Railway URL `0`, service role/AIT/DO/OpenAI secret markers `0`, `ait-ad-test-*` `0`, brand HTTPS `4`.
- [x] Metro-off real Toss app ADB PASS: `viva.republica.toss/im.toss.rn.granite.core.GraniteActivity`, dashboard render, `first_paint_boundary=798ms`, `api_dashboard_backend_done=3202ms`, `page_fresh_data_settled=4848ms`.
- [x] Reusable skill created and validated: `/Users/family/.codex/skills/toss-do-backend-deploy`.

## Scope

- [x] `toss-dev-server` skill: DEV_LOCAL backend URL/cache verification pattern added
- [x] `toss-monetization-ops` skill: FREE/token/PRO AI coaching limit QA pattern added
- [x] `toss-ait-build-ops` skill: backend policy deployment check added before AIT build
- [x] Latest `.ait` artifact built from current working tree

## Build

- Command: `node_modules/.bin/ait build`
- Result: PASS
- Latest deployment ID embedded in artifact: `019e431b-e775-7044-ab90-96d92933e91e`
- Artifact: `taillog-app-019e431b-e775-7044-ab90-96d92933e91e.ait`
- SHA256: `6f97723c5a521a33ad4fb1e3793419affb91c73cbf4a420dbfea86dab87295f5`
- Size: ~16 MB
- RN builds: `0.84.0` and `0.72.6`, both `0 errors / 0 warnings`

## Bundle Scan

- [x] Supabase markers present
- [x] DigitalOcean production backend marker present
- [x] Railway production backend marker absent: `0`
- [x] HTTPS Toss brand icon marker present
- [x] Local brand icon path leak: `0`
- [x] Brand icon data URI marker: `0`
- [x] `ait-ad-test-*` marker: `0`
- [x] `isDevToolsEnabled()` returns `false`
- [x] Secret leak scan: service role key, AIT deploy key, Toss API key all `not_found` in JS bundles
- [x] New monetization copy present: `AI 코칭 하루 10회`, `상담지 기반 정밀 코칭`, `하루 1회 + 토큰 충전`, `결제 복원`, `PRO로 더 정밀하게 보기`
- [x] Coaching result fallback present in bundle: `usage?.limit ?? (isPro ? 10 : 1)`

## Validation

- [x] `npx tsc --noEmit`
- [x] `Backend/venv/bin/python -m py_compile Backend/app/features/coaching/budget.py Backend/app/features/coaching/service.py Backend/app/features/coaching/router.py Backend/app/features/subscription/router.py`
- [x] Scoped `git diff --check`
- [x] Local ADB/Meto/FastAPI proof from previous pass: `/api/v1/coaching/usage/daily` reached local FastAPI 200 and UI showed `오늘 0/1회 사용`
- [x] AIT upload PASS: `intoss-private://taillog-app?_deploymentId=019e431b-e775-7044-ab90-96d92933e91e`
- [x] Metro-off ADB launch PASS: actual Toss app `viva.republica.toss/im.toss.rn.granite.core.GraniteActivity`
- [x] logcat PASS: `[AIT-BUILD] taillog-startup-perf-20260511-1545`, `first_paint_boundary=798ms`, `api_dashboard_backend_done=3202ms`
- [x] Dashboard render proof captured: `/tmp/taillog-qa/ait-019e431b-do-retry.png`

## Blocked

- Railway remains unavailable, but it is no longer the active production backend for AIT.
- DigitalOcean App Platform is the current active backend. Monitor 512 MB memory/runtime logs before deciding whether to upgrade to `apps-s-1vcpu-1gb-fixed`.

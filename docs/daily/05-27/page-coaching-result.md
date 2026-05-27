# /coaching/result — FREE full-result ownership

## Scope
- UIUX-005
- AI-001

## Changes
- [x] FREE users now see the generated 6-block AI behavior diagnosis result in full, including `7일 맞춤 플랜`, `위험 신호 분석`, and `전문가 상담 질문`.
- [x] The PRO upsell was reframed from hiding already-generated content to offering more frequent and deeper coaching through Stage 3 consultation intake.
- [x] The R3 rewarded ad label no longer implies that the current result is locked behind the ad.
- [x] Added a focused regression test so `CoachingBlockList` cannot replace generated FREE result blocks with `LockedBlock` again.

## Product Decision
- A once-generated diagnosis belongs to the user and should remain fully readable.
- The FREE boundary is the daily generation limit and lighter personalization source, not truncating the answer after it exists.
- PRO value remains in 하루 10회, 상담지 기반 정밀도, and richer action-plan details.

## Validation
- [x] `npx jest src/components/features/coaching/__tests__/CoachingBlockList.test.tsx src/components/features/coaching/__tests__/LockedBlock.test.tsx src/components/features/coaching/__tests__/FreeBlock.test.tsx --runInBand` — 3 suites / 11 tests passed
- [x] `npx tsc --noEmit` — passed
- [x] `git diff --check -- <touched files>` — passed
- [x] DEV_LOCAL device QA on `R3CXB0QH0LY`: `intoss://taillog-app/coaching/result` rendered via Metro with FastAPI local reads; FREE result showed `AI 행동 진단`, `7일 맞춤 플랜`, `위험 신호 분석`, `전문가 상담 질문`, and did not show `PRO 전용 콘텐츠`.
- [x] AIT build completed: `taillog-app.ait`, deploymentId `019e682a-25d9-74eb-a586-0016ccf136b3`, RN 0.84/0.72 Android+iOS bundles built with 0 errors / 0 warnings.
- [x] Bundle source-map scan: new R3 CTA and PRO copy present; old `광고 보고 코칭 결과 확인하기` CTA absent.
- [x] AIT deploy completed: `intoss-private://taillog-app?_deploymentId=019e682a-25d9-74eb-a586-0016ccf136b3`.
- [x] Actual Toss app private deployment QA with Metro off: `viva.republica.toss/im.toss.rn.granite.core.GraniteActivity`, `Bundle loading completed successfully`, `Running "shared"`, `loadJSBundleFromMetro=0`.
- [x] Actual Toss UI proof: `광고 보고 무료 코칭 응원하기`, `7일 맞춤 플랜`, `1일차`, `2일차`, `위험 신호 분석`, `전문가 상담 질문`, risk drawer `전체 위험도`, consultation drawer `상담 시 질문 리스트`; `PRO 전용 콘텐츠` absent.
- [x] Screenshot evidence: `/tmp/taillog-dev-coaching-result-rendered.png`, `/tmp/taillog-ait-coaching-result-019e682a.png`.

## Board Sync
- [x] `docs/status/PAGE-UPGRADE-BOARD.md` `/coaching/result` remains `Done`, last updated to 2026-05-27.

## Follow-up Diagnosis: Trigger Localization + Pro Intake Funnel
- [x] Root cause checked: simple 7-day plan + English trigger labels match the rule-based fallback path in `Backend/app/features/coaching/rule_engine.py` more than the full AI prompt path.
- [x] Backend fallback now localizes common issue/trigger IDs and fills richer 7-day fields (`session_duration_minutes`, `environment`, `tools`, `progression_rule`) with concrete task format.
- [x] Frontend insight key patterns now pass through coaching localization, so persisted English IDs such as `owner_leaves` render as readable Korean labels.
- [x] FREE result CTA now opens Stage 3 Pro intake first when the dog has not completed it, then continues to `/settings/subscription` after save.
- [x] Validation: `npx tsc --noEmit`; `Backend/venv/bin/pytest Backend/tests/test_coaching_rule_engine.py Backend/tests/test_coaching_prompts.py -q`; `npx jest src/components/features/coaching/__tests__/FreeBlock.test.tsx --runInBand`; scoped `git diff --check`.

## Deployment Follow-up
- [x] Backend hotfix commit `bd74004` pushed to `codex/ait-standalone-diagnosis`.
- [x] DigitalOcean App Platform update reached `ACTIVE`: app `ae33cc5a-0811-48d1-b8bb-ae78f4e768b7`, deployment `6d955e19-4f09-4db6-953b-d025a7db1734`, `/health` 200.
- [x] AIT build/upload completed: deploymentId `019e6994-86e6-7ae0-a379-c60de9fb4d6d`, SHA256 `daa12df17836d61ebbf4674ad2a3c002cf7671f09bc108b4ae20c21895a06a56`.
- [x] Bundle scan PASS: DigitalOcean backend URL, Supabase URL, HTTPS brand icon, live ad IDs 7, test ad IDs 0, local icon leaks 0, `isDevToolsEnabled()` false.
- [x] Actual Toss device QA PASS on `R3CXB0QH0LY`: `Bundle loading completed successfully`, `Running "shared"`, `/coaching/result` text dump showed `AI 행동 진단`, `오늘 1/1회 사용`, `광고 보고 무료 코칭 응원하기`.
- [x] FREE PRO CTA tap opened `메이 Pro 상담지` with `정밀 코칭 준비 0/3` and `상담지 저장`, confirming the intake-first upsell path.

# TaillogToss Project Status

Last Updated: 2026-05-11 (KST) — 개발환경 즉시표시 1차 개선 완료 후 AIT private 성능 측정본 업로드/실행 확인 완료, DEV_LOCAL route data marker 3페이지 sweep 완료. React Query persistence를 user-scoped AsyncStorage로 추가하고 auth/session·subscription/orders/IAP·org entitlement는 persist 제외, logout/SIGNED_OUT 시 cache clear 처리. `queryPolicy`/`queryKeys` 통일, Auth bootstrap dogs 조회 공유, 일반 page guard의 subscription blocking 제거, 주요 페이지 shell/cached-first 렌더링, FastAPI logs `?limit=` + FE dashboard 20/analysis 200/default 100 적용. post-paint bootstrap deferral과 `[PERF][startup]` marker를 추가했고, AIT uploaded dashboard는 `loadingStart→first_paint_boundary=1163ms`, `js_entry→first_paint_boundary=294ms`. DEV_LOCAL에서 `/dashboard`, `/training/academy`, `/dog/profile`에 `page_shell_ready`/`page_cached_data_ready`/`page_fresh_data_settled` marker를 추가해 재측정: dashboard cached `1965ms` / fresh `8267ms`, training cached `2096ms` / fresh `8174ms`, dog profile cached `1835ms` / fresh `2340ms`. 추가 query/API marker로 느린 구간을 분해해 dashboard backend aggregate `6355ms`, training progress/feedback/behavior analytics backend `5701/5823/6246ms`를 확인했고, dashboard/training stale 정책을 완화해 cached re-entry에서 backend refetch 없이 dashboard `fromJsStartMs=215`, training `fromJsStartMs=420`에 cached/fresh-settled 동시 완료. 추가로 FastAPI dashboard DB 왕복을 5→2로 축소하고, training progress/feedback 동시 조회는 같은 backend rows 요청을 공유하도록 보강했으며, behavior analytics는 전체 `BehaviorLog` 객체 조회 대신 SQL aggregate + memo-only 조회로 전환. Railway production `f704fc3f...` 배포 후 새 AIT `019e162c-c1b7-7a29-a3e0-df4f21cf162a`로 `/training/academy`를 재측정했을 때 `api_training_behavior_analytics_backend_done=7266ms`였고, 추가 server timing 배포 `da40cc90...` + AIT `019e163c-d6fe-7168-9b81-2c784e043966`에서는 `api_training_behavior_analytics_backend_done=4509ms`, `Server-Timing total_ms=1954.5ms`로 분리됨. ownership path split 배포 `318e4e14...` 후 같은 AIT에서 `b2c_match=true`, `ownership_path=b2c_owner`, `dog_lookup_ms=4033.1ms`, `aggregate_ms=290.4ms`로 확인되어 B2B fallback이 아니라 첫 `dogs` row lookup/DB wake가 주요 병목으로 재분류됨. `Invalid semver: ''` render error는 `No current activity` 후 AppsInToss native constants가 비어 발생한 Sandbox transient로 재분류했고 clean restart 후 재현 없음. `npm run typecheck` PASS, `npm run test:app -- --runInBand --passWithNoTests` PASS(16 suites/101 tests), `Backend/venv/bin/pytest Backend/tests/ -v` PASS(55 tests).

Latest DB latency check: live DB `dogs.id` lookup is not the bottleneck. `dogs_pkey` exists as a unique btree primary-key index, `public.dogs` was only `17` rows / `96 kB`, and live `EXPLAIN (ANALYZE, BUFFERS)` for the measured dog used `Index Scan using dogs_pkey` with `Execution Time: 0.021ms`. New local psql connections to the Railway-provided Supabase pooler URL completed the indexed query in about `0.12s-0.21s`, while Railway deployment `318e4e14...` has `sleepApplication=true` and warm public `/health` calls were still about `0.48s-0.80s`. Because `Backend/app/core/database.py` uses Supabase pooler `NullPool` + `statement_cache_size=0`, the first `db.execute()` in `/behavior-analytics` pays connection/open cost inside `dog_lookup_ms`. Next safest optimization is operational first: disable Railway sleep or keep one warm replica, then evaluate a small app-level asyncpg pool while preserving `statement_cache_size=0`.

Previous: DogPhotoPicker 개발/실행 모드 분리 완료. 과거 “사진 업로드 성공” 기록은 실제 개발용 Sandbox 앨범 선택 성공이 아니라 `dog-profiles` Storage 업로드 + `dogs.profile_image_url` 표시 성공으로 재분류한다. `viva.republica.toss.test`는 Android manifest에 `READ_MEDIA_*`/`READ_EXTERNAL_STORAGE`가 없어 `fetchAlbumPhotos`가 `NO_PERMISSION`을 반환하므로 개발모드에서는 실제 갤러리 선택 검증이 불가하다. 개발 중에는 `테스트 사진 사용` fallback으로 data URI 업로드/저장 흐름을 검증하고, 실제 사진 선택은 새 `.ait` 빌드 업로드 후 실제 Toss 앱(`viva.republica.toss`)에서 최종 확인한다. `npm run typecheck` PASS, `DogPhotoPicker.test.tsx` 3 PASS, Sandbox `/dog/profile` fallback Alert 확인 완료.

Previous: AIT private standalone 실행 재확인 완료. 최신 업로드본 `019e14a7-ca44-7f9b-bd58-a9be19376360`을 Metro off 상태에서 실제 Toss 앱 activity(`viva.republica.toss/.intoss.MiniAppSchemeActivity`)로 실행했고, `viva.republica.toss/im.toss.rn.granite.core.GraniteActivity`까지 진입해 온보딩 화면(`테일로그`, `반려견 행동, 30초면 기록 끝`, `토스로 시작하기`)이 정상 렌더됨. logcat에 `Bundle loading completed successfully`, `Running "shared"`, `[AIT-BUILD] taillog-appsintoss-wrapper-20260511-0958-cli`가 찍혔고 `loadJSBundleFromMetro()`/`RNCSafeAreaProvider`/`Invariant`는 없음. 이전 `지금은 서비스를 사용할 수 없어요`는 앱 코드 크래시가 아니라 Toss 앱 로그인 계정과 Apps in Toss 워크스페이스 멤버 매핑 문제로 재분류한다. 현재 관리자 계정 `gmdqn2tp@gmail.com` 로그인 후 standalone gate PASS.

Previous: IAP/Ads/Smart Message 실기기 QA 진행: IAP Sandbox 3시나리오 false-success/loading 잔여 버그 수정 후 새 AIT에서 실패 Alert + 버튼 복귀 확인. Smart Message는 current user 대상 HTTP 200 + `noti_history.success=true` 실발송 확인. Ads는 최신 업로드 AIT `019e00dd-24bb-7fa1-b385-251e67eae2e8`로 B1/B2/B3를 순차 재시도했고, 세 슬롯 모두 mock fallback 없이 live adGroupId로 실제 SDK 호출 후 `ad_error` 상세 payload를 확보함: 공통 `code=1007`, `domain=@apps-in-toss/framework`, `This feature is not supported in the current environment`. IAP backend hardcoded 재점검 결과 release 빌드는 env가 없어도 Railway public URL로 고정하고, `127.0.0.1:8765`은 DEV local Metro host에서만 사용하도록 제한했으며 legacy `verifyIAPOrder()`도 404/408 시 FastAPI proxy로 우회하도록 보강. Railway 재배포 성공: deployment `d11ae99d-c5bf-47ba-98a7-0bea0a635848` SUCCESS, `/health` HTTP 200, IAP proxy route smoke HTTP 401로 라우트 생존 확인. `verify-iap-order` Edge v13은 Toss IAP 검증을 `/order/get-order-status` + `x-toss-user-key`로 교체해 재배포 완료. 업로드 AIT `019e00f0...` 성공 재시도에서 SDK 결제 이벤트가 서버 grant 완료보다 먼저 와 앱이 `GRANT_FAILED`로 조기 확정하는 프론트 상태머신 버그를 추가 확인했고, `createOneTimePurchaseOrder`를 서버 grant 완료 후 `GRANT_COMPLETED` 처리하도록 수정. 공식 문서 기준 `_app.tsx` 엔트리를 `AppsInToss.registerApp(AppContainer, { context })`로 교체하고 최신 AIT `019e01b9-3c4c-7677-b6b9-d80529a2d868`를 API 키 기반 `ait deploy --scheme-only`로 신규 배포 성공, hash `8a18b7d9dbb1e0c8be8ccec2513246f5e2f00cfb30f772e26f3ae84d923a7707`, 번들에 `AppsInTossInitialProps`/`RNNavigationBar`/`TDSProvider` 포함 확인, `brandIcon:"https://static.toss.im/..."`, local path/data URI 없음, `ait-ad-test-*` 0, `tsc`/문법검사 통과. Metro on control은 같은 private URL로 대시보드 진입 성공했고 logcat에 `loadJSBundleFromMetro()` + `[AIT-BUILD] taillog-appsintoss-wrapper-20260507-1745`가 찍혀 app JS/공식 wrapper 정상임을 확인. 최신 Android 샌드박스 APK(`rn-miniapp-real-release-protected.apk`, 2026-04-22) 재설치 후 `viva.republica.toss.test lastUpdateTime=2026-05-07 18:38:12` 확인했지만 Metro-off private launch는 여전히 JS marker 없이 host error(`앱 실행도중 문제가 발생했습니다.`)로 종료. 실제 Toss app `5.258.1` 직접 private scheme은 `지금은 서비스를 사용할 수 없어요.`로 종료. 샌드박스 홈에는 `taillog-app`이 노출되므로 앱 목록/로그인 자체는 통과. outdated sandbox app/app JS/registerApp/brand.icon/API deploy는 소거됐고, 남은 1순위는 direct adb scheme과 콘솔 QR/test-button 컨텍스트 차이 또는 Apps in Toss host의 deployment entitlement/lookup 문제다. 최소 smoke AIT도 생성 완료: current `taillog-app.ait`, embedded deploymentId `019e01f5-9ae6-774d-90d7-e68ac7132db5`, hash `552c233d3d5d3ada1eee5676f66fc6950e667b65664713d2e72c060b6ed81d03`, marker `[AIT-SMOKE] minimal-standalone-20260507-1845`; 콘솔 업로드/QR 실행으로 host vs app-bundle 문제를 최종 분리해야 함.

Latest addendum: 최소 smoke AIT 업로드본 `019e01f5-9ae6-774d-90d7-e68ac7132db5`도 Metro off direct standalone launch에서 동일 host error(`앱 실행도중 문제가 발생했습니다.`)로 실패. 현재 `taillog-app.ait` hash는 `552c233d3d5d3ada1eee5676f66fc6950e667b65664713d2e72c060b6ed81d03`, bundle에는 `[AIT-SMOKE] minimal-standalone-20260507-1845`/`Taillog AIT Smoke`가 있으나 logcat에는 `ReactNativeJS`/smoke marker가 전혀 없음. RN native host는 뜨지만 `ReactInstanceManager` 초기화 전 host dialog가 올라오므로 앱 코드/IAP/Ads/네비게이션/DEV 메뉴 문제는 사실상 소거됐고, 남은 1순위는 Apps in Toss standalone host의 deployment lookup/entitlement/registration 또는 콘솔 QR/test context 차이다.

Review request candidate: 정상 앱 소스로 최종 AIT `019e0219-fcc0-7eaf-aa96-6853fd8a7553` 빌드 완료. 파일은 혼동 방지를 위해 `/Users/family/jason/TaillogToss/taillog-app-final-review-019e0219.ait` 하나로 정리했고 hash는 `dec4303b3931eae03c976f08805c650f7df20f2ca76b44a0beac63af3ced62d3`, 약 `17MB`. `npx tsc --noEmit` PASS, `ait build` RN `0.84.0`/`0.72.6` 모두 `0 errors / 0 warnings`, Android 번들 `node --check` PASS. 번들 스캔상 smoke marker `0`, normal marker present, `ait-ad-test-*` `0`, live adGroupId `7`, brandIcon은 Toss HTTPS URL, data URI/local path 없음, `isDevToolsEnabled() { return false; }`, Railway/Supabase URL 포함. 검토요청/에스컬레이션에는 이 최종본을 제출하고, 최소 smoke 실패 `019e01f5...` 증거를 함께 첨부한다.

Review submitted: 최종 AIT로 Apps in Toss 검토요청 완료. 출시 노트는 테일로그 실제 범위(반려견 행동 기록, 맞춤 훈련, AI 코칭, 구독/토큰)로 입력했고, 앱 내 기능은 `맞춤 훈련 찾기` / `Find training` -> `intoss://taillog-app/training/academy`로 등록. 이후 수정요청이 오면 Metro 개발모드에서 재현/수정 -> `npx tsc --noEmit` -> `ait build` -> 새 `.ait` 업로드 -> 새 `deploymentId` 실기기 확인 -> 변경 요약과 함께 재심사 요청 순서로 처리한다.

Previous: AIT private standalone 실행 복구 완료: 기존 `019e005e-a79c-7ea7-93d4-d63e86fbbae6` 실패 원인은 `.ait` runtime setup에 `brandIcon:"./src/assets/icons/app-logo-600.png"` 로컬 경로가 들어간 패턴으로 확인. `granite.config.ts`가 로고 PNG를 빌드 시점 `data:image/png;base64,...` URI로 주입하도록 수정 후 `taillog-app.ait` 재빌드(`019e008c-d1e0-7148-bd63-cc61473c135f`, 16MB, hash `dae637...a562`) 및 업로드 실행 성공(사용자 확인). `npm run build` 0 errors/0 warnings, `npx tsc --noEmit` PASS. 남은 항목: CORS 실환경 도메인 설정, IAP 샌드박스 테스트 3종(실기기), Ads/Smart Message Sandbox 검증.

Previous: 퍼블리싱 체크리스트 진행: (1) 앱 로고 콘솔 승인 완료 체크 (2) `TOSS_MTLS_MODE=real` 복구 (`supabase secrets set` + `login-with-toss` 재배포) — 더미 코드로 Toss 실서버 응답(`invalid_grant`) 확인, mock 우회 없음 검증 (3) 번들 크기 15MB 측정 (100MB 기준 통과) (4) AI 생성물 명시(`CoachingDetailContent.tsx:134`) + 개인정보처리방침 위탁업체(`privacy.tsx §6`) 이미 구현 확인 (5) Backend pytest 47/47 PASS, tsc 0 errors.

Previous: 행동분석 `0/10회` 버그 2종 수정: (1) `check_user_daily_limit` 집계 테이블 오류(`AIRecommendationSnapshot` → `ai_coaching JOIN dogs`) (2) `today_start` timezone 오류(`date.today()+replace(utc)` → KST 자정 기준 변환). IAP E2E `subscriptions.is_active=true` 활성화 완료: `verify-iap-order` Edge Function에 `activateSubscription()` 추가 + `subscriptions_user_id_key` UNIQUE 제약 적용. `toss-iap-proxy-ops` 스킬 Pattern 5(subscriptions 활성화 E2E) 추가.

Previous: IAP 재진입 인증 버그 2종 수정: (1) `TOSS_MTLS_MODE=mock` 강제 설정 + `login-with-toss` 재배포 → 테스트 앱 sandbox auth code를 real Toss 서버가 거부하던 `토스인증서버응답실패` 해소 (2) `supabase.ts` AsyncStorage adapter(`@granite-js/native`) + `detectSessionInUrl:false` 추가 → IAP JS 런타임 재시작 후 세션 소멸 방지 (3) `AuthContext` `onAuthStateChange` 리스너 추가 → SIGNED_IN/SIGNED_OUT 이벤트 자동 반영. 빌드 성공(0 tsc errors). ⚠️ 프로덕션 배포 전 `TOSS_MTLS_MODE=real` 복구 필수.

Previous: FastAPI 서버사이드 E2E 13종 전체 통과: dogs/settings/dashboard/logs/onboarding-3stage/coaching-generate/coaching-feedback/behavior-analytics/IAP-proxy 모두 ✅. settings JSONB 픽스(tone 왕복) 검증 완료. 온보딩 3단계 연속 (stage1→2→3, completion 100%) 확인. IAP proxy `grant_status:granted` 재검증. 이전: DogPhotoPicker notDetermined 버그 픽스 + 갤러리 테스트 환경 한계 확인.

Previous: 5대 버그 픽스 세션 (2026-05-03) — (1) Survey 루프: MockMTLSClient userKey 고정(`mock_stable_user_001`) + login-with-toss 재배포 (2) 구독 탭 크래시(404): iap.ts 404 감지 → FastAPI proxy(8765포트) 우회 (3) settings PATCH 500(JSONB 파싱): validator에 str→json.loads 처리 (4) IAP service role 인증: verify-iap-order에 JWT role 파싱 감지 (5) 사진 업로드: stage1-form dog 생성 후 Supabase Storage 직접 업로드. 리팩터링: `iap-invoke.ts` 신규 (토큰 헬퍼 7개 분리), `iap.ts` 364줄로 축소. E2E: 다른 authCode도 동일 userId ✅, getDogs→hasCompletedOnboarding=true ✅, settings PATCH 200 ✅, IAP logcat ✅. 이전: AIT 광고 Ad Group ID 7종 `.env` 등록 완료 (AD-001).

Previous: AIT 상품 ID 코드 연결 완료 (IAP-001): `subscription.ts` IAP_PRODUCTS 3종 product_id 플레이스홀더 → AIT 콘솔 실ID 교체(PRO `ait.0000020829.09e69bf9...` / 토큰10 `ait.0000020829.b0b00d71...` / 토큰30 `ait.0000020829.32dc32cf...`). 토큰10 판매가 1903→1892 수정(공급가 1720 기준). `subscription.tsx` 하드코딩 `'pro_monthly'/'ai_token_10'/'ai_token_30'` → `product.product_id` 상수 참조로 교체, 회당 단가 동적 계산 적용(토큰10 190→189 / 토큰30 163→117). `toss-dev-server` 스킬: `npx granite dev` → `node_modules/.bin/granite dev` 수정 + `adb reverse tcp:8000` 실패 시 LAN IP 폴백 절차 추가. tsc 0 errors.

Previous: 설문 누락 필드 8종 연결 + Draft Save + behaviors 경로 버그 수정 (UIUX-004): [Phase 1] BE 스키마 확장 — `ActivityMeta` +`walk_frequency`/`walk_duration_minutes`, `Temperament` +`env_reaction`/`person_reaction`/`dog_reaction`/`focus_level`/`attach_level`(5종 기질), `SurveyStage2` +`activity_meta`/`rewards_meta` 서브모델 추가. `repository.py` `update_dog_with_stage2` activity_meta merge 저장 + rewards_meta 초기 저장, `update_dog_with_stage3` overwrite→merge 전략으로 변경(stage2 walk_frequency 보존). [Phase 2] FE 타입·payload 연결 — `SurveyStage2Request` +activity_meta/rewards_meta, `SurveyStage3Request.temperament` +5종 기질, `stage2-form.tsx` walkFreq·walkDuration·rewards payload 연결, `stage3-form.tsx` envReaction·personReaction·dogReaction·focusLevel·attachLevel payload 연결. [Phase 3] 추천 엔진 연결 — `DogPlanSignals` +5 기질 필드, `recommendPlan()` Plan B 조건에 `hasAnxietyTemperament`(envReaction=anxious/personReaction=hide/dogReaction=bark/attachLevel=velcro/focusLevel=uninterested) 추가, `training/detail.tsx` 5필드 전달. **Bug fix**: `behaviors: env?.health_meta?.chronic_issues`(의료 배열, 항상 []) → `env?.chronic_issues?.top_issues`(행동 배열, 올바른 경로). Draft Save 구현: `useDraftSave<T>` 제네릭 훅 + `draftStorage.ts` AsyncStorage 래퍼(@granite-js/native) — stage1(`stage1_new`)/stage2(`stage2_${dogId}`)/stage3(`stage3_${dogId}`) 통합, debounce 500ms, 마운트 복원, 제출 성공 시 clearDraft. 실 DB 3마리 검증: 28kg 골든리트리버 → Plan C ✅, Stage2 일반 강아지 → Plan A ✅, 기질 필드 populating 후 → Plan B ✅. tsc 0 errors, Jest 115/115 PASS.

Previous: 메모 → 훈련 추천 반영 4-Phase 완료 (MEMO-001) + 빠른기록 UX 개선: [Phase 1] `analytics/schemas.py` `memo_keywords: Optional[Dict[str, List[str]]]` 추가, `analytics/service.py` `_extract_keywords()`(불용어 제거·2자 이상 필터) + behavior별 상위 5 키워드 집계, `test_behavior_analytics.py` 2케이스 추가(pytest 46/46 PASS). [Phase 2] `training.ts` `memo_keywords?` 반환 타입 추가, `engine.ts` `BehaviorAnalytics.memo_keywords` + `CurriculumRecommendationV2.contextTags` + `_enrichReasoning()` 추가(강도≥7: "특히 강해요", else: "상황 집중"). [Phase 3] `coaching/service.py` `_build_behavior_analytics_text()` — 로그≥10 AND 메모보유≥3 조건 충족 시 `[행동 발생 상황 메모]` 섹션 AI 프롬프트 주입(+150~250 토큰). [Phase 4] `RecommendedCurriculumCard.tsx` `contextTags?: string[]` prop + 주황 배지 최대 2개, `academy.tsx` prop 전달. 서브에이전트 3종 병렬 검증(Backend유닛/FE타입/API통합) 전체 통과. 빠른기록 다중 행동 선택: `QuickLogChips` `selectedKeys[]` 토글 방식, `QuickLogForm` 카테고리별 개별 로그 저장, `quick-log.tsx` race condition 수정(`remaining--` → `completed===total` + `onSettled`). 강도 칩 6 추가(`[1,2,3,5,6,7,10]`). tsc 0 errors, pytest 46/46 PASS.

Previous: 광고 슬롯 5종 전체 연결 + 실기기 adb 검증 완료 (AD-002): `training/academy.tsx` I1 전면광고(`useInterstitialAd`+`pendingCurriculumRef` 패턴, 커리큘럼 진입 시 무료 사용자 전면광고 → 닫힌 후 detail 이동), `training/detail.tsx` B3 배너, `dashboard/quick-log.tsx` B2 배너 연결. 5슬롯(R2/B1/B2/B3/I1) 실기기 adb screenshot 검증 완료. Smart Message `variables` 필드 전면 제거 (MSG-001 정적텍스트 정책 완전 적용): `types/notification.ts` · `notificationTemplates.ts` · `useNotification.ts` · `notification.ts` 4파일 수정. `training.ts` 555줄 → 3파일 분리: `training.transform.ts`(내부 유틸 137줄) + `training.feedback.ts`(피드백 API 168줄) + `training.ts`(코어 262줄, 외부 인터페이스 유지). tsc 0 errors, Jest 115 PASS.

Previous: Smart Message 재사용 시스템 완성 (MSG-001): `notificationTemplates.ts` TEMPLATE_CODES 6종(LOG_REMINDER ✅/COACHING_READY⏳/TRAINING_REMINDER⏳/STREAK_ALERT⏳/SURGE_ALERT⏳/PROMO⏳) 확장 + buildTemplate() 타입별 분기, `lib/notifications/index.ts` 신규 배럴(useLogReminder/useCoachingReady/useTrainingReminder/useStreakAlert/useSurgeAlert), 도메인 훅 `send(userId)` 단순화(푸시 정적텍스트 — 중괄호 변수 불가). Toss 콘솔 소재 6종 완성: log_reminder 캠페인 A/B안 등록, 세그먼트 `테일로그_앱방문365` 생성(1,000명 미만). ⏳ promo 광고성 캠페인 → 앱 제출 후 등록. IAP 토큰10 소모품 재등록 완료. tsc 0 errors.

Previous: IAP 콘솔 등록 완료 + 판매가 확정: PRO ₩4,895(공급가 4,450) / 토큰10 ₩1,903(1,730) / 토큰30 ₩3,498(3,180). `subscription.ts` 판매가 실수치 반영. 토큰10회 비소모품 오류 → 콘솔 재등록 완료. tsc 0 errors.

Previous: 인앱 광고 7슬롯 인프라 완성 (AD-001): `types/ads.ts` BannerPlacement B1/B2/B3 + InterstitialPlacement I1 확장, `lib/ads/config.ts` 전 슬롯 adGroupId 매핑 + `isMockMode()`, `useBannerAd` / `useInterstitialAd` 훅 신규(일일 한도·handled 플래그·타임아웃 폴백), `BannerAd`(InlineAd 래퍼, 테스트 ID 시 목업 자동) + `InterstitialAd`(render-prop) 컴포넌트 신규, `components/shared/ads/index.ts` barrel export, `tracker.ts` `ad_impression` / `ad_dismissed` 이벤트 추가. 콘솔 가이드 `docs/ref/AIT-ADS-CONSOLE-GUIDE.md` 신규. tsc 0 errors.

Previous: 코칭/분석 UX 개선 (UIUX-005): `CoachingBlockList` Block ④⑤⑥ `isPro` 분기 (`LockedBlock` 무료 / `UnlockedBlock` Pro), `UsageLimitBanner` 신규 공용 컴포넌트, "새 코칭 받기" `isLimitReached` 비활성 버그 수정, 심화인사이트 CTA 텍스트 개선(잠긴 블록 혜택 명시), 분석탭 "상세 분석 보기" 링크 제거, `analysis.tsx` `CoachingPreviewCard` 사용량 배지 연결. tsc 0 errors.

Previous: Progressive Profiling 전 Phase(0~4) 완료: Stage1/2/3 설문 분리(`onboarding_survey JSONB` + `coaching_questions` 테이블), Supabase 마이그레이션 2건 적용(`20260428000001/20260428000002`), `models.py` Enum `values_callable` 버그 수정(4컬럼), `stage1/2/3-form.tsx` 신규 페이지 + `router.gen.ts` 등록, `ProfileCompletionBanner` + `Stage2InterceptModal`(AsyncStorage 1회 표시) 연결, coaching gate(stage<2 = 규칙폴백, stage≥2 = AI), ask_coach Pro 전용 403, 병렬 서브에이전트 테스트 4종 E2E 검증 완료. tsc 0 errors.

Previous: 훈련 스텝 체크 저장 버그 수정 + `reaction` 컬럼 DB 마이그레이션 적용: `training.ts` Supabase fallback 3곳에 `user_id` 추가(RLS INSERT 차단 근본 해결), `Backend/training/router.py` `POST /feedback`+`GET /feedback/{dog_id}` 신규, `schemas.py` `StepFeedbackUpdate`+`reaction` 응답 필드 추가, `service.py` `upsert_step_feedback`+`get_step_feedback` 함수 추가, `models.py` `UserTrainingStatus.reaction` 컬럼 추가, DB `user_training_status.reaction VARCHAR(20)` psql 직접 적용. ADB E2E 실기기 검증: 스텝 탭→체크마크 즉시 표시, `reaction='enjoyed'` DB 저장 확인. tsc 0 errors.

Previous: Free/Pro UX 3종 + 구독 페이지 버그픽스: `useProUpgradeSheet()` 훅 신규(SheetNode useMemo 포함), `VariantSelector` Plan B/C `proOnly:true`+`onProCTA` prop, academy/detail `useProUpgradeSheet` 전환, `CoachingPreviewCard` 일일 사용량 배지(dailyUsed/dailyLimit), `subscription.tsx` DetailLayout `headerShown:false` 추가(백버튼 중복 해소), `onSuccess(granted)` 체크(`ProUpgradeSheet`+`subscription.tsx`) — GRANT_FAILED 오경보 버그 수정, `devPlanOverride.ts` 신규+`DevMenu` 플랜 전환 토글, `Backend/training/deps.py` Pro 커리큘럼 게이트, `AI_LLM_TIMEOUT_SEC` 30→120. tsc 0 errors.

Previous: Fine-tuning 배치 복구 + Backend Pro 커리큘럼 게이트 + DevMenu 플랜 전환 UI: `AI_LLM_TIMEOUT_SEC` 30→120(OpenAI timeout 근본 원인 해결), `Backend/app/features/training/deps.py` 신규(Pro 커리큘럼 6개 upsert 게이트), `training/router.py` Pro 검증 추가, `src/lib/devPlanOverride.ts` 신규(devGuardBypass 패턴 복제), `useIsPro()` 개발 오버라이드 지원, `DevMenu` 플랜 전환 토글(📱→🆓→💎 순환). `.mcp.json` project-ref `kvknerzsqgmmdmyxlorl`→`gxvtgrcqkbdibkyeqyil`(본선 SSOT 정렬) + 신규 토큰 교체. FastAPI uvicorn 4→1 프로세스 단일화(PID 11755). tsc 0 errors.

Previous: Pro 기능 인터셉트 + mTLS 버그픽스: `ProUpgradeSheet` 신규(시도 이력 Pro 게이트), `detail.tsx` "시도 이력 보기" `!isPro` 인터셉트, `coaching/result.tsx` 잔여 Pro 넛지 제거, `privacy.tsx` Supabase 위탁업체 명시(보안 심사 대응), `ProUpgradeBanner` 토큰 하드코딩 수정(`spacing.lg/md`), `mTLSClient.sendSmartMessage` Toss API 필드명 불일치 버그 수정(`templateSetCode`+`context`+`x-toss-user-key`). tsc 0 errors.

Previous: 수익화 재설계 완료 (monetization-redesign): Pro 블록 잠금 전면 제거 → 광고 제거(무료 R3광고 삽입) + `/coaching/insights` 심화 리포트(Pro 전용) 모델로 전환. `CoachingBlockList` 6블록 전체 공개(`isUnlocked=true`), `result.tsx` 856→436줄 분리(`CoachingDetailContent.tsx` 추출), `InsightReportHeader`/`useInsightReport` 신규, `ProUpgradeBanner` 문구 갱신, `router.gen.ts` `/coaching/insights` 추가. tsc 0 errors, Jest 115/115 PASS. 이전: 앱인토스 콘솔 앱정보 신청 완료 (앱이름/영문명/키워드/카테고리/스크린샷 세로3장+가로1장). Analysis 화면 풍성화(UIUX-001): 브랜드 리네임(꼬리일기→테일로그), 차트 내부 타이틀 추가(Bar/Radar/Heatmap), `heatmapPeakHour()` 신규, `buildAnalysisShareText` 종합 리포트 형식으로 전면 개편(topBehaviors Top3+trainingEffects+peakHour+DogEnv 생활환경·건강), TRIGGER_LABELS/HEALTH_LABELS 한국어 로컬라이징, Bar+Radar 이중 Supabase Storage 업로드 → 두 URL 공유, `useDogEnv` 분석화면 연결, `ChartWebView.onCapture` 확장, `behaviorIcons.ts` 신규. tsc 0 errors. 이전: 코드 리뷰: UI-TRAINING-PERSONALIZATION-001 + UI-TRAINING-DETAIL-001 실데이터 연결 완료 확인.

Previous: 훈련 커리큘럼 철학 재정의 완료 (플랜 A/B/C): `PlanPhilosophy` 타입+`planMeta` 전체 7개 커리큘럼 적용, altB/C 전체 109스텝 100% 채우기(fear_desensitization 포함), `variant_notes` C 레이블 커리큘럼별 갱신(35개), `VariantSelector` 철학 뱃지 UI, `detail.tsx` 5개 컴포넌트 분리(CurriculumHeroCard/DayProgressIndicator/DayTabBar/CelebrationModal/AttemptHistorySheet), `recommendPlan(DogPlanSignals)` 엔진 추가(노령·대형견→C, 불안·반응성→B, 기본→A), `detail.tsx` 훈련 첫 시작 시 dogEnv 기반 자동 Plan 설정, `training-data-maintenance.prompt.md` 자동화 등록. tsc 0 errors.

Previous: 훈련 UX QA 버그픽스 + 아이콘 에셋 교체: ModalLayout SafeArea(iOS 홈인디케이터 34pt) + backdrop dismiss 추가, `GET /step-attempts` 엔드포인트 + `useStepAttempts` hook으로 StepAttemptHistory 실데이터 연결, `getRecommendationsV2` secondary null 폴백 수정(단일 후보 시 미완료 커리큘럼 fallback), RecordModal 훈련탭 footer 조건부, detail.tsx ReactionTrendBar+StreakBadge 렌더링, 커리큘럼 제목 불필요 텍스트 제거([세상 밖 소리], [괜찮아,조금씩!]), `curriculumIconAssets.ts` base64 URI 방식으로 재작성(Granite.js require() 미지원), CurriculumCard/ShowcaseCard/detail heroIcon → `source={{ uri }}` 패턴 교체. tsc 0 errors.

Previous: AI 코칭 강화 + 훈련 추천 개인화 + 시행착오 기록 시스템 완료 (AI-COACHING-ANALYTICS-001, UI-TRAINING-PERSONALIZATION-001, UI-TRAINING-DETAIL-001): `training_step_attempts` DB 마이그레이션 remote 적용, `/behavior-analytics` FastAPI 엔드포인트, `getRecommendationsV2` ScoreBand 엔진, academy 3섹션 UX, StepCompletionSheet 2경로, AnalysisBadge, ReactionTrendBar, StreakBadge, StepAttemptHistory, RecommendedCurriculumCard, RelatedCurriculumCarousel, detail.tsx useSubmitStepAttempt 연결, RecordModal B2B 훈련이력 탭, pytest 5/5 PASS, tsc 0 errors. 실주행 확인: "최근 기록 23개 분석 결과" 실데이터 연결 확인.

Previous: 헤더 통일화: ListLayout에 `style`/`contentContainerStyle` 오버라이드 prop 추가, settings 페이지 로컬 TopBar 제거 → ListLayout 교체(로딩/에러/정상 3경로), TabLayout에 `headerLeft` prop 추가, 대시보드 헤더에 강아지 아이콘 로고 적용(ICONS['ic-stage-adult'] base64 URI 방식). tsc PASS.

Previous: DogPhotoPicker 실 SDK 연동(fetchAlbumPhotos 권한 3단계+갤러리 선택), DogCard 대시보드에 profile_image_url 조건부 렌더링(이모지→실사진), IAP completeProductGrant 실 SDK 연결, coaching/result AI 생성물 disclaimer 추가, Supabase dog-profiles 버킷 생성+진돗개 사진 업로드. tokens.ts dev 전용 토큰 추가, DevMenu 하드코딩 색상 토큰화, tsc PASS.

Previous: ops/settings 실데이터 업그레이드(B2B-002): 센터정보수정(OrgInfoEditForm+useUpdateOrg), 강아지현황카드(DogQuotaCard), 멤버초대피드백(Alert), 플랜카드(PlanCard), B2B_IAP_PRODUCTS 키 케이스 불일치 수정. OrgContext isOrgLoading 추가, OrgBootstrap role체크 제거 → org null 버그 해결. ops/dog-add isOrgLoading 대기+ops/setup 리디렉트. dogs 테이블 vet_name/animal_reg_no/parent_address 컬럼 추가 migration, org_dogs.parent_phone_last4 명문 저장 + verify_parent_phone_last4 RPC 수정. 128/128 테스트 통과.

Previous: Supabase 프로젝트 정합성 복구: CLI를 올바른 프로젝트(`gxvtgrcqkbdibkyeqyil`)에 재연결, `assign-b2b-role` Edge Function 재배포(verify_jwt=false), `create_organization`+`verify_parent_phone_last4` RPC 신규 프로젝트에 적용, `behavior_logs.org_id` 미삽입 버그 수정(QuickLogInput+createQuickLog+ops/today). 전체 40개 테이블 스키마 비교 완료.
Owner Doc: `CLAUDE.md` (슬림 인덱스), 본 문서는 상태/이력 상세 전용.

## Mac 마이그레이션 (2026-04-02)

Windows → Mac 개발 환경 전환 완료:
- **경로 갱신**: `CLAUDE.md` Repo Boundary + `.claude/settings.json` 경로 전부 Mac 기준으로 수정
- **의존성**: npm install 완료 (1521 packages, TypeScript 5.9.3), Supabase CLI 2.75.0 → 2.84.2 업그레이드
- **연결 검증**: Supabase 38 테이블 / 전체 RLS 확인, post-edit typecheck hook Mac 정상 동작 확인
- **MCP 이슈**: `.mcp.json` 로컬 토큰 auth 오류 미해결 → `claude_ai_Supabase` (Anthropic 내장) 우회 운영 중
- **Backend 세팅**: Python 3.14.3 venv + pip install 완료, FastAPI `uvicorn :8000` 정상 가동 (`/health` 200 OK)
- **Android 연결**: `adb` (v37.0.0) 설치, `adb reverse tcp:8081/5173/8000` 포트 포워딩, 기기 `R3CXB0QH0LY` 인식
- **Sandbox 진입**: `intoss://taillog-app` 스킴 연결 확인, LogBox 오버레이 비활성화 (SafeArea 충돌 해결)
- **LAN→adb**: `backend.ts` DEV_LAN_BACKEND_URL → `adb reverse` 방식으로 전환 (`127.0.0.1:8000`)

## SDK 2.x 마이그레이션 (2026-04-02)

`@apps-in-toss/framework` 1.14.1 → 2.4.1 메이저 업그레이드 완료:
- **패키지**: React 18.2→19.2.3, RN 0.72→0.84.0, TDS 1.3.8→2.0.2, Granite 0.1.34→1.0.4
- **빌드**: `granite build` → `ait build` (코드모드 `ait migrate react-native-0-84-0` 실행)
- **코드 수정**: `BackHandler.removeEventListener` → `subscription.remove()`, `URL.pathname` read-only 대응
- **검증**: tsc 0 에러, 114 tests 통과 (FE 83 + Edge 31), `ait build` → `taillog-app.ait` 4.9MB
- **`brick-module@0.5.0`** 코드모드에 의해 자동 추가

## 운영 하네스 (2026-04-02)

vibehub-media 하네스 이식 완료:
- **Commands**: `/learn`, `/doc-update`, `/self-review`, `/token-lint` (`.claude/commands/`)
- **Hook**: `post-edit-typecheck` — src/ 편집 시 `tsc --noEmit` 자동 실행 (`.claude/hooks/`)
- **MCP**: `code-review-graph` 서버 등록 (346 files, 1269 nodes, 6580 edges)
- **Config**: `.claude/settings.json`에 PostToolUse hook 등록, `.code-review-graphignore` 추가

## Edge Function 상태

| 함수 | 버전 | verify_jwt | mTLS | 상태 |
|------|------|-----------|------|------|
| `login-with-toss` | v18→재배포 | false | **real** | 신규 프로젝트 재배포, 신규 mTLS 인증서 적용 |
| `verify-iap-order` | v17→재배포 | true | **real** | 신규 프로젝트 재배포 |
| `send-smart-message` | v14→재배포 | true | **real** | 신규 프로젝트 재배포 |
| `grant-toss-points` | v14→재배포 | true | **real** | 신규 프로젝트 재배포 |
| `legal` | v13→재배포 | false | — | 신규 프로젝트 재배포 |
| `toss-disconnect` | v17→ping수정 | false | — | ping(빈 body) 200 pong 처리 추가, 콘솔 콜백 검증 대기 |
| `generate-report` | v8→재배포 | true | — | 신규 프로젝트 재배포 |
| `withdraw-user` | v3 | false | — | 신규 배포: verify_jwt=false + 내부 Admin API JWT검증(ES256 호환), public/auth 실삭제 |
| `assign-b2b-role` | v2 | false | **real** | 재배포(2026-04-21): 올바른 프로젝트(gxvtgrcqkbdibkyeqyil)에 배포, verify_jwt=false + 내부 JWT 수동 검증 |

> **신규 프로젝트**: `gxvtgrcqkbdibkyeqyil` (2026-04-20 이전, Toss 미니앱 전용)

## Parity ID 추적 (요약)

| Parity ID | 도메인 | 상태 | 완료 항목 | 잔여 |
|-----------|--------|------|----------|------|
| AUTH-001 | 인증 | Done | login.tsx 토큰화, AuthContext, usePageGuard, login-with-toss v18 real mTLS, 실기기 200/400 증적 + withdraw-user Edge(v3, ES256 호환) | — |
| APP-001 | 앱 셸 | In Progress | 23라우트, _app.tsx, 레이아웃 5종, 딥엔트리 3종 | 실기기 라우팅 완전 검증 |
| UI-001 | 디자인 | In Progress | 52컴포넌트, 토큰 중앙화 70+파일, Lottie 3종, 상태UI 8화면 | 실기기 비주얼 QA |
| LOG-001 | 행동 기록 | In Progress | 대시보드/빠른기록/상세기록/분석, backend-first 전환 + useDeleteLog 낙관적 삭제 훅 + LogCard 롱프레스 UI (2026-04-20) | FastAPI 로그 API 실기기 E2E |
| AI-001 | AI 코칭 | In Progress | 6블록 코칭, 피드백, BE-P5, backend-first, 실연동 E2E 완료(2026-04-20): subscriptions drift 수정, max_tokens 1800, ownership 검증, CoachingGenerationLoader 5단계, FreeBlock Plan C | 실기기 QA (typing/Lottie/bg-flash 시각 확인) |
| AI-COACHING-ANALYTICS-001 | 코칭 행동 분석 | Done | `_build_behavior_analytics_text()`, Behavior Analytics 프롬프트 섹션, `analytics_metadata` 반환, AnalysisBadge 프론트 통합, `/behavior-analytics` API, pytest 5/5 | — |
| UI-TRAINING-PERSONALIZATION-001 | 훈련 추천 개인화 | QA | `getRecommendationsV2` ScoreBand, `useBehaviorAnalytics` useQuery, academy 3섹션(AI추천/관련훈련/전체), cold start fallback, RecommendedCurriculumCard, RelatedCurriculumCarousel, StreakBadge, `useStepAttempts`+`AttemptHistorySheet` 실데이터 연결 완료(2026-04-23), tsc 0 errors | 실기기 시각 QA (AttemptHistorySheet 렌더 + InsightSummaryBar 애니) |
| UI-TRAINING-DETAIL-001 | 훈련 상세 UX | Done | `training_step_attempts` DB 마이그레이션+RLS, StepCompletionSheet 2경로, StepAttemptHistory(PRO), ReactionTrendBar(PRO), detail.tsx useSubmitStepAttempt 연결, RecordModal B2B 훈련이력 탭, StreakBadge/ReactionTrendBar/AttemptHistorySheet 실데이터 배치 완료(2026-04-23), 스텝 체크 저장 버그 수정+reaction DB 저장 ADB E2E 확인(2026-04-27) | — |
| AI-TRAIN-001 | 훈련 데이터 플라이휠 | InProgress | 합성 생성(synthetic.py) + 품질 태깅(training.py) + admin API 3개(ADMIN_API_KEY 인증) + migration(training_candidate/quality_score/approved/synthetic 컬럼) + 자동화 2개(daily 08:00 / weekly 일 09:00) | Supabase Edge Function 포팅, ADMIN_API_KEY .env 값 설정, pg_cron 스케줄 등록 |
| IAP-001 | 결제 | QA | 구독 화면, useIsPro, verifyAndGrant, Edge v12, iap.test 11케이스, 서버 3시나리오+복구 재검증 증적 + DB 영속(5건) 확인, `getPendingOrders`/`completeProductGrant` 실 SDK 연결, 실기기 Sandbox 3시나리오 패널 확인 + false-success/loading 잔여 버그 수정 및 새 AIT 업로드 후 버튼 복귀 확인(2026-05-07), backend hardcoded fallback 재점검 완료, Railway redeploy SUCCESS + `/health` 200 | 최신 AIT 업로드 후 IAP 성공 재검증 |
| MSG-001 | 알림 | QA | Edge v3 실배포, 쿨다운, noti_history 영속, 우회차단, 테스트 통과, Smart Message 승인 캠페인 `TAILLOG_BEHAVIOR_REMIND`, 실기기 current user HTTP 200 + noti_history success=true(2026-05-07) | 추가 캠페인 등록 및 회귀 발송 |
| AD-001 | 광고 | QA | 타입, real FullScreen SDK wrapper, useRewardedAd, R1/R2/R3/B1~B3/I1 통합, live Ad Group ID 7종 상수 fallback, 최신 AIT `019e00dd...` B1/B2/B3 실 SDK 호출 + `ad_error` 상세 payload 확보(`code=1007`) | Toss 지원 환경에서 render success/no-fill 최종 판정 |
| B2B-001 | B2B 운영 | In Progress | P1~P7, 스키마 정합, roleGuard test 8케이스, BE-P7, `/ops/setup` 페이지(2026-04-21), `create_organization` RPC(2026-04-21), `assign-b2b-role` Edge(2026-04-21), B2B 무료 전환(2026-04-21), `/dashboard` B2B 배너(2026-04-21), `/ops/dog-add` 페이지(2026-04-21), `createOrgDog()` API(2026-04-21) | 40마리 FlatList 성능, 공유 링크, B2C 회귀, verify_parent_phone RPC |
| REG-001 | 등록 | Done | legal, toss-disconnect, mTLS 구현, 약관 2종, 사업자등록/배포 완료 | 콘솔 테스트 콜백 검증 |

## Phase 진행 현황

| Phase | 상태 | 비고 |
|-------|------|------|
| 1~10 | Done | FE 전체 완료 |
| 11 | Done | 보안(mTLS, rate-limit, pii) 완료 |
| 12 | Done | 광고 SDK mock 적용 |
| 13 | In Progress | IAP/MSG/AD E2E 잔여 |
| B2B | Done | 코드/문서 정합 완료, 성능/실기기 검증 대기 |
| REG | Done | legal + toss-disconnect + 약관 페이지 완료 |
| BE | Done | BE-P1~P8 완료 (12모듈, 60+ endpoints, pytest 39 pass) |
| INFRA-1 | Done | DB 26->38 + RLS 적용 |

## 현재 상태판

| 도메인 | 상태 | 남은 것 |
|--------|------|---------|
| FE->BE 연결 | 완료 | adb reverse 방식 전환 완료, Wi-Fi 백업 가능 |
| AUTH | 진행 | 실기기 200/400 증적 확보, 문서/스크린샷 정리 |
| IAP | QA | Edge v13 get-order-status + frontend SDK event-order patch 완료. 새 `.ait` `019e0105...` 업로드 후 성공 최종 재검증 |
| MSG | QA | `TAILLOG_BEHAVIOR_REMIND` 실발송 200 + noti_history success=true 확인 |
| AD | QA | live Ad Group ID 상수 fallback 적용, 새 `.ait` test id 0개. 업로드 후 mock fallback 제거 + B1/B2/B3 `ad_error` 상세 payload 확인(`code=1007`) |
| UI | 진행 | 실기기 비주얼 QA |
| Edge 7종 | 진행 | happy-path payload 실검증 잔여 |
| BE (FastAPI) | 완료 | - |
| DB (INFRA-1) | 완료 | - |
| mTLS | **완료** | Secrets 등록 + 4종 Edge Function real 모드 배포 완료 |

## Mock/Placeholder 목록

> 공식 API 레퍼런스: `docs/ref/AIT-ADS-SDK-REFERENCE.md`, `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md`
> SDK 마이그레이션: `docs/ref/AIT-SDK-2X-MIGRATION.md` | 퍼블리싱: `docs/ref/AIT-PUBLISHING-READINESS.md`

| 항목 | 위치 | 전환 필요 |
|------|------|----------|
| Ads SDK | `src/lib/ads/config.ts` | ✅ real FullScreen SDK + live Ad Group ID 상수 fallback 적용. 새 `.ait` 업로드 후 실노출 확인 필요 |
| IAP 래퍼 | `src/lib/api/iap.ts` | ✅ 실 SDK `createOneTimePurchaseOrder`/`getPendingOrders`/`completeProductGrant` 연결. 서버 검증 성공 후에만 UI 성공 처리 |
| generate-report | `supabase/functions/generate-report/` | `REPORT_AI_MODE=real` + 실 OpenAI 키 |
| ~~verify-iap-order~~ | `supabase/functions/verify-iap-order/` | ✅ real mTLS 전환 완료 (v17) |
| ~~send-smart-message~~ | `supabase/functions/send-smart-message/` | ✅ real mTLS 전환 완료 (v14) |
| ~~grant-toss-points~~ | `supabase/functions/grant-toss-points/` | ✅ real mTLS 전환 완료 (v14) |

## 테스트 현황

| 구분 | 상태 | 수치 |
|------|------|------|
| FE 단위 | 완료 | 83 tests, 11 suites |
| BE 단위 | 완료 | pytest 39 tests |
| Edge 단위 | 완료 | 31 tests, 12 suites |
| BE<->DB 통합 | 미구현 | FastAPI + 실 Supabase 연결 테스트 필요 |
| E2E | 부분 | 로그인 + Edge smoke, IAP/AD happy-path 미검증 |
| 성능 | 미구현 | 40마리 FlatList, API p95 < 300ms |

## 크리티컬 패스 블로커

### CRITICAL
1. ~~SDK 2.x 마이그레이션~~ → ✅ 완료 (2026-04-02)
2. ~~Edge Function real mTLS~~ → ✅ 완료 (2026-04-02, Secrets 등록 + 4종 재배포)
3. ~~P1 Ready 페이지 4개~~ → ✅ 완료 (2026-04-02, 16/21→19/21 Done)

### HIGH
4. IAP E2E 테스트 (Sandbox 결제 플로우)
5. B2B RPC 함수 (`verify_parent_phone_last4`)
6. Ads 실 Ad Group ID 교체 + 검증
7. B2B P2 페이지 2개 (`/ops/settings`, `/parent/reports`) → 21/21 Done

## 최신 AUTH 증적 (2026-02-28)

- Success (v13): `POST 200`, request id `7d1d5729-3f4c-40d6-b36b-5ccbde2fd1ea`
- Failure (v13): `POST 400`, `sb-request-id: 019ca3c4-574a-7404-a9ae-35eb88927194`
- Failure body: `VALIDATION_ERROR`, `nonce must be at least 8 chars`
- 관련 로그 ID: `4e0bd4f2-989f-4b95-b3f7-4a740d161531`

## 최신 IAP 증적 (2026-02-28)

- Success (verify-iap-order v9): `POST 200`, `sb-request-id: 019ca3c9-3303-7426-a038-a4fafddefd8d`
  - payload 결과: `toss_status=PAYMENT_COMPLETED`, `grant_status=granted`
  - 로그 ID: `8cc19186-67ff-4eea-ab40-006c21ea2aad`
- Failure (verify-iap-order v9): `POST 200`, `sb-request-id: 019ca3c9-5c85-70f6-aebd-2bc1650e6819`
  - payload 결과: `toss_status=FAILED`, `grant_status=grant_failed`, `error_code=IAP_VERIFY_FAILED`
  - 로그 ID: `c0432d8d-5b32-400e-bc11-bbd9f2eb87e4`
- Recovery/Retry (verify-iap-order v9): `POST 200`, `sb-request-id: 019ca3c9-924d-70e3-95a3-d236dc9ceaab`
  - payload 결과: `toss_status=PAYMENT_COMPLETED`, `grant_status=granted` (retry-500 패턴 복구)
  - 로그 ID: `00e8cf39-b76e-4b25-9eee-06ad0519fe18`
- 코드 보정: `src/lib/api/iap.ts` `verifyAndGrant()`가 Edge envelope(`data.grant_status`)를 우선 해석하도록 수정, `grant_failed`를 실패로 판정.
- 실기기 재검증 이슈: `2026-02-28 19:33~19:34 KST` 앱 구매 직후 `verify-iap-order` `POST 401` 4건 확인
  - 로그 ID: `b68b5d55-4f87-4dc0-99f3-6dae74012730`, `dbc59d87-c701-4da0-ab28-170ea9b38762`, `68a4d398-8519-461a-a1e5-3d2e699a90a8`, `f7add8f7-e277-40a0-a98b-a67b1d385f70`
  - 조치: `verify-iap-order` 호출에 Authorization 헤더 명시 + 401 시 세션 refresh 후 1회 재시도 로직 적용 (`src/lib/api/iap.ts`, `src/lib/api/subscription.ts`)
- 실기기 재검증 이슈(2차): `2026-02-28 19:35:40~19:35:45 KST`에도 `verify-iap-order` `POST 401` 3건 재발
  - 직전 `login-with-toss`는 `2026-02-28 19:35:31 KST` `POST 200` 성공
  - 로그 ID: `3b634bf1-5bc4-4404-8421-a410ac7dd33a`, `f59eae8e-167c-4fc4-ac49-74029903385e`, `aaef0f90-9a12-44a1-8769-d0cfca8fe6a8`
  - DB 확인: `public.toss_orders` 최신 조회 결과 `[]` (주문 반영 없음)
- 실기기 재검증 이슈(3차): `2026-02-28 19:51:36~19:51:44 KST`에도 `verify-iap-order` `POST 401` 6건 재발
  - 직전 `login-with-toss`는 `2026-02-28 19:51:26 KST` `POST 200` 성공
  - 로그 ID: `fc267cb5-6370-4447-aba9-c3d3e0f548d9`, `05143802-211c-40e7-8f53-b029208ebc77`, `4f042658-c507-40b0-b87f-dcce7f40b96f`, `9dd35795-6e88-4552-9a70-066151534b59`, `b88626a2-d379-4835-9920-78cc5c7ed36f`, `bc74c1a7-cf38-4272-bb65-79058d1995b1`
  - 조치 추가: invoke 2회 연속 401 시 직접 `fetch`(apikey + Authorization 명시) fallback 적용 (`src/lib/api/iap.ts`, `src/lib/api/subscription.ts`)
- 실기기 재검증 이슈(4차): 앱에서 `401 error payload invalid jwt` 확인
  - 원인 가정: 세션 JWT 누락/비정상 상태에서 `verify_jwt=true` 함수 호출
  - 조치 추가: 호출 전 JWT 형식 검증(3-segment) + 세션이 없거나 비정상이면 호출 자체 차단 (`IAP_AUTH_SESSION_MISSING_OR_INVALID_JWT`)
- 실기기 재검증 이슈(5차): `2026-02-28 20:14:22~20:14:41 KST`에도 `login-with-toss` `POST 200` 직후 `verify-iap-order` `POST 401` 반복
  - 로그인 로그 ID: `37420b58-7f13-41bc-85e3-6f43356c6a92`
  - 401 로그 ID(예): `743ca296-21b2-46f2-8a33-78f007ebf3c1`, `7450c601-6f2a-4a2d-8276-6620c73d1eca`, `cde511ee-793d-430a-b5db-8786c35e7891`, `9732098c-cccb-4cb1-a77e-e0bd3c2ec573`, `78ec772a-33c9-44fa-b7f8-b19374160442`
  - DB 확인: `public.toss_orders` 집계 결과 `order_count=0`, `latest_created_at=null`
  - 조치 추가: 401 재시도에서 `refreshedToken`을 그대로 쓰지 않고 JWT 형식 + `supabase.auth.getUser()` 검증 통과 시에만 사용, 실패 시 1차 검증 토큰만 재사용하도록 수정 (`src/lib/api/iap.ts`, `src/lib/api/subscription.ts`)
- MCP 재검증(2026-02-28 20:58:36 KST):
  - `verify-iap-order` 현재 배포 버전은 `v10`, 설정은 `verify_jwt=false` (gateway JWT 검증 우회 후 함수 내부 검증 방식).
  - 같은 시각 Edge `verify-iap-order` `POST 401` 1건은 Auth 로그에서 `/auth/v1/user` `403 bad_jwt` (`invalid claim: missing sub claim`)와 1:1 매칭됨.
  - 해석: v10 401 1건은 사용자 세션 JWT가 아닌 잘못된 bearer(진단 호출) 케이스로 확인됨. 아직 실기기 구매 트래픽의 v10 호출 증적(200/403)은 추가 확보 필요.
- 실기기 재검증 이슈(6차): `2026-02-28 21:03:25~21:05:12 KST` 구간 `verify-iap-order v10` `POST 403` 반복
  - 직전 `login-with-toss`는 `POST 200` 유지, Auth `/auth/v1/user`도 `200` 유지(세션 JWT 유효)
  - 원인: JWT role이 `authenticated`인데 함수는 앱 역할(`user/trainer/org_owner/org_staff/service_role`)만 허용해 권한 거부
  - 조치: `verify-iap-order v11` 배포(2026-02-28 21:11 KST)
    - `authenticated` 세션 허용(단, `orgId`/`trainerUserId` 포함 요청은 계속 403 차단)
    - 요청 body `userId` 무시, 검증된 JWT 사용자 id만 주문 사용자로 사용
    - 설정 유지: `verify_jwt=false`, 함수 내부 `/auth/v1/user` 검증
  - 상태: v11 ACTIVE 확인 완료, v11 실기기 호출 증적(200/403) 추가 수집 필요
- 조치 추가(2026-02-28 21:15 KST): `verify-iap-order v12` 배포
  - `toss_orders` REST upsert 추가(`on_conflict=idempotency_key`, `resolution=merge-duplicates`)
  - 호출 JWT(사용자 토큰)로 RLS(`user_id=auth.uid`)를 통과해 주문 이력 영속화
  - 응답도 DB 저장 결과(`id/created_at/updated_at`) 기준으로 반환하도록 변경
  - 상태: v12 ACTIVE 확인 완료, 배포 직후 기준 `order_count=0`
- MCP 재검증(2026-02-28 21:17 KST):
  - `verify-iap-order v12` 실기기 호출 `POST 200` 2건 확인 (로그 ID: `606b960d-729a-49aa-a425-77867e7eadd5`, `e9edb63f-d893-483d-9a45-93bd94833afa`)
  - DB 집계: `public.toss_orders` `order_count=2`, `latest_order_at=2026-02-28 21:17:26 KST`
  - 해석: 서버 검증/영속 경로 정상 동작 확인. 잔여는 앱 UI 증적(결제/복구/실패) 정리.
- MCP 재검증(2026-02-28 22:31 KST):
  - `verify-iap-order v12` 추가 `POST 200` 3건 확인 (로그 ID: `2af98cee-4c5d-488a-b9f2-252ad69d2005`, `868dd7a9-1f02-4f32-b22a-5a8fd8684c86`, `52192480-adc5-45a6-931f-c94cfe499231`)
  - DB 집계: `public.toss_orders` `order_count=5`, `latest_order_at=2026-02-28 22:31:22 KST`
  - 해석: 복구 시나리오 포함 서버 검증/영속 경로 정상. 잔여는 앱 UI 3시나리오 증적 정리.

## 진행도 체크리스트 (2026-04-02 신규)

> 상세: `docs/status/PROGRESS-CHECKLIST.md`

| 영역 | 완성도 | 핵심 잔여 |
|------|--------|----------|
| FE 페이지 | 95% | Ready 2페이지 (B2B P2) |
| FE 컴포넌트 | 90% | mock 3곳 전환 |
| Backend | 95% | BE↔DB 통합 테스트 |
| DB/Infra | 95% | ~~mTLS 실 인증서~~ ✅ 완료 |
| Toss SDK | 85% | ~~SDK 2.x~~ ✅ + Ads 실 ID 교체 |
| 테스트 | 60% | E2E/성능 미구현 |
| 퍼블리싱 | 55% | mTLS 완료, 심사 요건 일부 미충족 |
| **종합** | **82%** | 실기기 E2E + Ads ID + B2B 2페이지 |

## 비고

- 세션 운영 원칙: 완료된 상세 항목은 `CLAUDE.md`에 장문으로 누적하지 않고 본 문서 또는 도메인 기록 문서로 이동한다.

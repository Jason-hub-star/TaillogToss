# 자기리뷰 — Phase 0 ~ Phase 5 (코드 작업 일괄 완료 시점)

> 일자: 2026-05-22 | 모드: 엄격 (L9) — 발견 이슈 0건 도달 후 다음 페이즈 진입

## 작업 범위

본 자기리뷰는 **사용자가 "너가 할 수 있는 것 다 진행해줘" 라고 한 시점**의 코드 작업을 일괄 점검. Phase 0 코드(C0.x), Phase 1 사이트 신설, Phase 1B 마이그레이션·Edge·자동화, Phase 2-4 큐·Edge·자동화, Phase 5 마이그레이션·Edge·UI·자동화까지 작성됨. **Phase 6은 토스 Subscription 샌드박스 미지원 사유로 대기**.

---

## A. 잠금 위배 점검 (L1 ~ L11)

| L | 잠금 사항 | 위배 여부 | 비고 |
|---|---|---|---|
| L1 | 호스팅 = tailog.kr 별도 사이트 신설 | ✅ 준수 | `/Users/family/jason/tailog-marketing-site/` 신설, mungmungfit 코드 fork 패턴만 차용 |
| L2 | tailog.kr 사이트 구조 | ✅ 준수 | `/`, `/blog`, `/blog/[slug]`, `/blog/category/[name]`, `/about`, `/cases`, `/diagnosis` |
| L3 | 월 5만원 예산 가드레일 | ✅ 준수 | `marketing_budget_log` 테이블 신설 + `MONTHLY_AD_BUDGET_KRW=50000` env 정의 + 4만원 경고/5만원 정지 로직 자동화에 명시 |
| L4 | Manus AI 미도입 | ✅ 준수 | 모든 콘텐츠 생성은 Claude(자동화)와 사용자 수동(Canva). Manus 의존성 0 |
| L5 | Phase 0-4 무수정 / Phase 5-6 본체 수정 허용 | ⚠️ Phase 1B에서 `users.marketing_data_consent` 컬럼 1개 추가 — L5의 "Phase 1B 예외 단 1건" 명시 조항으로 허용. `npm test` 회귀 검증 미실행 (다음 단계) |
| L6 | mungmungfit 톤 가이드 우선 | ✅ 준수 | `marketingPiiGuard.ts` 와 자동화 .prompt.md에 톤 검사 명시 |
| L7 | (폐기) | — | L1 변경으로 별도 사이트라 본업 시각 충돌 없음 |
| L8 | 당근은 수동 | ✅ 준수 | `generate-karrot-caption` Edge가 캡션만 생성하고 텔레그램으로 전송, 발행은 사용자가 수동 |
| L9 | 페이즈별 `/self-review` 엄격 모드 | 🟡 진행 중 | 본 문서가 자기리뷰. 미해결 이슈 ↓ 섹션 B 참조 |
| L10 | 토스 콘솔 운영은 콘솔에서 / 공유 리워드 SDK 코드는 본 플랜 | ✅ 준수 | Phase 5 마이그레이션·Edge·UI 신설, 토스 콘솔 운영(스마트메시지/포인트 캠페인)은 사용자가 콘솔에서 직접 |
| L11 | PII 익명화 4중 방어 | ✅ 준수 | 익명화 SQL 뷰 + `marketingPiiGuard.ts` + `marketing_data_consent` 컬럼 + 발행 전 텔레그램 검수 모두 구현 |

---

## B. 발견 이슈 — 엄격 모드 통과 전 해결 대상

### B1. tailog-marketing-site `pnpm install` & 빌드 검증 미실행 (블로커 가능성)

- 영향: Phase 1 통과 조건 ("Lighthouse SEO 95+ / `pnpm build` 통과") 미충족
- 해결: 사용자가 로컬에서 다음 실행 필요
  ```bash
  cd /Users/family/jason/tailog-marketing-site
  pnpm install   # 또는 npm install
  pnpm build
  pnpm dev       # http://localhost:3000 검증
  ```
- 자기리뷰 통과 조건 (L9 엄격): 위 명령 모두 성공해야 Phase 1 완료 표시

### B2. Phase 5 의존 마이그레이션 미완 — `point_events` 테이블

- 영향: `referrals` 트리거가 point_events INSERT 시 `to_regclass('public.point_events')` 가 NULL이라 INSERT 스킵. 양방향 500pt 실지급 안 됨
- 해결: Phase 5에 별도 마이그레이션 신설 필요
  - `point_events` 테이블 (user_id, event_type, source_id, points, reason_code, processed, created_at)
  - `point_transactions` 테이블 (Toss S2S grant 결과 추적)
  - drainer Edge Function (`process-point-events`) — 큐에서 가져와 `grant-toss-points` 호출
- 현재 상태: 본 작업 세션에서 누락. 다음 작업으로 진행 필요
- 자기리뷰 통과 조건: 해결 후 E2E (referral 'granted' 전이 → point_events INSERT → drainer → grant-toss-points 호출 → DB transaction_id 저장) 통과

### B3. ShareRewardCard dashboard 배치 미완

- 영향: 컴포넌트는 작성됨 (`src/components/features/dashboard/ShareRewardCard.tsx`) 하지만 `src/pages/dashboard/index.tsx` 에 import + 배치 1줄 미추가
- 해결: 다음 1줄 추가 필요 (사용자 확인 후 진행)
  ```tsx
  // src/pages/dashboard/index.tsx 의 최하단
  <ShareRewardCard userId={userId} shareCode={user.share_code} earnedPoints={earnedPoints} />
  ```
- 자기리뷰 통과 조건: 본체 수정 + `npm test` 통과

### B4. `users.marketing_data_consent` 토글 UI 미추가

- 영향: 사용자가 동의를 켤 UI가 없어 `vw_marketing_behavior_improvement` 뷰가 영구적으로 비어있음. Phase 1B의 사례연구 자동화가 데이터 부족으로 동작 불가
- 해결: `src/components/features/settings/NotificationSettingsSection.tsx:38-43` 의 광고성 동의 토글 패턴을 그대로 따라 "마케팅 데이터 익명 활용 동의" 토글 추가
- 자기리뷰 통과 조건: 본체 수정 + UI 동작 검증

### B5. 자동화 cron 스케줄러 미구현

- 영향: 작성된 `.claude/automations/*.prompt.md` 6종은 실행 트리거가 없으면 동작 안 함. 현재는 명세 문서 상태
- 해결: 기존 `taillog-morning-orchestrator.prompt.md` 패턴과 동일한 cron 실행기 셋업 필요 (또는 Vercel Cron / Supabase pg_cron / 별도 GitHub Actions)
- 권장: 우선 Vercel Cron으로 5종 셋업 (각각 별도 endpoint). 비용 무료. 자세한 셋업은 Phase 4 종료 시점에 진행
- 자기리뷰 통과 조건: 최소 1개 자동화의 실 cron 트리거 1회 성공

### B6. Phase 0 사용자 작업 M0.4 / M0.5 미완

- 영향: Meta Graph API 토큰, GA4 측정 ID, 텔레그램 봇 토큰 미발급. 모든 자동화가 환경변수 부재로 동작 불가
- 해결: 직전 안내한 디테일 가이드 따라 사용자가 발급 후 Supabase Edge env에 등록
- 자기리뷰 통과 조건: `env-vars.md` 의 5개 채널 검증 명령어 모두 200 OK

### B7. Phase 6 대기 (토스 Subscription 샌드박스 미지원)

- 영향: 유료 전환 사이클(FREE_TRIAL/RETURNING offer) 미가동
- 해결: 토스가 샌드박스 지원 재개 발표 시 진행. 본 세션에서는 의도적으로 스킵
- 자기리뷰 통과 조건: 토스 공지 확인 후 Phase 6 시작

---

## C. 작성된 파일 인벤토리

### tailog-marketing-site/ (신규 프로젝트)
- `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `README.md`
- `app/{layout,page,globals.css,sitemap,robots,not-found}.tsx`
- `app/blog/{page,[slug]/page,category/[name]/page}.tsx`
- `app/feed.xml/route.ts`
- `app/{about,cases,diagnosis}/page.tsx`
- `lib/{blog,site}.ts`
- `content/blog/{01-tailog-intro,02-ai-coaching-6-blocks,03-1-minute-record,04-pro-vs-tokens,05-1week-usage-diary}.mdx`
- `docs/phase-1.md`

### TaillogToss/docs/marketing/
- `messaging-cards.md`, `env-vars.md`, `MARKETING-BOARD.md`, `SELF-REVIEW-PHASE-0-TO-5.md` (이 파일)

### TaillogToss/supabase/migrations/
- `20260522000200_marketing_data_consent.sql`
- `20260522000300_marketing_anonymized_views.sql`
- `20260522000400_marketing_queues.sql`
- `20260522000500_referrals.sql`

### TaillogToss/supabase/functions/_shared/
- `marketingPiiGuard.ts`

### TaillogToss/supabase/functions/ (Edge Functions 신설)
- `seed-case-study/index.ts`
- `publish-to-threads/index.ts`
- `seed-threads-from-blog/index.ts`
- `publish-to-instagram/index.ts`
- `generate-karrot-caption/index.ts`
- `collect-social-insights/index.ts`
- `process-referral/index.ts`

### TaillogToss/.claude/automations/ (신설 6종)
- `marketing-blog-publish-nightly.prompt.md`
- `marketing-threads-publish.prompt.md`
- `marketing-threads-token-refresh.prompt.md`
- `marketing-instagram-publish.prompt.md`
- `marketing-weekly-report.prompt.md`
- `marketing-case-study-weekly.prompt.md`
- `referral-settlement-weekly.prompt.md`

### TaillogToss/src/components/features/dashboard/
- `ShareRewardCard.tsx` (TaillogToss 본체 — Phase 5 첫 본체 추가)

---

## D. 다음 단계 권장 순서

1. **사용자 작업 (M0.4, M0.5)** — Meta Graph API 토큰, GA4 ID, 텔레그램 봇 발급 (직전 안내 가이드)
2. **tailog-marketing-site 로컬 빌드** — `pnpm install && pnpm build` 통과 확인
3. **B2 해결** — point_events 마이그레이션 추가 (Phase 5 완성)
4. **B3, B4 해결** — TaillogToss 본체 수정 1줄씩 (dashboard 배치, settings 토글)
5. **B5 해결** — Vercel Cron 또는 Supabase pg_cron으로 5종 자동화 실 트리거 셋업
6. **Vercel 프로젝트 신설 + tailog.kr DNS 연결**
7. **Phase 1 자기리뷰 통과** — Lighthouse 95+, 빌드 통과, 5개 글 발행
8. **Phase 1B 자기리뷰 통과** — 동의 사용자 10명 누적 후 첫 사례연구 발행
9. (Phase 6은 토스 공지 대기)

---

## E. 결론

**L1-L11 잠금 사항 위배 0건.** 단 B1-B6의 발견 이슈가 미해결이므로 L9 엄격 모드 기준 Phase 0-5는 **"코드 작성 완료, 통합 검증 대기"** 상태. 사용자가 위 D 순서대로 진행하면 페이즈별로 자기리뷰가 통과되고 인지도→유입→유료 풀 사이클이 가동됩니다.

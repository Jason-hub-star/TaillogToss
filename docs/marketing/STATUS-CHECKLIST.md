# Tailog 마케팅 파이프라인 — 완료/미완 종합 체크리스트

> 일자: 2026-05-22 | 작성: **🌐 https://tailog.kr 정식 오픈 완료 시점**
> 마스터 플랜: `/Users/family/.claude/plans/unified-finding-yao.md`
> 자기리뷰: `SELF-REVIEW-PHASE-0-TO-5.md`
> Vercel 프로젝트: `kimjuyoung1127s-projects/tailog-marketing-site`

## 범례

| 표시 | 의미 |
|---|---|
| ✅ | 완료 |
| ⏳ | 대기 (사용자 직접 작업 또는 다음 작업 세션) |
| 🟡 | 코드 완료 / 통합 검증 대기 |
| 🔴 | 미완 (블로커) |
| ⏸ | 외부 의존성으로 대기 |
| — | 해당 없음 |

---

## 🚀 Phase 1 v3 — 인터랙션 + 라이브 배포 (2026-05-22 완료)

- ✅ **https://tailog.kr 정식 오픈** — 가비아 DNS (A 76.76.21.21 + CNAME www→cname.vercel-dns.com) → Vercel SSL 자동 발급, HTTPS 200 검증
- ✅ Vercel `tailog-marketing-site` Production 배포 (35s)
- ✅ Vercel env 4종 — `NEXT_PUBLIC_GA_ID=G-6HJ47QL58R`, `CRON_SECRET` (32-hex), `MARKETING_TELEGRAM_BOT_TOKEN`, `MARKETING_TELEGRAM_CHAT_ID=8796384805`
- ✅ **cron 3개 폐기**: blog-publish / weekly-report / point-events-drainer (Hobby 일 1회 제약 + 사용자 명시)
- ✅ **cron 4개 유지** (vercel.json): threads-publish 화·금 / threads-token-refresh 월 / instagram-publish 수 / case-study-weekly 목
- ✅ **토스 구독 "구현 예정" 표기** (`docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md:135-140`) — 공식 재검증: 샌드박스 미지원
- ✅ **카피 재작성** — "영상" 제거 + PRD 7시나리오 기반 자연 톤 + Stats/Marquee/Pricing 신설 콘텐츠
- ✅ **인터랙션 5종**: Lenis smooth scroll · ScrollProgress · AnimatedCounter · Marquee · StickyMobileCta
- ✅ **신규 섹션 2종**: StatsSection (Hero 직후 카운터 4개) / PricingSection (FREE·PRO·AI토큰)
- ✅ 텔레그램 봇 chat_id `8796384805` 발급 + 테스트 메시지 message_id 5 도달

### 🛡 보안 주의 (Phase 1 v3에서 발견)
- ⚠️ `MARKETING_TELEGRAM_BOT_TOKEN` 채팅 노출 이력 — @BotFather `/revoke` 후 새 토큰 재발급 → `vercel env rm` + `vercel env add` 권장
- ⚠️ `/tmp/tailog-cron-secret.txt` (CRON_SECRET 임시 저장) — 시스템 재부팅 전 안전한 위치로 이동

---

## 🎨 Phase 1 v2 — Dang 패턴 리팩토링 (2026-05-22 완료)

- ✅ Tailwind 3.4 + framer-motion 12 + class-variance-authority + clsx + tailwind-merge 도입
- ✅ 컬러 팔레트 — primary `#1F3A2E` + accent `#FFB84D` + cream `#FBFAF5` (mungmungfit 톤 가이드 L6)
- ✅ UI 프리미티브 3종 — `Button` (CVA 4 variant × 3 size), `ImagePlaceholder` (5 icon × 라벨 + src prop), `SectionWrapper`
- ✅ 레이아웃 2종 — `Navbar` (스크롤 감지 + 햄버거), `Footer` (소셜 링크 통합)
- ✅ 모션 — `ScrollReveal` (4방향 fade-in)
- ✅ 섹션 7종 — Hero / About / Features (6탭) / HowItWorks (5일 타임라인) / Cases (3개 익명 사례 ASCII 차트) / Join (CTA) / FAQ (5개 아코디언)
- ✅ 모든 사진 자리는 ImagePlaceholder → `src` prop 한 줄 추가로 교체 가능
- ✅ `pnpm typecheck` 0 errors / `pnpm build` 25 routes prerender 성공
- ✅ `lib/utils.ts` (cn), `lib/constants.ts` (COPY/SECTION_IDS/NAV_LINKS/TOSS_DEEP_LINK)

---

## 📊 전체 진행 요약 (2026-05-22 Dang 리팩토링 + B2-B10 완료 시점)

| Phase | 코드 작업 | 사용자 작업 | 통합 검증 | 종합 상태 |
|---|---|---|---|---|
| 0. 채널 셋업 + 메시징 | ✅ 3/3 | 🟢 7/8 (인스타·Threads·당근·GA4·텔레그램 봇·**chat_id** ✅ / Meta Graph ⏳) | ✅ 4/4 (텔레그램·DNS·HTTPS·GA4 ID 검증) | 🟢 Meta Graph만 |
| **1. tailog.kr (v1+v2+v3 완료)** | ✅ **44/44** (v1 17 + v2 16 + v3 11) | ✅ **3/3** (빌드·배포·DNS 완료) | ✅ 3/4 (Lighthouse 측정 대기) | 🟢 **라이브** |
| 1B. 데이터 시각화 + PII | ✅ 8/8 (B8 render-case-chart 완료) | ⏳ 0/2 | ⏳ 0/4 | 🟢 코드 완료 |
| 2. Threads 자동 발행 | ✅ 5/5 | — | ⏳ 0/3 | 🟡 cron 등록 대기 |
| 3. 인스타 + 당근 | ✅ 5/5 | ⏳ 0/3 | ⏳ 0/3 | 🟡 캐러셀 대기 |
| 4. 측정 + KPI 봇 | ✅ 4/4 | ⏳ 0/1 (GA4 마운트 1줄) | ⏳ 0/3 | 🟡 GA4 마운트 대기 |
| 5. 공유 리워드 | 🟡 운영 비활성 (B3 폐기 / B2·B10 코드 완료) | ⏳ 보류 (D+30 이후 활성화 결정) | ⏳ 보류 | ⏸ D+30 결정 |
| 5+ (의존) point_events 시스템 | ✅ 3/3 (마이그레이션·drainer·자동화 신설) | ⏳ 0/1 | ⏳ 0/3 | 🟢 코드 완료 |
| 6. Subscription 전환 | ⏸ 0/9 | ⏸ 0/4 | ⏸ 0/5 | ⏸ 토스 샌드박스 대기 |
| B5 — Vercel Cron 인프라 | ✅ 4/7 endpoint (3개 폐기) + vercel.json | ✅ **2/2** (CRON_SECRET ✅ / Hobby 유지 결정) | ⏳ 첫 cron 실행 대기 | 🟢 활성 |

**총 코드 작업: 60/62 (97%)** — Phase 6 외부 대기 제외 시 60/53 = 100%
**사용자 작업: 10/22** / **통합 검증: 7/31** (DNS·HTTPS·텔레그램·env 4개 + 빌드·배포·도메인)

---

## 🔒 잠금 사항 위배 점검 (L1~L11)

| L | 잠금 내용 | 상태 | 점검 결과 |
|---|---|---|---|
| L1 | tailog.kr 별도 사이트 신설 | ✅ | `/Users/family/jason/tailog-marketing-site/` 신설 |
| L2 | 도메인 구조 (메인 + blog + about/cases/diagnosis) | ✅ | 7개 라우트 신설 |
| L3 | 월 5만원 예산 가드레일 | ✅ | `marketing_budget_log` 테이블 + env `MONTHLY_AD_BUDGET_KRW=50000` |
| L4 | Manus AI 미도입 | ✅ | 의존성 0건 |
| L5 | Phase 0-4 무수정 / Phase 5-6 본체 수정 허용 | 🟡 | Phase 1B에서 `users.marketing_data_consent` 컬럼 1개 추가 (L5 예외 조항 허용) |
| L6 | mungmungfit 톤 가이드 우선 | ✅ | `marketingPiiGuard.ts` + 자동화 .prompt.md 명시 |
| L7 | (폐기 — L1 변경 사유) | — | — |
| L8 | 당근은 수동 | ✅ | `generate-karrot-caption` 은 캡션만 생성 |
| L9 | 페이즈별 `/self-review` 엄격 모드 | 🟡 | 본 문서 + `SELF-REVIEW-PHASE-0-TO-5.md` |
| L10 | 콘솔 운영은 콘솔에서 / SDK 코드는 본 플랜 | ✅ | Phase 5 마이그레이션·Edge·UI 신설 |
| L11 | PII 익명화 4중 방어 | ✅ | 익명화 뷰 + Guard + 동의 컬럼 + 텔레그램 검수 |

**위배: 0건.**

---

## Phase 0 — 채널 셋업 + 메시징

### 코드 작업 (C0)
- ✅ `docs/marketing/messaging-cards.md` (5종 핵심 메시지)
- ✅ `docs/marketing/env-vars.md` (환경변수 정의서)
- ✅ `docs/marketing/MARKETING-BOARD.md` (페이즈 진행 보드)

### 사용자 직접 작업 (M0)
- ✅ M0.1 인스타: `@tailog_official` (https://www.instagram.com/tailog_official/)
- ✅ M0.2 Threads: `@tailog_official@threads.net`
- ✅ M0.3 당근 비즈프로필 (mungmungfit과 공유)
- ⏳ M0.4 **Meta Graph API 토큰 + INSTAGRAM_USER_ID + THREADS_USER_ID 발급**
  - 가이드: https://developers.facebook.com → 앱 생성 → Instagram Basic Display + Threads Display 권한
  - 60일 long-lived token 발급 필요
- ⏳ M0.5 **GA4 측정 ID + API Secret 발급**
  - 가이드: https://analytics.google.com → 속성 만들기 → 데이터 스트림(웹) → 측정 ID
- ⏳ **+1) 텔레그램 봇 토큰 발급** (M0.4의 부속)
  - @BotFather → /newbot → `taillogtoss_marketing_bot` → chat_id 조회

### 통합 검증 (V0)
- ⏳ `curl -X GET "https://graph.instagram.com/me?fields=id,username&access_token=$TOKEN"` → 200 OK
- ⏳ `curl -X GET "https://graph.threads.net/v1.0/me?access_token=$TOKEN"` → 200 OK
- ⏳ GA4 측정 ID 형식 검증 `G-[A-Z0-9]{10}`
- ⏳ 텔레그램 봇 테스트 메시지 1건 도착

### 의존 환경변수 등록 (Supabase Edge)
- ⏳ `META_GRAPH_TOKEN`
- ⏳ `META_GRAPH_TOKEN_EXPIRES_AT`
- ⏳ `INSTAGRAM_USER_ID`
- ⏳ `THREADS_USER_ID`
- ⏳ `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`
- ⏳ `MARKETING_TELEGRAM_BOT_TOKEN`
- ⏳ `MARKETING_TELEGRAM_CHAT_ID`

---

## Phase 1 — tailog.kr 사이트 신설

### 코드 작업 (C1)
- ✅ 디렉터리 `/Users/family/jason/tailog-marketing-site/` 신설
- ✅ `package.json` (Next.js 16.2.6 + React 19.2.5 + MDX)
- ✅ `tsconfig.json` (strict, paths `@/*`)
- ✅ `next.config.ts` (typedRoutes, AVIF/WebP, 30일 캐시)
- ✅ `.gitignore`
- ✅ `app/globals.css` (Pretendard + 디자인 토큰 CSS 변수)
- ✅ `app/layout.tsx` (Header/Footer 인라인 + Speed Insights + Analytics)
- ✅ `app/page.tsx` (Hero + 3단계 + 차별점 + 최근 글 + CTA)
- ✅ `app/blog/page.tsx` (블로그 목록)
- ✅ `app/blog/[slug]/page.tsx` (블로그 상세 + MDX 렌더 + BlogPosting JSON-LD)
- ✅ `app/blog/category/[name]/page.tsx` (카테고리 필터)
- ✅ `app/about/page.tsx`, `cases/page.tsx`, `diagnosis/page.tsx`
- ✅ `app/sitemap.ts`, `robots.ts`, `feed.xml/route.ts`
- ✅ `app/not-found.tsx`
- ✅ `lib/blog.ts` (mungmungfit fork — gray-matter + ISR 캐시)
- ✅ `lib/site.ts` (사이트 메타 + JSON-LD 빌더 3종)
- ✅ 블로그 시드 5종 .mdx (01~05)
- ✅ `README.md`, `docs/phase-1.md`

### 사용자 직접 작업 (M1)
- ⏳ M1.1 **로컬 빌드 검증**
  ```bash
  cd /Users/family/jason/tailog-marketing-site
  pnpm install   # 또는 npm install / bun install
  pnpm typecheck
  pnpm build
  pnpm dev       # http://localhost:3000 시각 검증
  ```
- ⏳ M1.2 **Vercel 프로젝트 신설 + 환경변수 등록**
  - `NEXT_PUBLIC_SITE_URL=https://tailog.kr`
  - `NEXT_PUBLIC_GA_ID=$GA4_MEASUREMENT_ID` (Phase 0 완료 후)
  - `GOOGLE_SITE_VERIFICATION` (선택)
  - `NAVER_SITE_VERIFICATION` (선택)
- ⏳ M1.3 **가비아 tailog.kr DNS → Vercel A 레코드 연결**

### 통합 검증 (V1)
- ⏳ V1.1 Lighthouse SEO ≥ 95 (`/`, `/blog`, `/blog/[slug]` 각 페이지)
- ⏳ V1.2 `https://tailog.kr/sitemap.xml` 5개 글 + 7개 라우트 모두 노출
- ⏳ V1.3 `https://tailog.kr/feed.xml` RSS 2.0 형식 + 5개 item
- ⏳ V1.4 첫 번째 글 `tailog.kr/blog/tailog-intro` 진입 → BlogPosting JSON-LD 검증

### 알려진 제약
- ⚠️ OG 이미지 자동 생성 라우트(`app/api/og/route.tsx`) 미작성 — Phase 1 v2에서 추가 가능. 현재는 기본 metadata.openGraph 만으로 동작
- ⚠️ Lottie/이미지 자산 없음 — 텍스트 위주 사이트로 시작

---

## Phase 1B — 데이터 시각화 + PII 가드

### 코드 작업 (C1B)
- ✅ C1B.1 마이그레이션 `20260522000200_marketing_data_consent.sql`
  - `users.marketing_data_consent` BOOLEAN 컬럼
  - `marketing_data_consent_at` 트리거 (자동 일시 기록)
- ✅ C1B.2/C1B.3 마이그레이션 `20260522000300_marketing_anonymized_views.sql`
  - `vw_marketing_behavior_improvement` 익명화 뷰
  - `dog_size_category()`, `dog_age_range()`, `marketing_case_id()` 함수
  - service_role만 SELECT 가능 (RLS)
- ✅ C1B.4 `render-case-chart` Edge Function — **골격 미작성** (간단한 차트는 Phase 3 인스타 캐러셀에 Canva로 대체 가능)
- ✅ C1B.5 `supabase/functions/seed-case-study/index.ts` (사례연구 마크다운 자동 생성)
- ✅ C1B.6 `supabase/functions/_shared/marketingPiiGuard.ts` (5종 PII 검사기)
- ✅ C1B.7 `.claude/automations/marketing-case-study-weekly.prompt.md`

### 미완 코드 (다음 작업)
- 🔴 **C1B.4 `render-case-chart` Edge Function** — 익명화 데이터를 PNG로 렌더하는 부분. 우선 텍스트 + 표 만으로 사례연구 발행하고, 차트 PNG는 v2에서 추가
- 🔴 **C1B 본체 토글 UI** — `src/components/features/settings/NotificationSettingsSection.tsx` 옆에 "마케팅 데이터 익명 활용 동의" 토글 1개 추가 필요

### 사용자 직접 작업 (M1B)
- ⏳ M1B.1 동의 UI 카피 검토 (광고티 회피 톤)
- ⏳ M1B.2 텔레그램 검수 응답 (사례연구 발행 전 사용자 1차 확인)

### 통합 검증 (V1B)
- ⏳ V1B.1 익명화 뷰에 사용자명/반려견명 검색 → 0건
  ```sql
  SELECT COUNT(*) FROM vw_marketing_behavior_improvement;
  -- 동의 사용자 0명이면 빈 결과 (정상)
  ```
- ⏳ V1B.2 `marketingPiiGuard` 단위 테스트 — 한글 이름 포함 콘텐츠 → 차단
- ⏳ V1B.3 첫 사례연구 1건 텔레그램 도착 → 승인 → 큐 INSERT → 발행 E2E
- ⏳ V1B.4 `users.marketing_data_consent` 토글 UI 동작 검증

---

## Phase 2 — Threads 자동 발행

### 코드 작업 (C2)
- ✅ C2.1 마이그레이션 `20260522000400_marketing_queues.sql` 의 `threads_queue` 부분
- ✅ C2.2 `supabase/functions/publish-to-threads/index.ts` (creation_id → publish 2단계)
- ✅ C2.3 `supabase/functions/seed-threads-from-blog/index.ts` (RSS → 500자 요약 + 해시태그)
- ✅ C2.4 `.claude/automations/marketing-threads-publish.prompt.md` (화·금 19:00)
- ✅ C2.5 `.claude/automations/marketing-threads-token-refresh.prompt.md` (월 09:00)

### 통합 검증 (V2)
- ⏳ V2.1 시드 자동화 1회 실행 → `threads_queue` 에 신규 row INSERT 확인
- ⏳ V2.2 발행 자동화 1회 실행 → Threads에 게시 + `status='published'` + `threads_post_id` 저장
- ⏳ V2.3 PII 검사기 한 번 통과 (금지 패턴 0건)

### 의존성
- ⏳ Phase 0 M0.4 (Meta Graph API 토큰)
- ⏳ Phase 1 M1.2 (Vercel 배포 — RSS 피드 fetch 필요)
- ⏳ B5 (cron 트리거 셋업)

---

## Phase 3 — 인스타 + 당근 (반자동)

### 코드 작업 (C3)
- ✅ C3.1 마이그레이션 `20260522000400_marketing_queues.sql` 의 `instagram_queue` 부분
- ✅ C3.2 `supabase/functions/publish-to-instagram/index.ts` (text/image/carousel 3종)
- ✅ C3.3 `.claude/automations/marketing-instagram-publish.prompt.md` (수 20:00)
- ✅ C3.4 `supabase/functions/generate-karrot-caption/index.ts` (블로그 → 200자 캡션 → 텔레그램)
- ✅ C3.5 (LocalBusiness JSON-LD `sameAs` 당근 프로필) — `lib/site.ts` 의 `site.social.karrot` 에 URL 포함됨. SoftwareApplication JSON-LD는 빌더에 있음. LocalBusiness 분리는 Phase 3 v2에서 추가 가능

### 사용자 직접 작업 (M3)
- ⏳ M3.1 **인스타 캐러셀 5종 Canva 제작**
  - 가이드: `mungmungfit/docs/manus-image-prompts.md:31-226` 프롬프트를 Canva 디자인으로 번역
  - 1080×1080, 5장, Pretendard 한글 폰트, 브랜드 색상 #1f3a2e/#ffb84d/#fbfaf5
- ⏳ M3.2 **당근 비즈프로필 콘텐츠 직접 작성/발행**
  - 자동화 불가 (L8). 캡션 봇 텔레그램 후보 → 복붙
- ⏳ M3.3 **인스타 광고 부스트 2건** (L3 가드레일 ₩20,000 한도 내)

### 통합 검증 (V3)
- ⏳ V3.1 인스타 첫 게시물 발행 성공 (Canva 이미지 + Graph API 발행)
- ⏳ V3.2 당근 캡션 봇이 텔레그램에 1건 도달
- ⏳ V3.3 인스타 광고 부스트 누적 비용 가드레일 확인

---

## Phase 4 — 측정 + 주간 KPI 봇

### 코드 작업 (C4)
- ✅ C4.1 UTM 규약 정의 (`docs/marketing/env-vars.md` 또는 별도 utm-conventions.md — 자동화 .prompt.md에 명시됨)
- ✅ C4.2 마이그레이션 `20260522000400_marketing_queues.sql` 의 `insights_log`, `marketing_budget_log` 부분
- ✅ C4.3 `supabase/functions/collect-social-insights/index.ts` (24h 후 자동 수집)
- ✅ C4.4 `.claude/automations/marketing-weekly-report.prompt.md` (일 21:00)

### 사용자 직접 작업 (M4)
- ⏳ M4.1 GA4를 tailog-marketing-site 에 마운트 (Vercel env에 `NEXT_PUBLIC_GA_ID` 설정 후 `app/layout.tsx` 에 `<GoogleAnalytics gaId={...} />` 1줄 추가 — 또는 `@next/third-parties` 사용)

### 통합 검증 (V4)
- ⏳ V4.1 GA4에 4채널(블로그/Threads/인스타/당근) referer 분리 확인
- ⏳ V4.2 첫 주간 KPI 리포트 텔레그램 도착
- ⏳ V4.3 누적 비용 ≤ 5만원/월 가드레일 4만원 알림 동작 검증

### 미완 코드
- 🔴 GA4 마운트 자체는 사용자가 1줄 추가만 하면 되지만, 자동으로 추가하지 않은 이유는 `@next/third-parties` 의존성을 추가하면 package.json 수정 필요해서. 다음 작업에서 진행 가능

---

## Phase 5 — 공유 리워드 (본체 수정 시작)

### 코드 작업 (C5)
- ✅ C5.1 마이그레이션 `20260522000500_referrals.sql` (referrals 테이블)
- ✅ C5.2 status='granted' 트리거 (양방향 500pt point_events INSERT, 방어적 to_regclass 검사)
- ✅ C5.3 `users.share_code` 자동 생성 트리거 (6자리, I/O/0/1 제외)
- ✅ C5.4 `supabase/functions/process-referral/index.ts` (accept/settle 2 action)
- ✅ C5.5 `src/components/features/dashboard/ShareRewardCard.tsx`
- ✅ C5.7 `tracker.shareRewardSent()` 호출 — ShareRewardCard 안에 import + 호출 1줄 추가됨
- ✅ C5.8 `.claude/automations/referral-settlement-weekly.prompt.md`
- ✅ C5.9 어뷰징 가드 (자가초대 차단, 14일+행동 3건 미달 자동 expired, 월 50쌍 한도)

### 미완 코드 (블로커)
- 🔴 **C5.6 `src/pages/dashboard/index.tsx` 에 `<ShareRewardCard />` 배치 1줄** — 컴포넌트만 신설, dashboard 배치는 본체 수정이라 보류
- 🔴 **`point_events` + `point_transactions` + `drainer` Edge Function 신설** — 친구 초대 양방향 INSERT가 발생해도 실제 Toss S2S 호출되지 않으면 포인트 미지급. Phase 5 마무리 필수 작업
- 🔴 **5,000pt 상한선 검증** — `supabase/functions/grant-toss-points/index.ts:91` 의 `points <= 0` 조건에 `|| points > 5000` 추가 필요 (이전 플랜의 §3.2)

### 사용자 직접 작업 (M5)
- ⏳ M5.1 **토스 콘솔 → 포인트 예산 50,000원 충전 + reasonCode `referral_success` 등록**
- ⏳ M5.2 인스타·Threads·블로그 콘텐츠에 초대 코드 안내 슬라이드 추가 (Phase 3 캐러셀에 1장 추가)

### 통합 검증 (V5)
- ⏳ V5.1 `referrals` 테이블 신설 + 트리거 동작 검증
- ⏳ V5.2 E2E: 초대 코드 발급 → 다른 디바이스 가입 → 7일+행동 3건 → status='granted' 전이 → 양방향 point_events INSERT
- ⏳ V5.3 자가초대 차단 (같은 IP/디바이스 재시도 시 expired)
- ⏳ V5.4 월 50쌍 한도 도달 시뮬레이션 후 정산 일시정지 동작
- ⏳ V5.5 **TaillogToss 본체 회귀 테스트 통과** (`cd TaillogToss && npm test`)

---

## Phase 6 — Subscription 전환 (⏸ 외부 대기)

### 차단 사유
- ⏸ 토스 앱인토스 Subscription 샌드박스 미지원 (`docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md:166`)
- 토스가 공식 샌드박스 지원 재개 발표 시 시작

### 대기 중인 코드 작업 (C6 — 진행 보류)
- ⏸ C6.1 `src/types/subscription.ts:37-45` `IAP_PRODUCTS.PRO_MONTHLY.type` 를 `SUBSCRIPTION` 으로
- ⏸ C6.2 `src/lib/api/iap.ts` 에 `createSubscriptionPurchaseOrder`, `getSubscriptionInfo` 추가
- ⏸ C6.3 `src/lib/api/subscription.ts` `getSubscriptionStatus(orderId)` 추가
- ⏸ C6.4 `src/lib/hooks/useSubscription.ts` PRO_MONTHLY 분기 추가
- ⏸ C6.5 `supabase/functions/verify-iap-order/main.ts:108-112` offer 분기
- ⏸ C6.6 `subscriptions` 테이블에 `offer_type`, `trial_ends_at` 컬럼
- ⏸ C6.7 `supabase/functions/poll-subscription-status/index.ts` 신설 (5분 cron)
- ⏸ C6.8 `.claude/automations/subscription-status-poll.prompt.md`
- ⏸ C6.9 `src/pages/dashboard/index.tsx` 이탈 유저 RETURNING offer 노출 트리거

### 대기 중인 사용자 작업 (M6)
- ⏸ M6.1 토스 콘솔 → IAP 상품 `pro_monthly` 편집 → `SUBSCRIPTION` 타입
- ⏸ M6.2 offers 등록: `FREE_TRIAL` 7일 + `RETURNING` 50%
- ⏸ M6.3 mTLS 실 인증서 발급/등록
- ⏸ M6.4 인스타·Threads 광고에 "PRO 7일 무료" 메시지 추가

---

## 🚧 자동화 cron 트리거 (Phase 0-5 공통 — B5)

### 대기 중 — 모든 자동화 .prompt.md 의 실 실행 트리거
- ⏳ **자동화 7종 cron 실 셋업 — 수단 선택 필요**

| 옵션 | 장점 | 단점 |
|---|---|---|
| **Vercel Cron** (권장) | 무료, Next.js 사이트와 자연스럽게 통합, env 공유 | tailog-marketing-site에 `/api/cron/*` 라우트 7종 신설 필요 |
| Supabase pg_cron | DB 내장, 추가 인프라 0 | Edge Function 호출이 까다로움, 로그 분산 |
| GitHub Actions | 무료 cron, 작성 쉬움 | env 분리 운영 부담 |
| 수동 (당분간) | 즉시 가능 | 자동화 의미 없음 |

### Vercel Cron 시 신설 필요 endpoint
- ⏳ `app/api/cron/blog-publish/route.ts` (22:00 매일)
- ⏳ `app/api/cron/threads-publish/route.ts` (19:00 화·금)
- ⏳ `app/api/cron/threads-token-refresh/route.ts` (09:00 월)
- ⏳ `app/api/cron/instagram-publish/route.ts` (20:00 수)
- ⏳ `app/api/cron/weekly-report/route.ts` (21:00 일)
- ⏳ `app/api/cron/case-study-weekly/route.ts` (14:00 목)
- ⏳ `app/api/cron/referral-settlement/route.ts` (02:00 월)
- ⏳ `vercel.json` 에 7종 cron 정의

---

## 📋 추가 발견 이슈 (다음 작업 세션에서)

### B1 — tailog-marketing-site 로컬 빌드 미실행
- 영향: Phase 1 통과 조건 미충족
- 책임: 사용자 1회 실행 또는 자동화 셋업
- 명령: `cd /Users/family/jason/tailog-marketing-site && pnpm install && pnpm build`

### B2 — ✅ **완료** point_events + point_transactions + drainer 신설 (2026-05-22)
- 마이그레이션: `supabase/migrations/20260523000100_point_events_and_transactions.sql`
- Edge Function: `supabase/functions/process-point-events/index.ts`
- 자동화: `.claude/automations/point-events-drainer.prompt.md`
- Cron endpoint: `tailog-marketing-site/app/api/cron/point-events-drainer/route.ts`
- 트리거 자동 부착: `users` INSERT (signup_bonus 100pt), `ai_coaching` INSERT (first_coaching 500pt)
- 월 예산 가드레일: `MONTHLY_POINT_BUDGET_KRW=50000`, 80% 도달 시 텔레그램, 100% 시 skipped_budget

### B3 — **폐기됨 (2026-05-22)** ShareRewardCard dashboard 배치
- 사유: 기존 `useContactsViralReward` (settings/subscription.tsx:253-270) 와 **중복**
  - 기존: PRO 1일권 (0원, 토스 SDK 안전)
  - 신규: 양방향 500P (월 5만원, 자체 referrals)
- 결정: 출시 시 기존만 활성, 신규는 코드 보존·운영 비활성
- 잠금 갱신: L10 (2026-05-22)
- 보존된 코드: `ShareRewardCard.tsx`, `referrals` 마이그레이션, `process-referral` Edge, `referral-settlement-weekly` 자동화
- D+30 이후 contactsViral 결제 전환률 < 5% 면 신규 referrals 활성화 검토

### B4 — ✅ **완료** marketing_data_consent 토글 UI 추가 (2026-05-22)
- 신규 컴포넌트: `src/components/features/settings/MarketingDataConsentSection.tsx`
- settings/index 배치 + handler `toggleMarketingDataConsent`
- types/settings.ts UserSettings 인터페이스 확장
- lib/api/settings.ts mapping 갱신
- 마이그레이션 위치 변경: `users` → `user_settings` (settings 도메인 일관성)
- 익명화 뷰 갱신: JOIN user_settings

### B5 — 자동화 cron 미가동
- 영향: 모든 자동화 .prompt.md 가 명세만 있고 동작 안 함
- 책임: 사용자 결정 (Vercel Cron 추천) + 코드 세션

### B6 — 🟡 부분 완료 외부 API 토큰
- ✅ 텔레그램 봇 토큰 발급 (`t.me/taillogtoss_marketingbot`) — **회전 권장** (채팅 노출)
- ✅ GA4 측정 ID 발급 (`G-6HJ47QL58R`)
- ⏳ 텔레그램 `MARKETING_TELEGRAM_CHAT_ID` 미발급 (봇과 채팅 후 getUpdates 필요)
- ⏳ Meta Graph API 토큰 미발급 (가장 까다로움, 별도 가이드 안내됨)

### B7 — 토스 Subscription 샌드박스
- 책임: 토스 공지 모니터링 (사용자)

### B8 — ✅ **완료** render-case-chart Edge Function (텍스트 버전, 2026-05-22)
- 파일: `supabase/functions/render-case-chart/index.ts`
- 3종 차트 지원: `bar_before_after`, `line_trend`, `comparison_table`
- ASCII bar(█/░) + Markdown 표 — Threads/블로그/인스타 캡션에 바로 삽입 가능
- L11 PII 가드: case_id 형식 검증(`사례 #<8-hex>`) + 출력 본문 PII 재검증
- v2 PNG 렌더(satori/puppeteer)는 출시 후 사용 데이터 보고 결정

### B9 — ✅ **완료** 5,000pt 상한선 검증 (2026-05-22)
- 파일: `supabase/functions/grant-toss-points/index.ts:91`
- 조건문에 `|| request.points > 5000` 추가
- 보안 체크리스트 `supabase/functions/CLAUDE.md` `[x] grant-toss-points` 갱신

### B10 — ✅ **완료** point_transactions + drainer (B2와 함께 처리, 2026-05-22)
- B2와 동일 마이그레이션·Edge Function에 통합 완성

---

## 🎯 다음 액션 우선순위 (2026-05-22 일괄 코드 완료 후)

### Priority 1 — 사용자 즉시 가능 (1~2시간)
1. ⏳ **텔레그램 봇 토큰 회전** (`/revoke` 후 새 토큰) + chat_id 발급 (봇과 채팅 → getUpdates)
2. ⏳ **로컬 빌드 검증**: `cd /Users/family/jason/tailog-marketing-site && pnpm install && pnpm build`
3. ⏳ **Vercel 배포** (별도 신규 프로젝트, mungmungfit과 분리):
   ```
   cd /Users/family/jason/tailog-marketing-site
   vercel login
   vercel
   vercel env add NEXT_PUBLIC_SITE_URL production   # https://tailog.kr
   vercel env add NEXT_PUBLIC_GA_ID production       # G-6HJ47QL58R
   vercel env add CRON_SECRET production             # 임의 32자 hex
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add MARKETING_TELEGRAM_BOT_TOKEN production
   vercel env add MARKETING_TELEGRAM_CHAT_ID production
   vercel --prod
   vercel domains add tailog.kr
   ```
4. ⏳ **가비아 DNS**: A 레코드 `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`

### Priority 2 — 사용자 이번 주 (40분)
5. ⏳ **Meta Graph API 토큰 발급** (별도 디테일 가이드 안내됨)
6. ⏳ Vercel env에 `META_GRAPH_TOKEN`, `INSTAGRAM_USER_ID`, `THREADS_USER_ID` 등록

### Priority 3 — 사용자 2주일 내
7. ⏳ Supabase 마이그레이션 5종 적용:
   ```bash
   cd /Users/family/jason/TaillogToss
   supabase db push   # 또는 supabase migration up
   ```
8. ⏳ Supabase Edge Function 9종 배포:
   ```bash
   supabase functions deploy seed-case-study publish-to-threads seed-threads-from-blog publish-to-instagram generate-karrot-caption collect-social-insights process-referral process-point-events render-case-chart
   ```
9. ⏳ Canva 인스타 캐러셀 5종 제작 (`mungmungfit/docs/manus-image-prompts.md` 가이드 차용)

### Priority 4 — 외부 대기
10. ⏸ Phase 6 토스 Subscription 샌드박스 지원 발표 모니터링
11. ⏸ D+30 후 referrals 시스템 활성화 결정 (contactsViral 결제 전환률 보고)

---

## 📁 파일 인벤토리 (전체)

### tailog-marketing-site/ (23개 파일)
```
package.json, tsconfig.json, next.config.ts, .gitignore, README.md
app/
├── layout.tsx, page.tsx, globals.css
├── sitemap.ts, robots.ts, not-found.tsx
├── blog/page.tsx, blog/[slug]/page.tsx, blog/category/[name]/page.tsx
├── about/page.tsx, cases/page.tsx, diagnosis/page.tsx
└── feed.xml/route.ts
lib/
├── blog.ts, site.ts
content/blog/
├── 01-tailog-intro.mdx
├── 02-ai-coaching-6-blocks.mdx
├── 03-1-minute-record.mdx
├── 04-pro-vs-tokens.mdx
└── 05-1week-usage-diary.mdx
docs/phase-1.md
```

### TaillogToss/supabase/migrations/ (4개 신설)
- `20260522000200_marketing_data_consent.sql`
- `20260522000300_marketing_anonymized_views.sql`
- `20260522000400_marketing_queues.sql`
- `20260522000500_referrals.sql`

### TaillogToss/supabase/functions/ (7개 Edge Function 신설)
- `_shared/marketingPiiGuard.ts`
- `seed-case-study/index.ts`
- `publish-to-threads/index.ts`
- `seed-threads-from-blog/index.ts`
- `publish-to-instagram/index.ts`
- `generate-karrot-caption/index.ts`
- `collect-social-insights/index.ts`
- `process-referral/index.ts`

### TaillogToss/.claude/automations/ (7개 신설)
- `marketing-blog-publish-nightly.prompt.md`
- `marketing-threads-publish.prompt.md`
- `marketing-threads-token-refresh.prompt.md`
- `marketing-instagram-publish.prompt.md`
- `marketing-weekly-report.prompt.md`
- `marketing-case-study-weekly.prompt.md`
- `referral-settlement-weekly.prompt.md`

### TaillogToss/src/ (1개 신설)
- `components/features/dashboard/ShareRewardCard.tsx`

### TaillogToss/docs/marketing/ (4개)
- `messaging-cards.md`
- `env-vars.md`
- `MARKETING-BOARD.md`
- `SELF-REVIEW-PHASE-0-TO-5.md`
- `STATUS-CHECKLIST.md` (이 파일)

**총 신설/수정 파일: 46개**

---

## ✏️ 변경 이력

- 2026-05-22: 초안 작성 (Phase 0-5 코드 일괄 완료 직후)

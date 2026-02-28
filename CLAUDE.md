이 문서는 TaillogToss 프로젝트의 최우선 전역 규칙이다. 에이전트는 모든 작업 전에 반드시 읽고 따른다.
**이 문서 하나로 프로젝트 전체 맥락을 파악할 수 있다. 별도 문서를 세션 시작 시 읽을 필요 없다.**

# TaillogToss 운영 인덱스

DogCoach(Next.js PWA) → Toss 미니앱(React Native) 마이그레이션.
핵심 규칙 + 현재 상태 + 아키텍처 + Parity 추적을 이 문서에서 관리한다.

## 저장소 경계 (MUST)

| 구분 | 경로 | 권한 |
|------|------|------|
| Write Repo | `C:\Users\gmdqn\tosstaillog` | 읽기/쓰기 |
| Read-Only Ref | `C:\Users\gmdqn\DogCoach` | 읽기 전용 |

## 에이전트 실행 규약 (MUST)
1. 수정 전 변경 계획을 1~2문장으로 먼저 알린다.
2. 수정 전 파일 원문을 반드시 읽는다.
3. 작업은 Parity ID와 연결한다.
4. 완료 보고는 아래 완료 포맷을 사용한다.
5. 사용자 요청 없는 파괴적 명령(`reset --hard`, 대량 삭제) 금지.
6. 코드 중복보다 기존 타입/훅/함수 재사용 우선.
7. 코드 파일 상단 1~3줄 기능 요약 주석 유지.
8. 반복되는 실행/검증 절차가 확인되면 기존 스킬 업데이트 또는 신규 스킬로 즉시 지침화한다.
9. **새 폴더 생성 시 `CLAUDE.md` 필수 포함.** 아래 내용을 명시한다:
   - 폴더의 역할과 책임 범위
   - 포함된 파일 목록과 각 용도
   - 참조할 스킬 (`Skill("스킬명")`)
   - import 규칙 (의존 가능/금지 대상)
10. 디자인 토큰은 `styles/tokens` import 필수 — `#hex` / `fontSize:` 하드코딩 금지.

## 스택/아키텍처 요약

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | `@granite-js/react-native` |
| UI | TDS React Native (`@toss/tds`) + `src/styles/tokens.ts` 디자인 토큰 |
| 상태 | React 기본 + TanStack Query |
| 백엔드 | `Backend/` FastAPI + `supabase/functions/` Edge |
| 인증 | Toss Login → Edge(`login-with-toss`) → Supabase Auth bridge |
| 결제 | Toss IAP (`verify-iap-order`) |
| 광고 | Toss Ads SDK 2.0 |

### 백엔드 아키텍처

```
클라이언트(RN) ─── Supabase (직접 CRUD: dogs, logs, settings 등)
     │
     ├── Edge Functions (Toss S2S mTLS 전담, 7종)
     │     login-with-toss, verify-iap-order, send-smart-message,
     │     grant-toss-points, legal, toss-disconnect, generate-report
     │
     └── FastAPI (AI + 복잡 로직 전담, 12 feature 모듈, 60+ endpoints)
           coaching 생성, 대시보드 집계, B2B 복합 쿼리, 예산 관리
```

- **FE↔BE 매칭**: `src/lib/api/*.ts` ↔ `Backend/app/features/*/` 파일명 1:1
- **FE→BE 전환**: `backend.ts` HTTP 클라이언트 (backend-first + supabase fallback)
- **인증**: `python-jose` 로컬 JWT 디코드 (Supabase JWT Secret), Guest 모드 완전 제거

### Edge Function 상태

| 함수 | 버전 | verify_jwt | 상태 |
|------|------|-----------|------|
| `login-with-toss` | v12 | false | ✅ Sandbox 200 + invoke smoke |
| `verify-iap-order` | v8 | true | ⚠️ mock mTLS, 우회차단 검증 완료 |
| `send-smart-message` | v8 | true | ⚠️ mock mTLS, 우회차단 검증 완료 |
| `grant-toss-points` | v8 | true | ⚠️ mock mTLS, 우회차단 검증 완료 |
| `legal` | ✅ | false | ✅ 4종 HTML 서빙 |
| `toss-disconnect` | ✅ | false | ✅ Basic Auth 동작, 콘솔 콜백 대기 |
| `generate-report` | v3 | true | ⚠️ mock/real 스위치, 우회차단 검증 완료 |

### DB 현황
- **38 테이블** (B2C 28 + B2B 10), RLS 30+ 정책, 3 헬퍼 함수
- 마이그레이션: `20260228015912_b2c_column_gaps` + `20260228020042_b2b_tables`

## 스킬 참조 인덱스 (MUST)

상세 구현 지침은 아래 스킬로 참조한다.

| 주제 | 스킬 |
|------|------|
| 화면 와이어프레임/레이아웃 + 비주얼 QA | `Skill("toss_wireframes")` |
| 사용자 여정/상태 전환 | `Skill("toss_journey")` |
| Toss 앱 기본(TDS, 토큰, UX라이팅, mTLS, IAP, Ads) | `Skill("toss_apps")` |
| DB 변환/마이그레이션 전략 | `Skill("toss_db_migration")` |
| Edge 보안 하드닝/우회 차단 검증 | `Skill("toss-edge-hardening")` |
| Phase 13 게이트 판정/증적 동기화 | `Skill("toss-phase13-gate")` |
| Supabase MCP 운영 표준 | `Skill("toss-supabase-mcp")` |
| Sandbox Metro 실기기 연결 | `Skill("toss-sandbox-metro")` |

## 완료 포맷

```
- Scope: Parity ID 목록
- Files: 변경 파일 목록
- Validation: 실행/검증 결과
- Risks: 미해결 리스크와 다음 액션
- Self-Review: 잘한 점 / 부족한 점 / 남은 검증 공백
- Next Recommendations: 다음 우선순위 1~3개
```

---

## Parity ID 추적 (Feature Parity Matrix 요약)

| Parity ID | 도메인 | 상태 | 완료 항목 | 잔여 |
|-----------|--------|------|----------|------|
| AUTH-001 | 인증 | In Progress | login.tsx, AuthContext, usePageGuard, Edge v12, test 7케이스, Sandbox 200, stale code 502 증적 | fresh authCode happy-path 재증적 (실기기) |
| APP-001 | 앱 셸 | In Progress | 23라우트, _app.tsx, 레이아웃 5종, 딥엔트리 3종, dog/profile+add 구현 | 실기기 라우팅 완전 검증 |
| UI-001 | 디자인 | In Progress | 52컴포넌트, 디자인 토큰 중앙화 70+파일, Lottie 3종, 상태UI 8화면, UX라이팅, 폴더 CLAUDE.md 22개 | 실기기 비주얼 QA |
| LOG-001 | 행동 기록 | In Progress | 대시보드+빠른기록+상세기록+분석, backend-first 전환 | FastAPI 로그 API 실기기 E2E |
| AI-001 | AI 코칭 | In Progress | 6블록 코칭, 피드백, BE-P5 완료, backend-first 전환 | FastAPI 코칭 API 실연동 E2E |
| IAP-001 | 결제 | In Progress | 구독 화면, useIsPro, verifyAndGrant, Edge v8, iap.test 8케이스, B2B 확장 | 결제 E2E (실결제) |
| MSG-001 | 알림 | In Progress | Edge v8, 쿨다운, noti_history DB 영속, 우회차단, test 통과 | Sandbox 실발송 |
| AD-001 | 광고 | Done | 타입, mock SDK, useRewardedAd, R1/R2/R3 통합, test 5케이스 | 실 Ad Group ID 교체 + Sandbox 검증 |
| B2B-001 | B2B 운영 | In Progress | P1~P7 전체, 스키마 정합, IAP 정렬, roleGuard test 8케이스, BE-P7 완료 | 40마리 FlatList 성능, 공유 링크, B2C 회귀, verify_parent_phone RPC |
| REG-001 | 등록 | Done | legal 4종, toss-disconnect, mTLS 구현, 약관 2종, 사업자등록+배포 완료 | 콘솔 테스트 콜백 검증 |

## Phase 진행 현황

| Phase | 상태 | 비고 |
|-------|------|------|
| 1~10 | Done | FE 전체 완료 |
| 11 | Done | 보안(mTLS, rate-limit, pii) 완료 |
| 12 | Done | 광고 SDK mock 적용, 실 ID 검증 대기 |
| 13 | In progress | Sandbox 로그인 확보, IAP/광고 E2E 잔여 |
| B2B | Done | 코드/문서 정합 완료, 성능/실기기 검증 대기 |
| REG | Done | legal + toss-disconnect + 약관 페이지 완료 |
| BE | Done | BE-P1~P8 완료 (12모듈, 60+ endpoints, pytest 39 pass) |
| INFRA-1 | Done | DB 26→38 + RLS 적용 |

## 현재 상태 (Last Updated: 2026-02-28)

| 도메인 | 상태 | 남은 것 |
|--------|------|---------|
| FE→BE 연결 | ✅ 완료 | LAN IP direct 성공, 307 trailing slash 수정 |
| AUTH | ✅ 로그인 성공 증적 확보 | ❌ 실패400 증적 미확보 |
| IAP | ⚠️ mock 동작 | ❌ fresh authCode → 실결제 E2E 필요 |
| MSG | ⚠️ invoke smoke만 | ❌ Sandbox 실발송 미검증 |
| AD | ⚠️ mock SDK | ❌ 실 Ad Group ID 교체 + 실노출 미검증 |
| UI | ✅ 토큰화+Lottie+상태UI 완료 | ❌ 실기기 비주얼 QA 잔여 |
| Edge 7종 | ✅ 배포+smoke+우회차단 | ⚠️ happy-path payload 실검증 잔여 |
| BE (FastAPI) | ✅ P1~P8 완료 | — |
| DB (INFRA-1) | ✅ 38테이블+RLS | — |
| mTLS | ⚠️ mock mode | ❌ real 인증서/콘솔 등록 필요 |

### Mock/Placeholder 목록

| 항목 | 위치 | 전환 필요 |
|------|------|----------|
| Ads SDK | `src/lib/ads/config.ts` | 실 Ad Group ID 교체 |
| IAP 래퍼 | `src/lib/api/iap.ts` | 실 SDK 교체 |
| generate-report | `supabase/functions/generate-report/` | `REPORT_AI_MODE=real` + OpenAI 실키 |
| verify-iap-order | `supabase/functions/verify-iap-order/` | real mTLS 전환 |
| send-smart-message | `supabase/functions/send-smart-message/` | real mTLS 전환 |
| grant-toss-points | `supabase/functions/grant-toss-points/` | real mTLS 전환 |
| IAP 복원 | `src/lib/api/subscription.ts:62` | Toss IAP 복원 API 공개 대기 |

### 테스트 현황

| 구분 | 상태 | 수치 |
|------|------|------|
| FE 단위 | ✅ | 77 tests, 21 suites (auth 7 + iap 8 + roleGuard 8 + ads 5 + guards 8 + pageGuard 5 + postLogin 2 + API 등) |
| BE 단위 | ✅ | pytest 39 tests (health + models + schemas + security + routers) |
| Edge 단위 | ✅ | 30 tests, 12 suites |
| BE↔DB 통합 | ❌ 미구현 | FastAPI + 실 Supabase 연결 테스트 |
| E2E | ⚠️ 부분 | 로그인 + Edge smoke만, IAP/AD happy-path 미검증 |
| 성능 | ❌ 미구현 | 40마리 FlatList, API p95 < 300ms |

### 크리티컬 패스 블로커

**🔴 CRITICAL (출시 차단)**
1. Edge Function Real mTLS (INFRA-3) — 인증서 발급 필요
2. AUTH 브릿지 실기기 재검증 — login-with-toss v12 Sandbox 증적 재수집

**🟠 HIGH (주요 기능 미완성)**
3. IAP E2E 테스트 (Sandbox 결제 플로우)
4. B2B RPC 함수 (verify_parent_phone_last4)
5. Ads 실 Ad Group ID 교체

**🟡 MEDIUM (론칭 영향 없음, Phase 2+)**
6. 리텐션 자동화 (세그먼트 5종 + Smart Message 트리거)
7. 바이럴 공유 보상 (referral_link + 포인트 지급)
8. 트레이너 마켓플레이스 (KYC + 매칭 + 정산)

### Phase 13 FE-BE Migration 요약
- ✅ AUTH 블로커 해소 (uuid user_id, session bridge, RLS write)
- ✅ API 정합성 (dog_env, coaching 테이블명)
- ✅ FE→BE 공통 기반 (`backend.ts` + 9개 도메인 backend-first 전환)
- ✅ AUTH 세션 안정화 (refresh token 판별, bridge 에러 처리)
- ✅ LAN IP direct 실기기 연결 해결
- ⚠️ Known: training `changeVariant` 미사용 경로 backend 전환 제외

## 다음 우선순위 (Single Source)

### 1. UI 비주얼 QA (실기기 필요, UI-001)
- ✅ `src/styles/tokens.ts` 디자인 토큰 중앙화 + 70+ 파일 적용 완료
- ✅ Lottie 3종 적용 (welcome/dashboard-loading/empty-state)
- ✅ 로딩/빈상태/에러 상태 8개 화면 보강 완료
- ✅ UX 라이팅 해요체 + 긍정적 말하기 적용
- ✅ 22개 폴더 CLAUDE.md 생성 (구조/스킬 참조 명시)
- ❌ 실기기에서 23개 화면 비주얼 QA (토큰 색상/간격 시각 확인)
- 참조: `Skill("toss_wireframes")` QA 체크리스트, `Skill("toss_apps")` 디자인 토큰

### 2. Phase 13 E2E 증적 확보 (실기기 필요)
- AUTH 실패400 증적 1건
- IAP 구매 → verify-iap-order 200 (fresh authCode 선행)
- MSG 실발송 → noti_history row 확인
- AD R1/R2/R3 실노출 (실 Ad Group ID 교체 선행)
- 참조: `Skill("toss-phase13-gate")`, `docs/2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md`

### 3. INFRA-2~3 마무리 (콘솔/인프라)
- Edge happy-path payload 검증 + secrets drift 점검
- Real mTLS 인증서 발급 + 토스 콘솔 등록

## 딥다이브 문서 (필요 시 참조)

아래 문서는 세션 시작 시 읽을 필요 없다. 특정 도메인 작업 시에만 참조한다.

| 문서 | 용도 | 언제 읽나 |
|------|------|----------|
| `docs/11-FEATURE-PARITY-MATRIX.md` | Parity ID별 상세 Notes (커밋 해시, 검증 로그) | Parity Notes 상세 확인 시 |
| `docs/BACKEND-PLAN.md` | BE 구현 상세 (엔드포인트 매핑, DogCoach 참조) | BE 코드 수정/확장 시 |
| `docs/MISSING-AND-UNIMPLEMENTED.md` | 미구현 상세 + V2 추천 기능 | 신규 기능 기획 시 |
| `docs/2-28/PHASE13-FE-BE-ROLLING-MIGRATION.md` | Phase 13 작업 상세 + Known Issues | FE→BE 연결 이슈 디버깅 시 |
| `docs/SCHEMA-B2B.md` | B2B 10테이블 99컬럼 상세 스키마 | DB/B2B 작업 시 |
| `docs/2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md` | Sandbox 실기기 테스트 플레이북 | E2E 증적 수집 시 |
| `docs/PRD-TailLog-Toss.md` | B2C 제품 요구사항 | 정책/요건 확인 시 |
| `docs/PRD-TailLog-B2B.md` | B2B 제품 요구사항 | B2B 정책 확인 시 |

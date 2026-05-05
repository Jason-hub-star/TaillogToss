# TaillogToss — Codex Agent Context Map

> AI 에이전트(Codex / codex-rescue)가 이 프로젝트를 풀로 파악하기 위한 진입점.
> **작업 시작 전 아래 § 0 순서대로 반드시 읽을 것.**

---

## § 0. 작업 전 필독 순서 (Codex 전용)

```
Step 1: cat CLAUDE.md                                   ← 실행 규칙 + 금지사항 MUST
Step 2: cat docs/status/PROJECT-STATUS.md               ← 최신 1줄 상태
Step 3: cat docs/status/11-FEATURE-PARITY-MATRIX.md     ← 완료/미완료 파리티
Step 4: 해당 작업 스킬 SKILL.md 읽기 (§ 2 스킬 경로 참조)
```

---

## § 1. 하네스 (CLAUDE.md) 전체 경로

```bash
# 전역 규칙 (MUST)
CLAUDE.md
src/CLAUDE.md
src/pages/CLAUDE.md
src/components/CLAUDE.md
src/lib/CLAUDE.md
src/styles/CLAUDE.md
supabase/functions/CLAUDE.md

# 페이지별 로컬 규칙
src/pages/coaching/CLAUDE.md
src/pages/dashboard/CLAUDE.md
src/pages/training/CLAUDE.md
src/pages/onboarding/CLAUDE.md
src/pages/settings/CLAUDE.md
src/components/features/coaching/CLAUDE.md
src/components/features/training/CLAUDE.md
src/components/features/dashboard/CLAUDE.md
src/components/tds-ext/CLAUDE.md
src/components/shared/CLAUDE.md
```

---

## § 2. 스킬 파일 경로 (SKILL.md)

```bash
# 도메인 스킬
.claude/skills/toss-guide/core/toss_apps/SKILL.md           # TDS 컴포넌트/SDK 패턴
.claude/skills/toss-guide/core/toss_journey/SKILL.md         # 사용자 여정/전환 흐름
.claude/skills/toss-guide/core/toss_wireframes/SKILL.md      # 화면 와이어프레임
.claude/skills/toss-guide/data/toss_db_migration/SKILL.md    # DB 마이그레이션
.claude/skills/toss-guide/auth/toss-login-token-ops/SKILL.md # 로그인/토큰
.claude/skills/toss-guide/auth/toss-mock-auth-ops/SKILL.md   # Mock 인증/survey 루프
.claude/skills/toss-guide/monetization/toss-iap-proxy-ops/SKILL.md  # IAP E2E ★
.claude/skills/toss-guide/monetization/toss-growth-ops/SKILL.md
.claude/skills/toss-guide/monetization/toss-monetization-ops/SKILL.md
.claude/skills/toss-guide/ops/toss-ait-build-ops/SKILL.md   # .ait 빌드/배포
.claude/skills/toss-guide/ops/toss-dev-server/SKILL.md      # 개발 서버 기동
.claude/skills/toss-guide/ops/toss-sandbox-metro/SKILL.md
.claude/skills/toss-guide/ops/toss-supabase-mcp/SKILL.md
.claude/skills/toss-guide/ops/toss-phase13-gate/SKILL.md
.claude/skills/toss-guide/security/toss-edge-hardening/SKILL.md
.claude/skills/toss-guide/security/toss-iap-edge-recovery/SKILL.md

# 페이지 스킬
.claude/skills/page-skills/page/coaching/page-coaching-result-upgrade/SKILL.md
.claude/skills/page-skills/page/dashboard/page-dashboard-upgrade/SKILL.md
.claude/skills/page-skills/page/dashboard/page-dashboard-analysis-upgrade/SKILL.md
.claude/skills/page-skills/page/dashboard/page-dashboard-quick-log-upgrade/SKILL.md
.claude/skills/page-skills/page/training/page-training-academy-upgrade/SKILL.md
.claude/skills/page-skills/page/training/page-training-detail-upgrade/SKILL.md
.claude/skills/page-skills/page/onboarding/page-onboarding-survey-upgrade/SKILL.md
.claude/skills/page-skills/page/settings/page-settings-subscription-upgrade/SKILL.md
.claude/skills/page-skills/page/dog/page-dog-profile-upgrade/SKILL.md

# 피처 스킬
.claude/skills/page-skills/feature/feature-ui-empty-and-skeleton/SKILL.md
.claude/skills/page-skills/feature/feature-data-binding-and-loading/SKILL.md
.claude/skills/page-skills/feature/feature-error-and-retry-state/SKILL.md
.claude/skills/page-skills/feature/feature-form-validation-and-submit/SKILL.md
.claude/skills/page-skills/feature/feature-navigation-and-gesture/SKILL.md
.claude/skills/page-skills/feature/feature-analytics-and-tracking/SKILL.md
```

---

## § 3. 상태 문서 경로

```bash
docs/status/PROJECT-STATUS.md             # 최신 상태 (항상 읽을 것)
docs/status/11-FEATURE-PARITY-MATRIX.md   # 파리티 Done/InProgress/Blocked
docs/status/PAGE-UPGRADE-BOARD.md         # 라우트별 완성도
docs/status/MISSING-AND-UNIMPLEMENTED.md  # 미구현/목업 목록 ★
docs/status/PROGRESS-CHECKLIST.md         # 종합 완성도 (72%)
docs/status/SKILL-DOC-MATRIX.md           # 스킬 ↔ 코드 매핑
```

---

## § 4. Mock/미구현 현황 (배포 전 처리 필수)

| 항목 | 파일 | 조치 |
|------|------|------|
| mTLS mock 모드 | `supabase/functions/_shared/mtlsMode.ts` | `TOSS_MTLS_MODE=real` |
| grant-toss-points | `supabase/functions/grant-toss-points/` | 실 API 연결 |
| send-smart-message | `supabase/functions/send-smart-message/` | 콘솔 캠페인 승인 후 |
| DevMenu 플랜 오버라이드 | `src/lib/devPlanOverride.ts` | 프로덕션 빌드 제거 |
| Chip 다중선택 | `src/components/tds-ext/Chip.tsx:37` | Phase 6 예정 |

---

## § 5. 개발 서버 기동

```bash
# FastAPI
cd Backend && venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8765 --reload

# 프론트엔드
node_modules/.bin/granite dev

# adb 포트 포워딩
adb reverse tcp:8765 tcp:8765 && adb reverse tcp:8081 tcp:8081
```

---

## § 6. 테스트 명령

```bash
cd Backend && venv/bin/pytest tests/ -v   # Backend pytest
npx tsc --noEmit                          # TypeScript 타입체크
npx jest --passWithNoTests                # Jest
```

---

---

# TaillogToss Orchestration Index (Slim)

DogCoach (Next.js PWA) -> Toss mini-app (React Native) migration.
This file only keeps execution rules, priorities, and pointers.

## Repo Boundary (MUST)

| Scope | Path | Access |
|---|---|---|
| Write Repo | `/Users/family/jason/TaillogToss` | read/write |
| Read-only Ref | `/Users/family/jason/DogCoach` | read-only |

## Execution Rules (MUST)
1. Announce change intent in 1-2 lines before editing.
2. Read source files before editing them.
3. Link every implementation to parity IDs.
4. Prefer reuse over duplication.
5. No destructive git or mass-delete operations without explicit request.
6. Keep `AGENTS.md` files slim and move details into docs.
7. If creating a new folder, add a local `AGENTS.md` with role/rules.
8. Use `styles/tokens` for design tokens; avoid hardcoded hex/fontSize.
9. For page implementation, load one `page-*` skill + at most two `feature-*` skills.
10. At task end, output Completion Format and sync `docs/daily/MM-DD/page-<route-slug>.md` checkboxes with `docs/status/PAGE-UPGRADE-BOARD.md` status.

## Nightly Automations (MUST)

| Automation | Schedule | Source |
|---|---|---|
| AGENTS.md slimming | daily 08:00 | keep this file pointer-only |
| docs organizer | daily 22:00 (Asia/Seoul) | `.Codex/automations/docs-nightly-organizer.prompt.md` |

## Next Automation (MUST)

- Code-doc align: `.Codex/automations/code-doc-align.prompt.md` (daily 21:30, Asia/Seoul)
- Daily work log source: `docs/daily/MM-DD/page-<route-slug>.md`
- Status board source: `docs/status/PAGE-UPGRADE-BOARD.md`
- Skill mapping source: `docs/status/SKILL-DOC-MATRIX.md`
- Route truth policy:
  - managed routes: `src/components/shared/DevMenu.tsx`
  - full route inventory: `src/pages/**`
- Session rule:
  - 목표 입력 시 route 기준으로 page skill 1개 + feature 최대 2개만 로드
  - 작업 종료 시 daily 체크박스와 board 상태를 반드시 동기화

## Architecture Snapshot

| Layer | Stack |
|---|---|
| Framework | `@granite-js/react-native` |
| UI | TDS RN (`@toss/tds`) + `src/styles/tokens.ts` |
| State | React + TanStack Query |
| Backend | `Backend/` FastAPI + `supabase/functions/` Edge |
| Auth | Toss Login -> `login-with-toss` -> Supabase Auth bridge |
| Payments | Toss IAP (`verify-iap-order`) |
| Ads | Toss Ads SDK 2.0 |

## Commands (User-Invocable)

| Command | Purpose | When to use |
|---|---|---|
| `/learn` | 교정 사항 → feedback memory 저장 | 교정 후 규칙으로 학습시킬 때 |
| `/doc-update` | 코드 변경 후 문서 자동 갱신 | 구현 완료 후 문서 동기화 |
| `/self-review` | working tree 전체 자기 리뷰 | 커밋 전 품질 점검 |
| `/token-lint` | 스타일 토큰 하드코딩 탐지 | 스타일 변경 후 토큰 준수 확인 |

## Hooks

| Hook | Trigger | Action |
|---|---|---|
| `post-edit-typecheck` | `Edit\|Write` on `src/**/*.ts(x)` | `tsc --noEmit` 자동 실행 |

## MCP Servers

| Server | Purpose | Commands |
|---|---|---|
| `supabase` | Supabase DB/Edge 관리 | via MCP tools |
| `code-review-graph` | 코드 지식 그래프 (1269 nodes, 6580 edges) | `status`, `build`, `update`, `visualize` |

### code-review-graph Quick Reference
- `code-review-graph status` — 그래프 통계
- `code-review-graph update` — 변경분만 증분 업데이트
- `code-review-graph build` — 전체 재빌드
- `code-review-graph visualize` — HTML 시각화 생성
- 범위 제외: `.code-review-graphignore` (node_modules, .expo, dist, Backend venv 등)

## Skill Routing Index (MUST)

Skill root: `.Codex/skills/toss-guide/`
Page/feature skill root: `.Codex/skills/page-skills/`

### Base domain skills
- `Skill("toss_wireframes")`
- `Skill("toss_journey")`
- `Skill("toss_apps")`
- `Skill("toss-growth-ops")`
- `Skill("toss-monetization-ops")`
- `Skill("toss-login-token-ops")`
- `Skill("toss_db_migration")`
- `Skill("toss-edge-hardening")`
- `Skill("toss-phase13-gate")`
- `Skill("toss-supabase-mcp")`
- `Skill("toss-sandbox-metro")`
- `Skill("toss-dev-server")`

### Page hardening skills
- Source of truth: `docs/status/PAGE-UPGRADE-BOARD.md`
- Mapping: `docs/status/SKILL-DOC-MATRIX.md`
- Naming: `page-<route-slug>-upgrade`

### Cross-page feature skills
- `feature-ui-empty-and-skeleton`
- `feature-navigation-and-gesture`
- `feature-data-binding-and-loading`
- `feature-form-validation-and-submit`
- `feature-error-and-retry-state`
- `feature-analytics-and-tracking`

## Current Priority (Last Updated: 2026-03-01)
1. UIUX-001: dashboard analysis/training empty-state and skeleton stabilization
2. UIUX-002: training academy AI-generated-feel UX redesign
3. UIUX-003: curriculum visibility and navigation ergonomics
4. UIUX-004: onboarding survey parity with web baseline
5. UIUX-005: coaching result and training detail completeness
6. UIUX-006: dog profile real-data restore + dog switcher UX

## Source of Truth Docs

| Document | Purpose |
|---|---|
| `docs/status/PROJECT-STATUS.md` | latest status board |
| `docs/status/11-FEATURE-PARITY-MATRIX.md` | parity notes and verification logs |
| `docs/status/MISSING-AND-UNIMPLEMENTED.md` | missing implementations and V2 candidates |
| `docs/status/PAGE-UPGRADE-BOARD.md` | route-level execution board |
| `docs/status/PROGRESS-CHECKLIST.md` | 종합 완성도 체크리스트 (72%) |
| `docs/status/SKILL-DOC-MATRIX.md` | page skill to code/doc mapping |
| `docs/status/NIGHTLY-RUN-LOG.md` | nightly organizer execution history |
| `docs/ref/BACKEND-PLAN.md` | backend implementation details |
| `docs/ref/SCHEMA-B2B.md` | B2B schema reference |
| `docs/ref/SUPABASE-SCHEMA-INDEX.md` | Supabase live schema + RLS + migration drift index |
| `docs/ref/ARCHITECTURE-DIAGRAMS.md` | Toss in-app architecture index (6 diagram set) |
| `docs/ref/AIT-SDK-2X-MIGRATION.md` | SDK 1.x→2.x 마이그레이션 가이드 |
| `docs/ref/AIT-ADS-SDK-REFERENCE.md` | Toss Ads SDK 2.0 통합 레퍼런스 |
| `docs/ref/AIT-PUBLISHING-READINESS.md` | 퍼블리싱 심사 요건 + mTLS 가이드 |
| `docs/ref/AIT-IAP-MESSAGE-POINTS-REFERENCE.md` | IAP/Smart Message/포인트 API 레퍼런스 |
| `docs/ref/PRD-TailLog-Toss.md` | B2C PRD (v2.2.0) |
| `docs/ref/PRD-TailLog-B2B.md` | B2B PRD |
| `docs/ref/ASSET-GUIDE.md` | asset catalog and usage notes |
| `docs/ref/10-MIGRATION-OPERATING-MODEL.md` | migration operating model |
| `docs/ref/12-MIGRATION-WAVES-AND-GATES.md` | migration waves and gate criteria |
| `docs/status/AUTOMATION-HEALTH.md` | 자동화 상태 보고서 (hooks/commands/MCP) |
| `docs/daily/` | daily logs (22:00 compression target) |
| `docs/weekly/` | weekly compacted logs |

## Completion Format

```
- Scope: parity IDs
- Files: changed files
- Validation: commands/tests and outcomes
- Daily Sync: `docs/daily/MM-DD/page-<route-slug>.md` checkbox result + board status (`Ready|InProgress|QA|Done|Hold`)
- Risks: unresolved risks and next actions
- Self-Review: good / weak / verification gaps
- Next Recommendations: top 1-3 priorities
```

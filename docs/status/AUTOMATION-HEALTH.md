# 자동화 상태 보고서

점검 시각: 2026-05-13 (Asia/Seoul)
총 자동화: 7개 | 정상: 4개 | 신규(미스케줄): 3개 | 이슈: 0개
Hooks: 1개 | Commands: 4개 | MCP: 2개

## 상태 요약

| 자동화 | 스케줄 | 상태 | Lock | 최신 실행 | 메모 |
|--------|--------|------|------|-----------|------|
| docs-nightly-organizer | 매일 22:00 | ✅ HEALTHY | LOCK_RELEASED | 03-01 22:02 | |
| code-doc-align | 매일 03:30 | ✅ HEALTHY | LOCK_RELEASED | 03-02 03:06 | |
| skills-web-enrichment-7day | 매일 03:00 | ✅ HEALTHY | LOCK_RELEASED | 03-02 08:21 | 수동 lock 해제 (pid 20494 dead 확인) |
| architecture-diagrams-sync | 매일 04:00 | ✅ HEALTHY | LOCK_RELEASED | 03-02 19:22 | 최초 실행 완료, arch-06 Last-Verified 갱신 |
| daily-coaching-synthetic-gen | 매일 08:00 | ⚠️ UNSCHEDULED | — | 미실행 | FastAPI admin API 호출 방식(`BACKEND_BASE_URL` 기본 8765). Supabase Edge Function 포팅 후 pg_cron 등록 예정 |
| coaching-review-telegram-daily | 매일 09:00 | ⚠️ UNSCHEDULED | — | 미실행 | 합성 AI 추천 1건/day 텔레그램 검수 재료 수집. 예약 등록 전 |
| weekly-coaching-finetune-review | 매주 금 10:00 | ⚠️ UNSCHEDULED | — | 미실행 | weekly orchestrator TASK 2로 정렬. 관리자 review API 기준 검수 |

## Hooks & Commands (2026-04-02 신규)

| 유형 | 이름 | 상태 | 메모 |
|------|------|------|------|
| Hook | `post-edit-typecheck` | ✅ REGISTERED | Edit\|Write → tsc --noEmit |
| Command | `/learn` | ✅ REGISTERED | 교정 → feedback memory |
| Command | `/doc-update` | ✅ REGISTERED | 코드변경 후 문서 갱신 |
| Command | `/self-review` | ✅ REGISTERED | working tree 자기 리뷰 |
| Command | `/token-lint` | ✅ REGISTERED | 토큰 하드코딩 탐지 |

## MCP Servers

| 서버 | 상태 | 메모 |
|------|------|------|
| supabase | ⚠️ PENDING_RESTART | `.mcp.json` project-ref `kvknerzsqgmmdmyxlorl`→`gxvtgrcqkbdibkyeqyil`(본선) + 2026-04-27 신규 토큰 교체 완료. Claude Code 재시작 후 HEALTHY 예상. |
| code-review-graph | ✅ REGISTERED | 346 files, 1269 nodes, 6580 edges (04-02 빌드) |

상태 아이콘: ✅ HEALTHY / 🔄 RUNNING / ⚠️ STALE / ❌ MISSING / 🔒 STUCK / ❓ FILE_MISSING

## 미등록 파일

없음

## 이슈 상세

이슈 없음 (2026-03-02 19:22 기준 전체 정상)

### 해결 이력 (2026-03-02)

- 🔒 **skills-web-enrichment-7day STUCK** → 수동 해결: pid 20494 dead 확인, lock 해제
- ❌ **architecture-diagrams-sync MISSING** → 최초 실행 완료: arch-06 Last-Verified 갱신, LOG/HISTORY artifact 생성

---
*다음 자동 점검: 내일 09:30 (Asia/Seoul)*
*감시 설정: `.claude/automations/automation-health-monitor.prompt.md`*

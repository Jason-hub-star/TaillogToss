# 자동화 상태 보고서

점검 시각: 2026-05-13 (Asia/Seoul)
총 자동화 프롬프트: 13개 | 기본 오케스트레이터: 4개 | 수동 전용: 1개 | 이슈: 0개
Hooks: 1개 | Commands: 4개 | MCP: 2개

## 상태 요약

| 자동화 | 스케줄 | 상태 | Lock | 최신 실행 | 메모 |
|--------|--------|------|------|-----------|------|
| taillog-morning-orchestrator | 매일 02:00 | ✅ READY | CLEAR | 문서 정렬 완료 | drift/code-doc/arch/health만 실행 |
| taillog-ai-data-orchestrator | 매일 09:00 | ✅ READY | CLEAR | 수동 실발송 PASS | synthetic gen → Telegram review |
| taillog-nightly-orchestrator | 매일 22:00 | ✅ READY | LOCK_RELEASED | 문서 정렬 완료 | docs organizer만 실행 |
| taillog-weekly-orchestrator | 매주 금 10:00 | ✅ READY | CLEAR | 문서 정렬 완료 | training maintenance + finetune review |
| skills-web-enrichment-7day | 수동 실행 전용 | ⚠️ MANUAL_ONLY | LOCK_RELEASED | 03-02 08:21 | `DRY_RUN=true` 후 주인님 승인 시 단독 실행 |
| daily-coaching-synthetic-gen | AI data TASK 1 | ✅ SUBTASK | — | 05-13 수동 성공 | 단독 스케줄 금지, 오케스트레이터에서 호출 |
| coaching-review-telegram-daily | AI data TASK 2 | ✅ SUBTASK | — | 05-13 반려 시나리오 PASS | 단독 스케줄 금지, 오케스트레이터에서 호출 |
| code-doc-align | morning TASK 2 | ✅ SUBTASK | LOCK_RELEASED | 03-02 03:06 | 단독 실행 가능 |
| architecture-diagrams-sync | morning TASK 3 | ✅ SUBTASK | LOCK_RELEASED | 03-02 19:22 | 단독 실행 가능 |
| automation-health-monitor | morning TASK 4 | ✅ SUBTASK | — | 05-13 문서 정렬 | health report만 갱신 |
| docs-nightly-organizer | nightly TASK 1 | ✅ SUBTASK | LOCK_RELEASED | 03-01 22:02 | Mac 경로로 수정됨 |
| training-data-maintenance | weekly TASK 1 | ✅ SUBTASK | — | 문서 정렬 완료 | 초안/리포트 중심 |
| weekly-coaching-finetune-review | weekly TASK 2 | ✅ SUBTASK | — | 문서 정렬 완료 | approved >= 50 readiness 보고 |

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

상태 아이콘: ✅ READY / ✅ SUBTASK / 🔄 RUNNING / ⚠️ STALE / ⚠️ MANUAL_ONLY / ❌ MISSING / 🔒 STUCK / ❓ FILE_MISSING

## 미등록 파일

없음

## 이슈 상세

이슈 없음. 기본 실행은 오케스트레이터 4개로 제한한다.

## 실행 정책

- 독립 스케줄 등록 대상: morning, AI data, nightly, weekly orchestrator 4개
- 단독 스케줄 금지: orchestrator 하위 TASK들
- 수동 전용: `skills-web-enrichment-7day.prompt.md`
- 제외 유지: nightly vision-labeling task

### 해결 이력 (2026-03-02)

- 🔒 **skills-web-enrichment-7day STUCK** → 수동 해결: pid 20494 dead 확인, lock 해제
- ❌ **architecture-diagrams-sync MISSING** → 최초 실행 완료: arch-06 Last-Verified 갱신, LOG/HISTORY artifact 생성

---
*다음 자동 점검: 다음 morning orchestrator TASK 4*
*감시 설정: `.claude/automations/automation-health-monitor.prompt.md`*

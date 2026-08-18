# 자동화 상태 보고서

점검 시각: 2026-07-08 12:05 (Asia/Seoul)
총 자동화: 21개 | 정상(HEALTHY/RUNNING): 3개 | 이슈(STALE/STUCK): 18개 | 미등록: 0개

## 상태 요약

| 자동화 | 스케줄 | 상태 | Lock | 최신 실행 | 메모 |
|--------|--------|------|------|-----------|------|
| taillog-morning-orchestrator | 매일 02:00 | 🔄 RUNNING | RUNNING | 07-08 12:04 | 현재 실행 중 (이 run) |
| taillog-nightly-orchestrator | 매일 22:00 | 🔒 STUCK | STUCK | 06-10 11:49 | lock started 06-15 22:08 (>2h), NIGHTLY-RUN-LOG 672h |
| taillog-ai-data-orchestrator | 매일 09:00 | ⚠️ STALE | RELEASED | 06-15 08:13 | 모든 artifact 555h+ 초과 |
| taillog-weekly-orchestrator | 매주 금 10:00 | ⚠️ STALE | RELEASED | 06-15 08:13 | TRAINING-DATA-LOG 555h > 170h |
| daily-coaching-synthetic-gen | ai-data TASK1 | ⚠️ STALE | (none) | 06-15 08:13 | TRAINING-DATA-LOG 555h |
| coaching-review-telegram-daily | ai-data TASK2 | ⚠️ STALE | (none) | 06-05 09:47 | queue 794h, offset 1342h |
| weekly-coaching-finetune-review | 매주 금 10:00 | ⚠️ STALE | (none) | 06-15 08:13 | 555h > 170h |
| code-doc-align | morning TASK2 | ⚠️ STALE | RELEASED | 07-08 12:03 | HISTORY fresh but INTEGRITY-REPORT 537h (first-scan skip) |
| architecture-diagrams-sync | morning TASK3 | ✅ HEALTHY | RELEASED | 07-08 12:04 | 이 run에서 갱신 |
| automation-health-monitor | morning TASK4 | ✅ HEALTHY | (none) | 07-08 12:05 | 이 보고서 |
| docs-nightly-organizer | nightly TASK1 | 🔒 STUCK | STUCK | 06-10 11:49 | lock started 06-15 08:10 (>2h), NIGHTLY-RUN-LOG 672h |
| training-data-maintenance | weekly TASK1 | ⚠️ STALE | (none) | 06-15 08:13 | 555h > 170h |
| skills-web-enrichment-7day | 수동 전용 | ⚠️ STALE | RELEASED | 03-21 11:57 | 2616h > 720h (수동 파이프라인, 예상됨) |
| marketing-blog-publish-nightly | 매일 22:00 | ⚠️ STALE | (none) | 05-22 21:08 | MARKETING-BOARD 1118h |
| marketing-case-study-weekly | 매주 목 14:00 | ⚠️ STALE | (none) | 05-22 21:08 | 1118h > 194h |
| marketing-instagram-publish | 매주 수 20:00 | ⚠️ STALE | (none) | 05-22 21:08 | 1118h > 194h |
| marketing-threads-publish | 매주 화/금 19:00 | ⚠️ STALE | (none) | 05-22 21:08 | 1118h > 98h |
| marketing-threads-token-refresh | 매주 월 09:00 | ⚠️ STALE | (none) | 05-22 21:08 | 1118h > 194h |
| marketing-weekly-report | 매주 일 21:00 | ⚠️ STALE | (none) | 05-22 21:08 | 1118h > 194h |
| point-events-drainer | 매 10분 | ⚠️ STALE | (none) | 05-22 21:08 | 1118h ≫ 2h (심각) |
| referral-settlement-weekly | 매주 월 02:00 | ⚠️ STALE | (none) | 05-22 21:08 | 1118h > 194h |

상태 아이콘: ✅ HEALTHY / 🔄 RUNNING / ⚠️ STALE / ❌ MISSING / 🔒 STUCK / ❓ FILE_MISSING

## 미등록 파일
- 없음 (레지스트리 21개 항목 모두 파일 존재, 실제 automation 파일 모두 등록됨)

## 이슈 상세

전반적으로 자동화 플릿이 2026-06-15/16 이후 실행 흔적이 없다. 스케줄러가 중단되었거나 세션이 오래 트리거되지 않은 것으로 보인다. 확인 우선순위:

- **taillog-nightly-orchestrator: STUCK** — `docs/status/.nightly-orchestrator.lock`이 `running`(started 2026-06-15 22:08)로 남아 있어 이후 nightly run이 차단됨. lock 정리 필요. NIGHTLY-RUN-LOG.md 마지막 갱신 672h(28일) 전.
- **docs-nightly-organizer: STUCK** — `docs/.docs-nightly.lock`이 `running`(started 2026-06-15 08:10)로 stuck. nightly TASK1 차단 원인.
- **point-events-drainer: STALE(심각)** — 10분 주기 자동화인데 MARKETING-BOARD 아티팩트가 1118h(≈47일) 미갱신. 포인트 이벤트 드레이너가 실제로 돌지 않는지 확인 필요.
- **marketing-* 6종 + referral-settlement-weekly: STALE** — 모두 MARKETING-BOARD.md 단일 아티팩트에 의존, 2026-05-22 이후 미갱신. 마케팅 파이프라인 전체 정지 상태.
- **taillog-ai-data / weekly / coaching 계열: STALE** — TRAINING-DATA-LOG / coaching queue가 06-05~06-15 이후 미갱신.
- **code-doc-align: STALE(경미)** — 이 run에서 first-scan skip으로 HISTORY만 append, INTEGRITY-REPORT.md 본문은 대상 파일 무변경으로 유지(537h). 실제 drift 재계산은 target 파일 변경 시 수행됨.
- **skills-web-enrichment-7day: STALE(예상됨)** — 수동 전용 파이프라인, 미실행이 정상.

권장 조치: (1) 두 STUCK lock 파일 정리 후 nightly 계열 재가동 여부 확인, (2) 스케줄러/트리거가 06-15 이후 morning 외 자동화를 실행하고 있는지 점검.

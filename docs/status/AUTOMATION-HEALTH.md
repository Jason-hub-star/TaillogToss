# 자동화 상태 보고서

점검 시각: 2026-03-01 20:24 (Asia/Seoul)
총 자동화: 3개 | 정상: 2개 | 이슈: 1개 | 미등록: 0개

## 상태 요약

| 자동화 | 스케줄 | 상태 | Lock | 최신 실행 | 메모 |
|--------|--------|------|------|-----------|------|
| docs-nightly-organizer | 매일 22:00 | ✅ HEALTHY | CLEAR | 03-01 10:58 | NIGHTLY-RUN-LOG.md 갱신됨 |
| code-doc-align | 매일 03:30 | ❌ MISSING | CLEAR | — | INTEGRITY-REPORT.md 미생성 |
| skills-web-enrichment-7day | 매일 03:00 | ✅ HEALTHY | CLEAR | 03-01 12:30 | catalog.json + CHANGELOG.ndjson 최신 |

상태 아이콘: ✅ HEALTHY / 🔄 RUNNING / ⚠️ STALE / ❌ MISSING / 🔒 STUCK / ❓ FILE_MISSING

## 미등록 파일
없음

## 이슈 상세

### code-doc-align — ❌ MISSING

- 예상 아티팩트: `docs/status/INTEGRITY-REPORT.md`, `docs/status/INTEGRITY-HISTORY.ndjson`
- 현재 상태: 두 파일 모두 존재하지 않음
- 원인 추정: code-doc-align 자동화가 아직 한 번도 정상 완료되지 않았거나, 출력 경로 설정 문제
- 확인 방법:
  1. scheduled task `taillogtoss-code-doc-align` 최근 실행 로그 확인
  2. 수동으로 code-doc-align 프롬프트 실행 후 출력 확인
  3. 프롬프트 내 `출력:` 섹션 경로(`docs/status/INTEGRITY-REPORT.md`)와 실제 쓰기 경로 일치 여부 점검

---
*다음 자동 점검: 내일 09:30 (Asia/Seoul)*
*감시 설정: `.claude/automations/automation-health-monitor.prompt.md`*

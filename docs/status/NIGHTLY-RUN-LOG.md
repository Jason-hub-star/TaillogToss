# Nightly Run Log

Execution log for docs nightly organizer (22:00 Asia/Seoul).

## Entry Template

- run_at:
- dry_run:
- moved_ref_count:
- moved_status_count:
- moved_daily_count:
- weekly_created_or_updated:
- deleted_daily_count:
- errors:

## Runs

- run_at: 2026-03-01T22:00:00+09:00
- dry_run: true
- moved_ref_count: 0
- moved_status_count: 0
- moved_daily_count: 0
- weekly_created_or_updated: none
- deleted_daily_count: 0
- errors: none

- run_at: 2026-03-01T10:58:01+09:00
- dry_run: false
- moved_ref_count: 0
- moved_status_count: 0
- moved_daily_count: 0
- weekly_created_or_updated: none
- deleted_daily_count: 0
- errors: none

- run_at: 2026-03-01T22:02:14+09:00
- dry_run: false
- moved_ref_count: 0
- moved_status_count: 0
- moved_daily_count: 0
- weekly_created_or_updated: none
- deleted_daily_count: 0
- errors: none

## 2026-05-11 18:31 [오케스트레이터]
- vision-labeling: 오류 — TailLog Supabase INACTIVE (DB 접근 불가)
- docs-organizer: weekly 생성 5개 (W09/W10/W14/W17/W18) / daily 삭제 18개 / 남은 daily 5개

## 2026-05-23 22:30 [수동 회복 실행]
- run_at: 2026-05-23T22:30:00+09:00
- trigger: 사용자 명시 회복 요청 ("재등록하고 내문서들을 건강하게 회복해줘")
- dry_run: false
- moved_ref_count: 0
- moved_status_count: 0
- moved_daily_count: 9 폴더 → weekly 2종 (W19/W20)
- weekly_created_or_updated: `2026-W19.md` 신규, `2026-W20.md` 신규
- deleted_daily_count: 9 폴더 (05-04, 05-05, 05-06, 05-07, 05-11, 05-12, 05-13, 05-14, 05-15)
- remaining_daily_count: 5 폴더 (05-19 ~ 05-23, W21 진행 중)
- errors: none
- 동반 작업:
  - morning-orchestrator + nightly-orchestrator cron 재등록 완료 (0 2 * * *, 0 22 * * *)
  - INTEGRITY-REPORT.md 갱신 (drift=7, manual_required=7)
  - architecture diagram 6종 Last-Verified → 2026-05-23
  - AUTOMATION-HEALTH.md 정확한 mtime 기반 갱신

## 2026-05-27 22:00 [오케스트레이터]
- skill-mirror-sync: synced (Skill mirrors in sync.)
- docs-organizer: ref 0 / status 0 / daily-이동 0 / weekly 2026-W21.md 생성 (05-19, 05-20 압축) / daily 삭제 0건 (sandbox rm 권한 제한)
- docs-dashboard-sync: pages 25 / features 12 / completion 89% / blockers 8건

## 2026-05-27 22:04 [오케스트레이터 재실행]
- skill-mirror-sync: already-in-sync (Skill mirrors in sync.)
- docs-organizer: ref 0 / status 0 / daily-이동 0 / weekly W21 이미 존재+유효 (05-19 already summarized) / daily 삭제 0건 (sandbox permission)
- docs-dashboard-sync: pages 25 / features 12 / completion 91% / blockers 6건

## 2026-06-02 22:00 [docs-nightly-organizer]
- run_at: 2026-06-02 22:00 KST (nightly-orchestrator TASK 1)
- dry_run: false
- ref 이동: 0 (already in docs/ref/)
- status 이동: 0 (already in docs/status/)
- daily 이동: 0 (already in docs/daily/)
- weekly 생성/갱신: 2026-W21.md 병합 갱신 (05/21~05/23 추가, 포함 날짜 05/19~05/23)
- 삭제된 daily 수: 0 (sandbox 권한 오류 — rm Operation not permitted, 수동 삭제 필요: docs/daily/05-19~05-23)
- 오류: daily 폴더 삭제 실패 (sandbox mount 권한 제한)

## 2026-06-02 22:00 [오케스트레이터]
- skill-mirror-sync: synced (Skill mirrors in sync.)
- docs-organizer: ref 0 / status 0 / daily 이동 0 / 2026-W21.md 병합(05/21~05/23) / 삭제 0건(sandbox 권한 오류)
- docs-dashboard-sync: pages 25 / features 12 / completion 91% / blockers 6건

## 2026-06-04 22:00 [오케스트레이터]
- skill-mirror-sync: synced
- docs-organizer: ref 0 / status 0 / weekly 1(2026-W22.md 신규) / daily-삭제 0 (샌드박스 권한으로 차단, 05-19~05-27 잔존·내용은 weekly 캡처됨)
- docs-dashboard-sync: pages 25 / features 12 / completion 91% / blockers 6건

## 2026-06-10 22:00 [오케스트레이터]
- skill-mirror-sync: synced (Skill mirrors in sync.)
- docs-organizer: ref 0 / status 0 / daily 이동 0 / weekly 1(2026-W23.md 신규, 06/02) / daily-삭제 0 (샌드박스 mount 권한으로 차단, 05-19~06-02 잔존·내용은 weekly 캡처됨)
- docs-dashboard-sync: pages 25 / features 12 / completion 91% / blockers 6건

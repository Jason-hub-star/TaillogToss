# Patch: security/toss-iap-edge-recovery — 2026-03-01

Target: `.claude/skills/toss-guide/security/toss-iap-edge-recovery/SKILL.md`
Run ID: 20260301-0030

## Added Sections

### ## Failure Modes (marker: `enrich:13e9a4b7f078`)
Items added: 3

```diff
+ ## Failure Modes
+ <!-- enrich:13e9a4b7f078 -->
+ - Edge 배포 성공 후 `_shared/` 파일 미포함 시 런타임 첫 호출에서 import 에러(500)가 발생하므로,
+   배포 직후 스모크 POST 호출을 필수 절차로 포함한다.
+   (source: https://supabase.com/docs/guides/functions/troubleshooting)
+ - `idempotency_key` 미설정 또는 upsert 조건 누락 시 결제 재시도에서 `toss_orders` 중복 row가
+   생성될 수 있으므로, DB 레벨 unique constraint로 방어해야 한다.
+ - 401과 403이 혼재할 때 동일 원인으로 단정하지 말고, 401은 JWT 자체 문제,
+   403은 role/claim 불일치로 분리 진단해야 한다.
```

### ## QA Checklist (marker: `enrich:24f0b5c8e189`)
Items added: 3

```diff
+ ## QA Checklist
+ <!-- enrich:24f0b5c8e189 -->
+ - `toss_orders` upsert 후 최신 row의 `toss_status=PAYMENT_COMPLETED`와
+   `grant_status=granted` 두 필드를 동시에 확인한다.
+ - Edge 로그의 `version` 번호가 `list_edge_functions` 현재 배포 버전과 일치하는지
+   교차 확인하여 구버전 함수 실행을 배제한다.
+ - 실기기 구매 1회 후 `order_count` 집계 SQL로 row 증가를 즉시 확인하고,
+   증가 없으면 영속화 경로 재점검한다.
```

## Sources
- https://supabase.com/docs/guides/functions/troubleshooting (confidence: 0.91)

## Stats
- scanned_sections: 5 (언제 사용하나, 성공 기준, 표준 복구 순서, 검증 SQL, 주의사항)
- added_items: 6
- skipped_duplicates: 0
- new_categories: 2

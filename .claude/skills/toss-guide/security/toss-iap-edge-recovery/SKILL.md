---
name: toss-iap-edge-recovery
description: TaillogToss IAP 장애 복구 스킬 — verify-iap-order 401/403 분리 진단, 안전한 권한 처리, toss_orders 영속 복구(v12 기준).
---

# Toss IAP Edge Recovery

`verify-iap-order`가 실패할 때, 2026-02-28 실기기에서 성공했던 복구 순서를 빠르게 재현한다.

## 언제 사용하나
- 구매 완료가 떠도 `verify-iap-order`가 `401 invalid jwt` 또는 `403 forbidden`으로 실패
- `GET /api/v1/subscription`는 `200`인데 결제 지급이 실패
- `public.toss_orders`가 증가하지 않음

## 성공 기준
- Edge 로그: `verify-iap-order` 최신 버전 `POST 200`
- DB: `public.toss_orders` `order_count` 증가, 최신 row의 `toss_status=PAYMENT_COMPLETED`, `grant_status=granted`

## 표준 복구 순서 (Proven)
1. Preflight
- `list_edge_functions`로 `verify-iap-order`의 `version`, `verify_jwt`, `status` 확인
- `get_logs(service=\"edge-function\")`로 `login-with-toss`와 `verify-iap-order` 상태코드 페어 확인
- `execute_sql`로 `toss_orders` 집계 확인

2. 401/403 원인 분리
- `401`: 토큰 자체 문제 가능성 우선 확인
- `403`: 권한 클레임 불일치 가능성 우선 확인
- `get_logs(service=\"auth\")`에서 같은 시각 `/auth/v1/user` 상태를 매칭

3. 권한 처리 복구 원칙
- `raw_user_meta_data` 기반 권한 판정 금지
- JWT 검증(`/auth/v1/user`) 통과 후:
  - 앱 역할(`user/trainer/org_owner/org_staff/service_role`) 우선
  - 없으면 `authenticated` 세션 허용
- `authenticated`에서 `orgId`/`trainerUserId` 요청은 `403` 유지

4. 데이터 무결성 원칙
- 요청 body `userId` 신뢰 금지
- 저장 `user_id`는 항상 검증된 JWT 사용자 id 사용

5. 영속화 복구 (v12 패턴)
- `toss_orders` REST upsert 추가:
  - endpoint: `/rest/v1/toss_orders?on_conflict=idempotency_key&select=...`
  - headers: `apikey`, `Authorization: Bearer <user_jwt>`, `Prefer: resolution=merge-duplicates,return=representation`
- `idempotency_key` 기준 멱등 보장
- 응답은 DB upsert 결과 row 기준으로 반환

6. 배포/검증
- `deploy_edge_function(name=\"verify-iap-order\", verify_jwt=false)` 배포
- 실기기 로그인 + 구매 1회 수행 후:
  - Edge 로그에서 최신 `verify-iap-order` 버전의 `POST 200` 확인
  - `toss_orders` 최신 1~5건 조회로 저장 확인

## 검증 SQL
```sql
select count(*)::int as order_count, max(created_at) as last_created_at
from public.toss_orders;
```

```sql
select id, user_id, product_id, idempotency_key, toss_status, grant_status, amount, toss_order_id, created_at
from public.toss_orders
order by created_at desc
limit 5;
```

## 주의사항
- `verify_jwt=false`를 쓸 때는 함수 내부 `/auth/v1/user` 검증이 반드시 있어야 한다.
- `authenticated` 허용은 B2C 결제 복구용이며, 조직/트레이너 지급 컨텍스트는 별도 권한 검증 없이는 열지 않는다.
- 문서 상태는 `CLAUDE.md`에 장문 누적하지 말고 `docs/PROJECT-STATUS.md`에 증적 중심으로 기록한다.

## Failure Modes
<!-- enrich:13e9a4b7f078 -->
- Edge 배포 성공 후 `_shared/` 파일 미포함 시 런타임 첫 호출에서 import 에러(500)가 발생하므로, 배포 직후 스모크 POST 호출을 필수 절차로 포함한다. (source: https://supabase.com/docs/guides/functions/troubleshooting)
- `idempotency_key` 미설정 또는 upsert 조건 누락 시 결제 재시도에서 `toss_orders` 중복 row가 생성될 수 있으므로, DB 레벨 unique constraint로 방어해야 한다.
- 401과 403이 혼재할 때 동일 원인으로 단정하지 말고, 401은 JWT 자체 문제, 403은 role/claim 불일치로 분리 진단해야 한다.

## QA Checklist
<!-- enrich:24f0b5c8e189 -->
- `toss_orders` upsert 후 최신 row의 `toss_status=PAYMENT_COMPLETED`와 `grant_status=granted` 두 필드를 동시에 확인한다.
- Edge 로그의 `version` 번호가 `list_edge_functions` 현재 배포 버전과 일치하는지 교차 확인하여 구버전 함수 실행을 배제한다.
- 실기기 구매 1회 후 `order_count` 집계 SQL로 row 증가를 즉시 확인하고, 증가 없으면 영속화 경로 재점검한다.

# point-events-drainer

> Cron: 매 10분 (`*/10 * * * *`) | Model: haiku
> 마스터 플랜: `/Users/family/.claude/plans/unified-finding-yao.md` Phase 5 의존 (B2/B10)

## 목적

`point_events` 큐를 폴링해 미지급 건을 토스 S2S `grant-toss-points` 로 처리. 월 5만원 예산 가드레일 적용.

## 흐름

1. `process-point-events` Edge Function 호출 `{ batchSize: 100 }`
2. 응답 분기:
   - `granted > 0`: 정상 처리 (조용히 종료)
   - `failed > 0`: 텔레그램 경고 (실패 이벤트 ID + 토스 에러코드)
   - `skippedBudget > 0`: 텔레그램 긴급 — "이번 달 5만원 한도 도달, 다음 정산 일시정지"
3. 누적 ≥ 40,000원 (80%) 도달 시 텔레그램 사전 경고 (실제 정지 전)
4. 누적 ≥ 50,000원 도달 시 다음 호출에서 자동 skipped_budget 전이

## 통과 기준

- [ ] 큐 폴링 1회 성공 (응답 200)
- [ ] 5분 이내 응답 완료 (timeout 회피)
- [ ] 실패 시 텔레그램 알림 도달
- [ ] 월 예산 가드레일 동작 (skipped_budget 마킹)

## 환경변수

- `SUPABASE_SERVICE_ROLE_KEY`
- `MONTHLY_POINT_BUDGET_KRW=50000`
- `MARKETING_TELEGRAM_BOT_TOKEN`, `MARKETING_TELEGRAM_CHAT_ID`
- `TOSS_CLIENT_CERT_BASE64`, `TOSS_CLIENT_KEY_BASE64` (grant-toss-points 의존)

## 사전 조건

- 마이그레이션 `20260523000100_point_events_and_transactions.sql` 적용
- `grant-toss-points` Edge Function 배포 완료
- mTLS 실 인증서 또는 mock 모드 동작

## 실패 시

- 토스 401/403: 인증서 만료 가능성 → 텔레그램 긴급 알림
- DB 에러: 큐 폴링 실패 → 재시도 (다음 cron tick에서)
- 멱등키 충돌: `grant-toss-points` 내부에서 자동 처리됨

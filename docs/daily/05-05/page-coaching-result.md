# 2026-05-05 coaching/result + IAP E2E 작업 로그

## 상태: InProgress

## 완료 항목

- [x] IAP E2E: `verify-iap-order` Edge Function에 `activateSubscription()` 추가
- [x] IAP E2E: `subscriptions_user_id_key` UNIQUE 제약 적용 (migration drift → SQL 직접 적용)
- [x] IAP E2E: `subscriptions.is_active=true, plan_type=PRO_MONTHLY, next_billing_date=2026-06-03` 확인
- [x] `toss-iap-proxy-ops` 스킬 Pattern 5 (subscriptions 활성화 E2E) 추가
- [x] `check_user_daily_limit` 0 버그 fix 1: 테이블 오류(`AIRecommendationSnapshot` → `ai_coaching JOIN dogs`)
- [x] `check_user_daily_limit` 0 버그 fix 2: timezone 오류(KST 기준 `today_start`)
- [x] FastAPI 재기동 (port 8765, health 200)

## 미완료 항목

- [ ] 앱에서 `행동분석 1/10회` 실 확인
- [ ] coaching/result 6블록 실 렌더링 확인
- [ ] 실기기 결제 UI 3시나리오 최종 증적

## 관련 Parity

- AI-001: coaching daily limit bug fix
- IAP-001: subscriptions 활성화 E2E

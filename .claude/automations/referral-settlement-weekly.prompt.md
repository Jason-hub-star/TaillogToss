# referral-settlement-weekly

> Cron: 매주 월 02:00 (Asia/Seoul) | Model: sonnet
> 마스터 플랜: `/Users/family/.claude/plans/unified-finding-yao.md` §4 (Phase 5)

## 목적

`referrals` 테이블에서 7일+3건 조건 충족 건을 status='granted' 전이.
DB 트리거가 자동으로 point_events 양방향 INSERT (양쪽 500pt).

## 흐름

1. `process-referral` Edge Function 호출 `{ action: 'settle' }`
2. 조건 검증:
   - created_at <= now() - 7일
   - invitee_action_count >= 3
   - invitee_ip != referrer_ip (자가초대 차단)
   - 이번 달 누적 granted < 50 (월 한도)
3. 조건 미달 referrals 처리:
   - 7일+행동기록<3: 그대로 두기 (다음 주 재검토)
   - 14일+행동기록<3: status='expired' (자동 만료)
   - IP 일치: status='expired', expired_reason='self_referral_ip_match'
4. 결과 텔레그램 보고:
   ```
   📊 주간 친구초대 정산
   - 신규 보상: N건 (양방향 = N × 2 × 500P = N,000원)
   - 자동 만료: N건
   - 이번 달 누적: M/50쌍 (한도)
   - 누적 비용: M,000원 / 50,000원 (가드레일)
   ```
5. 월 한도 80% 도달 시 추가 텔레그램 경고
6. 월 한도 100% 도달 시 다음 주 정산 자동 일시정지

## 통과 기준

- [ ] settle 결과 텔레그램 도착
- [ ] granted 건수 만큼 point_events 양방향 INSERT 확인 (DB 트리거)
- [ ] 월 한도 가드레일 동작 확인

## 환경변수

- `SUPABASE_SERVICE_ROLE_KEY`
- `MONTHLY_POINT_BUDGET_KRW=50000`
- `MARKETING_TELEGRAM_BOT_TOKEN`, `MARKETING_TELEGRAM_CHAT_ID`

## 사전 조건

- 마이그레이션 `20260522000500_referrals.sql` 적용
- Phase 5의 point_events 테이블 마이그레이션 적용 (별도 작업 필요 시 진행)
- ShareRewardCard 컴포넌트 dashboard 배치 완료

# Phase 13 E2E + Sandbox Playbook (2026-02-27)

## Scope
- Phase: `13` (E2E 테스트 + 배포 준비)
- Parity: `AUTH-001`, `IAP-001`, `MSG-001`, `AD-001`
- Goal: 코드 완료 상태를 Sandbox 실기기 기준 검증 증적으로 전환

## Preconditions
- [x] Edge Function 4종 배포 `ACTIVE`
- [x] Runtime invoke 로그(성공/실패) 8건 확보
- [ ] `npm run typecheck` 통과 (현재 기존 누적 오류 존재)
- [x] `npm run lint`, `npm test` 통과
- [x] Toss Sandbox 앱 실기기 준비 (로컬 Metro 연결 확인)
- [x] mTLS cert/key 실환경 반영 (secret digest 일치)
- [x] AUTH-001 실 `authorizationCode` 200 증적 확보 (v11 request id 2건)
- [ ] 실제 Ad Unit ID 반영

## E2E Matrix

### AUTH-001 (Toss Login 브릿지)
1. 성공: login 버튼 → Edge `login-with-toss` 200 → 온보딩/대시보드 가드 진입
2. 실패: 잘못된 authorization code → 400 처리 + 에러 안내 노출

Evidence:
- 스크린샷: 로그인 전/후
- 로그: function status 200/400, request id
- 진행 메모(2026-02-27): 로컬 Sandbox 라우팅 로그 확인(`/_404` → `/login` → `/onboarding/welcome`), `appLogin referrer=SANDBOX` 확인, Edge `login-with-toss` v11 `POST 200` request id 확보(`f52019d7-0162-48bf-b021-de8bc80539de`, `92de76c2-abaa-4d8c-81cc-3e7329fe6d21`). 남은 항목은 실패 케이스 400 증적 1건.

### IAP-001 (결제/주문검증)
1. 성공: 구매 완료 → `verify-iap-order` 200 → 권한/토큰 반영
2. 복구: 구매 성공 후 서버 실패 시 재시도로 권한 복구
3. 실패: invalid order/transaction → 에러 처리 + 중복 부여 방지

Evidence:
- 스크린샷: 결제 트리거/결과 상태
- 로그: `verify-iap-order`, `grant-toss-points` status
- DB: 주문 상태/멱등키 확인

### MSG-001 (Smart Message)
1. 성공: staff role 발송 → `send-smart-message` 200 + `noti_history` row 생성
2. 실패: non-staff role 발송 → 403 처리
3. 예외: DB write 실패 시 fail-open + idempotency 완료(중복 발송 없음)

Evidence:
- 로그: status 200/403
- DB: `noti_history` 최신 row (`error_code`, `idempotency_key`)

### AD-001 (Rewarded Ad R1/R2/R3)
1. 성공: 각 placement에서 광고 시청 완료 후 보상 언락
2. 실패: no-fill/timeout 시 무광고 폴백 정책 동작
3. 한도: 일일 제한 도달 시 no-fill 처리

Evidence:
- 화면 기록: R1/R2/R3 진입 및 보상 결과
- 이벤트: `adRequested`, `adLoaded`, `adRewarded`, `adNoFill`, `adError`

## Run Order (권장)
1. AUTH 성공/실패
2. IAP 성공/복구/실패
3. MSG 성공/실패/예외
4. AD R1/R2/R3 성공/폴백

## Result Template (세션마다 복붙)
```
Date:
Tester:
Device:
Build/Commit:

AUTH-001:
- success: pass/fail (evidence)
- failure: pass/fail (evidence)

IAP-001:
- success: pass/fail (evidence)
- recovery: pass/fail (evidence)
- failure: pass/fail (evidence)

MSG-001:
- success: pass/fail (evidence)
- forbidden: pass/fail (evidence)
- fail-open/idempotency: pass/fail (evidence)

AD-001:
- R1: pass/fail (evidence)
- R2: pass/fail (evidence)
- R3: pass/fail (evidence)
- no-fill fallback: pass/fail (evidence)

Open Risks:
Next Action:
```

## Exit Gate (Phase 13)
- [ ] AUTH/IAP/MSG/AD E2E 시나리오 전부 수행
- [ ] Sandbox 실기기 증적(스크린샷 + 로그 + DB 조회) 첨부
- [ ] 미해결 리스크와 대응 계획 문서화

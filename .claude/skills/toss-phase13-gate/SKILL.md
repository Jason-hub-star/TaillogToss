---
name: toss-phase13-gate
description: TaillogToss Phase 13 게이트 운영 — AUTH/IAP/MSG/AD E2E 기준 점검, 증적 수집, 문서 상태 동기화.
---

# Toss Phase13 Gate

Phase 13(출시 직전)에서 게이트 항목을 빠르게 판정하고, 증적 기반으로 문서를 동기화하는 스킬.

## 언제 사용하나
- “지금 릴리즈 가능?” 판단이 필요할 때
- AUTH/IAP/MSG/AD/B2B 상태를 한 번에 점검할 때
- 세션 종료 전 다음 우선순위를 정리할 때

## 입력 기준 문서
- `CLAUDE.md`
- `docs/11-FEATURE-PARITY-MATRIX.md`
- `docs/MISSING-AND-UNIMPLEMENTED.md`
- `docs/2-28/PHASE13-FE-BE-ROLLING-MIGRATION.md`

## 게이트 체크리스트
1. AUTH-001
- 로그인 성공/실패(400) 증적 존재
- 최신 `login-with-toss` 배포 버전 확인

2. IAP-001
- 구매 성공, 서버 실패 복구, 에러 처리 3시나리오
- `verify-iap-order`, `grant-toss-points` 호출 증적

3. MSG-001
- Smart Message 권한/쿨다운 동작 확인
- Sandbox 실발송 여부 확인

4. AD-001
- 실 Ad Group ID 반영 여부
- 실기기 노출 확인

5. B2B-001 (출시 영향 항목만)
- 핵심 API 실연동, 성능 리스크(40마리) 상태

## 운영 절차
1. 현재 상태 수집
- MCP: edge function versions, logs
- 로컬: 테스트 결과(typecheck/jest/pytest) 최신 여부

2. 판정
- 각 항목을 `PASS / PARTIAL / BLOCKED`로 분류
- BLOCKED는 원인 1줄 + 해소 액션 1줄

3. 문서 동기화
- 상태표와 잔여 TODO를 단일 기준으로 정렬
- 날짜/시간은 절대시간(KST)으로 기록

## 산출물 포맷
- Gate Summary: `PASS / PARTIAL / BLOCKED`
- Evidence: 요청/응답 코드, 함수 버전, 로그 타임스탬프
- Risk: 출시 차단 1~3개
- Next 3: 다음 세션 우선순위 3개

---
name: toss-edge-hardening
description: TaillogToss Edge Function 보안 하드닝 — 권한 검증, 헤더 신뢰 제거, 재배포, 우회 재시도 차단 검증 플레이북.
---

# Toss Edge Hardening

`verify_jwt=true` Edge Function의 인증/권한 취약점을 점검하고, 패치 후 재배포와 런타임 차단 검증까지 끝내는 스킬.

## 언제 사용하나
- Edge Function 권한 우회(헤더 위조, role spoofing) 가능성 점검 시
- auth/role 로직 수정 후 재배포 + 실호출 검증이 필요할 때
- `send-smart-message`, `grant-toss-points`, `verify-iap-order`, `generate-report` 보안 점검 시

## 핵심 원칙
- 호출자 제어 헤더(`x-user-role`)를 권한 근거로 사용하지 않는다.
- 권한은 JWT claim(또는 서버 검증 결과)로만 결정한다.
- 패치 후에는 반드시 `재배포 + 우회 재시도 + Edge 로그` 3종 증적을 남긴다.

## 작업 순서
1. 사전 확인
- `list_edge_functions`로 `verify_jwt` 설정과 버전 확인
- 타깃 함수 엔트리포인트와 `_shared/httpAdapter.ts` 같은 공통 auth 파일 확인

2. 코드 점검
- `buildEdgeContext`에서 role 유입 경로 확인
- 헤더 기반 role 파싱 제거 여부 확인
- 관리자 판정 함수(`isAdminRole`)가 허용 role을 명확히 제한하는지 확인

3. 패치
- role 파싱을 JWT payload 기반으로 변경
- 필요 시 `UserRole` 타입에 `service_role` 추가
- 회귀 테스트(예: 위조 헤더 무시 케이스) 추가

4. 로컬 검증
- `npm run test:edge`
- `npm run typecheck`

5. 재배포
- MCP `deploy_edge_function` 사용
- 주의: 함수가 `_shared/*`를 import하면 재배포 payload에 해당 파일들을 포함해야 bundling 실패를 방지할 수 있다.

6. 런타임 보안 검증
- 동일 anon 토큰으로 2가지 요청 비교
- baseline: role 헤더 없이 호출
- probe: `x-user-role: trainer` 위조 헤더로 호출
- 기대값: 둘 다 `403` 또는 동일한 비권한 응답
- `get_logs(service=\"edge-function\")`로 실제 상태코드/버전 확인

## 완료 기준
- 타깃 함수가 최신 버전으로 `ACTIVE`
- 위조 헤더 재시도 차단 확인(HTTP + Edge Logs 일치)
- 관련 문서(`CLAUDE.md`, `MISSING-AND-UNIMPLEMENTED.md`, parity 문서) 상태 업데이트

## 보고 포맷
- 대상 함수/버전
- 취약점 재현 결과(패치 전/후)
- 배포 결과(ID, version, status)
- 차단 검증 결과(요청 4건 상태코드)
- 남은 리스크(예: happy-path 미검증, 실기기 미검증)

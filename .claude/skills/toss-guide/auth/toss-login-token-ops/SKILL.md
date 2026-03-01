---
name: toss-login-token-ops
description: Toss 로그인 토큰 운영 스킬 — OAuth2 토큰 발급/갱신/연동해제 API 흐름과 QA 증적 수집을 표준화.
---

# Toss Login Token Ops

토스 로그인 OAuth2 토큰 수명주기(발급/갱신/해제)를
실운영 기준으로 점검하고 증적을 남기는 스킬.

## 언제 사용하나
- “authorizationCode로 토큰 발급/갱신 흐름 정리해줘”
- “invalid_grant/만료 토큰 이슈를 재현하고 원인 분리해줘”
- “연동해제(remove) API 검증 절차를 만들어줘”

## 공식 문서
- Login Develop: `https://developers-apps-in-toss.toss.im/login/develop.html`
- API Integration Process: `https://developers-apps-in-toss.toss.im/development/integration-process.html`
- OAuth2 발급 API: `https://developers-apps-in-toss.toss.im/api/generateOauth2Token.html`
- OAuth2 갱신 API: `https://developers-apps-in-toss.toss.im/api/refreshOauth2Token.html`
- 연동해제(user key): `https://developers-apps-in-toss.toss.im/api/removeByUserKey.html`
- 연동해제(access token): `https://developers-apps-in-toss.toss.im/api/removeByAccessToken.html`

## 수명주기 표준 플로우
1. 앱에서 `appLogin()`으로 `authorizationCode` 수신
2. 서버에서 OAuth2 토큰 발급(`generateOauth2Token`)
3. 만료 전/실패 시 refresh token으로 갱신(`refreshOauth2Token`)
4. 사용자 탈퇴/연결해제 시 remove API 호출
5. 토큰/해제 결과를 내부 계정 상태와 동기화

## 핵심 운영 규칙
- `authorizationCode`는 1회성/유효시간(짧음) 전제. 재사용 금지.
- 토큰 발급/갱신/해제는 서버(S2S, mTLS)에서만 수행.
- Access Token을 장기 저장하지 말고 만료/재발급 정책을 명시.
- Refresh Token 만료/폐기 시 사용자 재로그인으로 복구.

## API 체크리스트

### generateOauth2Token
- 입력: `authorizationCode`, `referrer`
- 검증:
  - 정상 200
  - 만료/재사용 코드 실패(`invalid_grant`류)
  - 사용자 취소/거절 분기

### refreshOauth2Token
- 입력: `refreshToken`
- 검증:
  - 정상 200
  - 만료 refresh token 실패
  - refresh 성공 후 기존 access token 폐기 정책 확인

### removeByUserKey / removeByAccessToken
- 입력: `x-toss-user-key` 또는 `accessToken`
- 검증:
  - 정상 해제 200
  - 이미 해제된 계정 재호출(멱등/허용 동작 확인)
  - 해제 이후 API 접근 차단 확인

## 실패 원인 분리 가이드
- `invalid_grant`: authorizationCode 만료/재사용, 잘못된 referrer, 앱-서버 시차
- `401/403`: 서명/인증서/mTLS 설정 불일치, 잘못된 bearer
- `400 validation`: body 누락, 타입/길이 규칙 위반

## 증적 포맷
```
Date:
Scope: AUTH-001

Generate:
- result: pass/fail
- request_id:
- error_code:

Refresh:
- result: pass/fail
- request_id:
- error_code:

Disconnect:
- by_user_key: pass/fail
- by_access_token: pass/fail
- evidence: request_id, account_status

Risks:
Next Action:
```

## 문서 동기화
- 요약: `docs/PROJECT-STATUS.md`
- 상세 로그: `docs/11-FEATURE-PARITY-MATRIX.md`
- 차단/잔여: `docs/MISSING-AND-UNIMPLEMENTED.md`

## Failure Modes
<!-- enrich:e4c7a9b2d045 -->
- mTLS 인증서 만료 시 모든 S2S API 호출이 연결 단계에서 실패하므로, 인증서 갱신 일정과 `TOSS_CLIENT_CERT_BASE64`/`TOSS_CLIENT_KEY_BASE64` 교체 절차를 운영 캘린더에 사전 등록한다.
- Supabase Auth 로그에서 `JWT expired` 오류 발생 시 클라이언트가 만료 토큰을 refresh 없이 재사용하고 있음을 의미하므로, 클라이언트 토큰 갱신 타이밍을 점검해야 한다. (source: https://supabase.com/docs/reference/javascript/auth-signinwithidtoken)
- `authorizationCode`는 1회성이므로 서버에서 토큰 발급 실패 후 동일 code를 재사용하면 `invalid_grant`가 반복되며, 실기기에서 신선한 code를 재취득해야 한다.

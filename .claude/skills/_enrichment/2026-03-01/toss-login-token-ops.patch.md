# Patch: auth/toss-login-token-ops — 2026-03-01

Target: `.claude/skills/toss-guide/auth/toss-login-token-ops/SKILL.md`
Run ID: 20260301-0030

## Added Sections

### ## Failure Modes (marker: `enrich:e4c7a9b2d045`)
Items added: 3

Note: 기존 `## 실패 원인 분리 가이드` 섹션이 일부 failure mode를 커버하고 있어,
중복 없이 mTLS/Supabase 특화 항목만 추가.

```diff
+ ## Failure Modes
+ <!-- enrich:e4c7a9b2d045 -->
+ - mTLS 인증서 만료 시 모든 S2S API 호출이 연결 단계에서 실패하므로, 인증서 갱신 일정과
+   `TOSS_CLIENT_CERT_BASE64`/`TOSS_CLIENT_KEY_BASE64` 교체 절차를 운영 캘린더에 사전 등록한다.
+ - Supabase Auth 로그에서 `JWT expired` 오류 발생 시 클라이언트가 만료 토큰을 refresh 없이
+   재사용하고 있음을 의미하므로, 클라이언트 토큰 갱신 타이밍을 점검해야 한다.
+   (source: https://supabase.com/docs/reference/javascript/auth-signinwithidtoken)
+ - `authorizationCode`는 1회성이므로 서버에서 토큰 발급 실패 후 동일 code를 재사용하면
+   `invalid_grant`가 반복되며, 실기기에서 신선한 code를 재취득해야 한다.
```

## Sources
- https://supabase.com/docs/reference/javascript/auth-signinwithidtoken (confidence: 0.85)

## Stats
- scanned_sections: 7 (언제 사용하나, 공식 문서, 수명주기 표준 플로우, 핵심 운영 규칙, API 체크리스트, 실패 원인 분리 가이드, 증적 포맷)
- added_items: 3
- skipped_duplicates: 3 (invalid_grant, 401/403, 400 validation — 기존 섹션 커버)
- new_categories: 1

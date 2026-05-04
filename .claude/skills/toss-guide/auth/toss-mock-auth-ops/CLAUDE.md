이 문서는 `toss-mock-auth-ops` 스킬 폴더 운영 규칙이다.

## 목적
- Toss mock 인증이 survey 루프에 빠질 때 stable userKey 설정, 근본 원인 진단, adb 기반 트러블슈팅을 표준화한다.

## 파일 규칙
- 핵심 지침은 `SKILL.md`에만 유지한다.
- 실제 진단 세션 기록/로그는 프로젝트 `docs/daily/` 또는 `docs/ref/`로 이동한다.
- 이 폴더에는 보조 문서 남발 금지(슬림 유지).

## 수정 원칙
- 패턴 3개(stable userKey, 진단법, adb 순서)는 검증된 후에만 수정한다.
- Toss 로그인/auth 공식 문서 변경 시 `SKILL.md` 링크를 먼저 갱신한다.
- 새로운 survey 루프 원인이 발견되면 패턴 2 진단 트리를 확장한다.

## 관련 파일
- `supabase/functions/_shared/mTLSClient.ts` — Mock userKey 설정
- `supabase/functions/login-with-toss/main.ts` — 로그인 플로우
- `src/features/auth/AuthContext.tsx` — onboarding 판별 로직
- `Backend/app/features/onboarding/router.py` — Onboarding 저장


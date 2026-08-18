이 문서는 `toss-iap-proxy-ops` 스킬 폴더 운영 규칙이다.

## 목적
- Toss IAP 검증 실패(404) 시 FastAPI proxy 우회, Service Role 감지, mTLS mock 설정을 표준화한다.

## 파일 규칙
- 핵심 지침은 `SKILL.md`에만 유지한다.
- 상세 실행 로그/디버깅 기록은 프로젝트 `docs/daily/` 또는 `docs/ref/`로 이동한다.
- 이 폴더에는 보조 문서 남발 금지(슬림 유지).

## 수정 원칙
- 패턴 4개(proxy 우회, Service Role, mTLS mock, iap-invoke 분리)는 검증된 후에만 수정한다.
- Toss 공식 문서 변경 시 `SKILL.md` 링크/엔드포인트를 먼저 갱신한다.
- 새로운 IAP 디버깅 패턴이 발견되면 `SKILL.md`에 추가한다.

## 관련 파일
- `src/lib/api/iap.ts` — IAP 검증 메인 로직
- `src/lib/api/iap-invoke.ts` — 토큰 헬퍼 함수 (분리 대상)
- `Backend/app/features/subscription/router.py` — FastAPI proxy
- `supabase/functions/verify-iap-order/main.ts` — Edge Function
- `supabase/functions/_shared/mtlsMode.ts` — mTLS 모드 제어


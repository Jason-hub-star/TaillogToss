---
name: 진단
description: 고장·막힘 증상을 받아 근본 원인까지 파고드는 런북. 증상 → 의심 지점 → 검증 → 근본원인 → 최소 수정. .ait 빌드 실패·IAP 404·survey 루프·실기기 미렌더·API 500 등 이 리포에서 반복된 증상의 첫 의심을 표로 들고 있다.
user_invocable: true
tags: [meta, diagnose, read-then-fix]
trigger: "'왜 안 돼', '빌드가 깨져', '화면이 안 떠', '404가 나', 증상 기반 문제해결"
version: 1
---

# /진단 <증상> — 근본원인 런북

증상을 받아 **근본 원인**을 찾는다. 티켓이 가리킨 경로만 패치하지 않는다 —
공유 함수·Edge 함수는 `rg`로 모든 호출처를 훑어 **한 곳에서** 고친다.

## 절차

1. **재현/관측** — 로그·콘솔·실렌더로 ground truth 확보. 추측 금지.
2. **후보화** — 층으로 좁힌다: RN 화면 → TanStack Query → FastAPI(`Backend/`) → Edge(`supabase/functions/`) → DB/RLS.
3. **검증** — 후보를 하나씩 끄고 켠다.
4. **근본 원인 1개 확정** + 형제 호출처 영향 확인.
5. **최소 수정** + 재게이트로 회귀 확인.

## 흔한 증상 → 첫 의심 (실측 이력)

| 증상 | 첫 의심 | 스킬 |
|---|---|---|
| `.ait` 빌드 실패 / supabase url 에러 | env var가 번들에 인라인 안 됨 | `toss-ait-build-ops` |
| 실기기에서 새 UI가 안 보임 (코드·테스트는 통과) | **토스 샌드박스 번들 캐시** — 코드를 의심하기 전에 캐시부터 | `toss-sandbox-metro` |
| IAP 404 | Edge → FastAPI proxy 경로 + service role JWT 감지 | `toss-iap-proxy-ops` |
| IAP 로직을 고쳤는데 반영 안 됨 | `verify-iap-order`가 **`index.ts`/`main.ts` 이중 구현** — 프로덕션은 `main.ts` | `toss-iap-edge-recovery` |
| survey 무한 루프 | mock userKey가 매번 바뀜 (stable userKey 필요) | `toss-mock-auth-ops` |
| BE 수정했는데 405/구버전 응답 | DigitalOcean stale 빌드 — force-build 필요 | — |
| FastAPI 500 / Pydantic 검증 실패 | SQLAlchemy 모델 ↔ DB 타입 불일치, async cascade, enum | `toss-backend-model-ops` |
| 로그인 후 세션이 안 붙음 | Toss Login → `login-with-toss` → Supabase Auth 브릿지 | `toss-login-token-ops` |
| pre-push 차단 | `bash scripts/check-harness.sh` 를 직접 돌려 어느 하위 게이트인지부터 | — |
| 데이터는 오는데 화면이 빈칸 | empty-state/skeleton 분기 | `feature-ui-empty-and-skeleton` |

## 실행할 것

```bash
bash scripts/check-harness.sh          # 어느 게이트가 깨졌나
npm run typecheck
git log --oneline -10 -- <의심 경로>   # 최근 무엇이 바뀌었나
rg -n '<수정한 심볼>'                   # 형제 호출처 전수
```

## 출력 (BLUF)

근본원인 1줄 → 근거(관측) → 수정 위치(`file:line`) → 회귀 검증 방법.

## Verify

- 동일 재현 명령을 **수정 전·후** 실행해 실패→PASS를 확인했는가
- `rg`로 형제 호출처를 전수 확인했는가 (한 곳만 고치고 끝내지 않았는가)
- 표에 없던 새 증상이면 이 표에 **한 줄 추가**했는가

## 하지 말 것

- 증상이 난 파일만 패치하고 닫기 — 공유 함수면 형제가 깨진 채 남는다
- 실기기 미렌더를 코드 버그로 먼저 의심하기 (캐시가 먼저다)
- 재현 없이 고치기

## 다음

- 고쳤다 → `/다음`으로 원래 하던 항목 복귀, 세션 닫으면 `/마감`.
- 3라운드 돌려도 같은 실패면 구현으로 못 고친다 → `수렴`으로 계획부터 다시.

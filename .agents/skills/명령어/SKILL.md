---
name: 명령어
description: TaillogToss에서 쓸 수 있는 명령과 스킬 전체 표. 까먹으면 이거 하나만 기억하면 된다. 어떤 스킬을 로드해야 할지 헷갈릴 때 라우팅 표로도 쓴다.
user_invocable: true
tags: [meta, help, read-only]
trigger: "'무슨 명령 있어', '명령어', '어떤 스킬 써야 해', 커맨드·스킬 목록이 헷갈릴 때"
version: 1
---

# /명령어 — TaillogToss 명령 표

## 공통 5 메타 (전 프로젝트 동일)

| 명령 | 역할 | 읽기/쓰기 |
|---|---|---|
| `/상태` | 지금 어때 + 다음 액션 1개 추천 | 읽기 |
| `/다음` | 추천 말고 바로 다음 백로그 1항목 실행 | 쓰기 |
| `/진단 <증상>` | 고장·막힘 근본원인 런북 | 읽기→고침 |
| `/마감` | 게이트·문서·핸드오프·커밋 마무리 | 쓰기 |
| `/명령어` | 이 표 | 읽기 |

## 프로젝트 커맨드

| 명령 | 역할 |
|---|---|
| `/token-lint` | 스타일 토큰 하드코딩 탐지 (`styles/tokens` 미준수) |
| `/skill-audit` | 반복 워크플로우 스킬 후보 감사 |
| `/learn` | 교정 사항 → feedback memory 저장 |

> 구 영문 커맨드 7종(`intake`·`impact-map`·`evidence-review`·`handoff`·`profile-recommend`·`doc-update`·`self-review`)은 `.claude/commands/_archive/` 로 물러났다. 역할은 메타 5종이 흡수했다.

## 도메인 스킬 라우팅 (`Skill("<이름>")`)

**페이지 작업 규약: `page-*` 1개 + `feature-*` 최대 2개.** 그 이상 로드하면 매칭이 무너진다.

| 무엇을 하나 | 부를 것 |
|---|---|
| `.ait` 빌드·배포가 깨짐 | `toss-ait-build-ops` — 이 리포에서 **가장 많이 불린 스킬**(569회/23세션) |
| 샌드박스·Metro 번들이 안 뜸 | `toss-sandbox-metro` |
| dev 서버·adb 실기기 | `toss-dev-server` |
| 런타임 모드(mock/real) 전환 | `toss-runtime-mode-ops` |
| 결제·구독·IAP 404 | `toss-iap-proxy-ops` · `toss-monetization-ops` · `toss-iap-edge-recovery` |
| 추천·바이럴·리퍼럴 | `toss-growth-ops` |
| 로그인·토큰·세션 브릿지 | `toss-login-token-ops` · `toss-mock-auth-ops` |
| Edge 함수 보안 하드닝 | `toss-edge-hardening` |
| Supabase 스키마·마이그레이션 | `toss_db_migration` · `toss-supabase-mcp` |
| FastAPI 모델↔DB 타입 불일치 | `toss-backend-model-ops` |
| 배포 전 게이트 | `toss-phase13-gate` |
| 화면 설계·플로우 | `toss_wireframes` · `toss_journey` · `toss_apps` |

### feature-* (횡단 관심사, 최대 2개)
`feature-ui-empty-and-skeleton` · `feature-data-binding-and-loading` · `feature-navigation-and-gesture` · `feature-form-validation-and-submit` · `feature-error-and-retry-state` · `feature-analytics-and-tracking`

### page-* (라우트별, 1개)
`docs/status/PAGE-UPGRADE-BOARD.md` 가 어떤 라우트를 칠지 정하고, `docs/status/SKILL-DOC-MATRIX.md` 가 그 라우트 ↔ 스킬 매핑의 SSOT다.

## Verify

```bash
find .claude/skills -mindepth 2 -name SKILL.md | wc -l   # 표에 없는 스킬이 있나
bash scripts/sync-agent-skills.sh --check                 # .agents 미러 일치
```
표와 실제 파일이 어긋나면 **없는 명령을 출력하지 말고 차이를 먼저 보고한다.**

## 하지 말 것

- 페이지 1개에 스킬 4개 이상 로드하기 — 규약 위반이자 매칭 붕괴 원인
- 이 표를 SSOT로 삼기. 스킬 파일이 정본이고 이 표는 색인이다

## 다음

- 뭘 할지 정해졌다 → `/다음` 으로 실행한다.
- 어디까지 됐는지부터 → `/상태`.
- 표에 있는데 파일이 없다(또는 반대) → 그건 진입점 끊김이다. `/정비` 로 회수율부터 잰다.

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
| `/감사` | **사용자 빙의 도그푸딩** — 8 페르소나(겁먹은 초보·문제견 보호자·안전 리스크·기존 진행 유저·PRO 구독자·기관 훈련사·저사양 오프라인·토스 심사관)가 급소를 걸어 UX·안전·수익·심사 리스크 발굴. **발견은 등록만, 수정은 `/다음`** |
| `/token-lint` | 스타일 토큰 하드코딩 탐지 (`styles/tokens` 미준수) |
| `/skill-audit` | 반복 워크플로우 스킬 후보 감사 |
| `/learn` | 교정 사항 → feedback memory 저장 |

> 구 영문 커맨드 7종(`intake`·`impact-map`·`evidence-review`·`handoff`·`profile-recommend`·`doc-update`·`self-review`)은 `.claude/commands/_archive/` 로 물러났다. 역할은 메타 5종이 흡수했다.

## 도메인 스킬 라우팅 (`Skill("<이름>")`)

**전부 1단이라 실제로 호출된다.** 2026-08-18 평탄화 전에는 3~4단 중첩이라 Skill 툴이
등록조차 못 했다 — `CLAUDE.md` 의 라우팅 지시 45개가 죽은 글자였다.

**한 화면에 `feature-*` 최대 2개.** 그 이상 로드하면 매칭이 무너진다.

| 무엇을 하나 | 부를 것 |
|---|---|
| `.ait` 빌드·배포가 깨짐 | `toss-ait-build-ops` |
| 실기기에서 새 UI 가 안 보임 | `toss-sandbox-metro` — **캐시부터 의심** |
| dev 서버·adb | `toss-dev-server` · `toss-runtime-mode-ops` |
| 배포 전 게이트 | `toss-phase13-gate` |
| **화면을 새로 만듦** | `toss_wireframes`(레이아웃 5패턴) · `toss_journey` · `toss_apps` |
| 스키마·마이그레이션 | `toss_db_migration` · `toss-supabase-mcp` |
| FastAPI 모델↔DB 불일치 | `toss-backend-model-ops` |
| 로그인·세션 | `toss-login-token-ops` · `toss-mock-auth-ops` |
| Edge 보안 | `toss-edge-hardening` |

### 횡단 (최대 2개)
`feature-ui-empty-and-skeleton` · `feature-data-binding-and-loading` · `feature-navigation-and-gesture` · `feature-form-validation-and-submit` · `feature-error-and-retry-state` · `feature-analytics-and-tracking`

### 보관됨
`page-*` 21종(73% 보일러플레이트) · 과금 4종(전면 무료 결정). `.claude/skills/_archive/` 에 있고 `git mv` 로 되살린다.

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

# /skill-audit — 반복 워크플로우 스킬 후보 감사

최근 Codex 세션에서 반복 요청과 수동 작업을 찾아, 기존 skill/command/automation으로 충분한지 먼저 판정한다.
기본은 DRY RUN이며, 중복 생성 방지가 목적이다.

## 사용 트리거

- "최근 세션에서 반복 작업 찾아줘"
- "필요한 스킬 후보 뽑아줘"
- "수동으로 반복하는 작업 자동화할 수 있을까"
- "스킬/서브에이전트 만들 후보 검토해줘"

## 1. 필수 컨텍스트

먼저 읽는다.

```bash
cat AGENTS.md
cat CLAUDE.md
cat docs/status/PROJECT-STATUS.md
cat docs/status/11-FEATURE-PARITY-MATRIX.md
cat .claude/commands/CLAUDE.md
```

최근 세션은 아래에서 찾는다.

```bash
find /Users/family/.codex/sessions /Users/family/.codex/archived_sessions -type f -name '*.jsonl'
```

TaillogToss만 분석할 때는 `session_meta.payload.cwd == "/Users/family/jason/TaillogToss"` 세션만 사용한다.

## 2. 기존 커버리지 확인

새로 만들기 전에 반드시 확인한다.

```bash
find .claude/skills .agents/skills /Users/family/.codex/skills -name SKILL.md 2>/dev/null
find .claude/commands -maxdepth 2 -type f -name '*.md'
find .claude/automations -maxdepth 2 -type f
```

판정 우선순위:

1. 기존 command로 충분하면 command 재사용
2. 기존 skill로 충분하면 skill 재사용
3. 기존 automation으로 충분하면 automation 재사용 또는 업데이트 제안
4. 그래도 반복 절차가 남을 때만 새 skill 후보
5. 독립 조사 역할이면 subagent 추천만 한다

## 3. 후보 판정 규칙

새 skill 생성 후보는 모두 만족해야 한다.

- 최근 세션에서 3회 이상 반복되거나, 적은 횟수라도 비용/위험이 높다.
- 절차, 명령, 파일 경로, 검증 기준이 있다.
- 기존 skill/command/automation이 70% 이상 커버하지 못한다.
- 앞으로 같은 형태로 재사용될 가능성이 높다.

subagent 추천 후보는 아래에 해당해야 한다.

- 역할이 bounded investigation이다.
- 결과물이 코드 변경보다 조사 리포트, 원인 분리, 리뷰 판단에 가깝다.
- write set이 없거나 매우 좁다.
- 프로젝트에 영구 subagent 정의 위치가 없으면 생성하지 않고 추천만 한다.

스킵해야 하는 것:

- 단발 질문
- 단순 설명 요청
- 이미 있는 skill의 트리거 문구만 부족한 경우
- 기존 command/automation으로 충분한 문서 동기화
- 명확한 절차 없이 "자주 물어봄"만 있는 주제

## 4. DRY RUN 출력

기본 출력은 파일을 만들지 않는 보고서다.

```text
## Skill Audit Report

Scope:
- Sessions:
- Date range:
- Project filter:

Existing Coverage:
- Reused commands:
- Reused skills:
- Reused automations:

Repeated Patterns:
| Pattern | Evidence | Current Coverage | Decision | Why |
|---|---:|---|---|---|

Create Candidates:
| Type | Name | Trigger | Contents | Confidence |
|---|---|---|---|---|

Suggested Subagents:
| Name | Role | When to use | Why not created |
|---|---|---|---|

Skipped:
- Pattern: reason

Next Action:
- Create none / create listed skills / update existing trigger text
```

## 5. 생성 모드

사용자가 명시적으로 "생성해", "create", "후보 중 필요한 것 만들어"라고 하면 생성할 수 있다.

생성 시 규칙:

- 새 skill은 `skill-creator` 절차를 따른다.
- TaillogToss 프로젝트 전용이면 `.claude/skills`를 source of truth로 사용하고 `.agents/skills` mirror 정책을 유지한다.
- 범용 개인 스킬이면 `/Users/family/.codex/skills`에 둔다.
- 새 폴더를 만들면 로컬 `CLAUDE.md` 또는 `AGENTS.md` 규칙이 필요한지 확인한다.
- 생성 후 `scripts/sync-agent-skills.sh`가 있으면 mirror 동기화 필요 여부를 보고한다.

생성 후 보고:

```text
Created:
- path

Updated:
- path

Validation:
- quick_validate / manual validation / not run

Skipped:
- reason
```

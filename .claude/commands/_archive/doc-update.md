# /doc-update — 문서 자동 갱신

코드 변경 후 "문서업데이트"라고 하면 이 프로세스를 실행한다.
CLAUDE.md의 정본 1곳 원칙을 따른다.

## 프로세스

### 1. 변경 범위 파악
```bash
git diff --name-only HEAD
git diff --name-only --cached
git status --porcelain
```

### 2. 영향 문서 판별 (자동)

| 변경 영역 | 필수 갱신 | 조건부 갱신 |
|-----------|----------|-----------|
| **어떤 코드든** | `PROJECT-STATUS.md` (상태 한 줄) | — |
| route/page | `PAGE-UPGRADE-BOARD.md` | `SKILL-DOC-MATRIX.md` |
| DB/migration/Edge | `SUPABASE-SCHEMA-INDEX.md` | `BACKEND-PLAN.md` |
| styles/tokens | — | `ASSET-GUIDE.md` |
| automation/.claude | `CLAUDE.md` (포인터) | `AUTOMATION-HEALTH.md` |
| skill 변경 | `SKILL-DOC-MATRIX.md` | `CLAUDE.md` (스킬 인덱스) |
| 아키텍처 결정 변경 | `ARCHITECTURE-DIAGRAMS.md` | `docs/ref/architecture/*.md` |
| parity 진행 | `11-FEATURE-PARITY-MATRIX.md` | `MISSING-AND-UNIMPLEMENTED.md` |

### 3. 실제 수정 실행

각 필수 문서에 대해:
1. 해당 파일을 읽는다
2. 변경 내용을 반영하는 최소 수정을 한다
3. **정본 1곳 원칙**: 같은 사실을 여러 문서에 반복하지 않는다. 상세는 정본에, 나머지는 "done" 한 줄 + 링크

### 4. Daily Log 동기화

- `docs/daily/MM-DD/page-<route-slug>.md` 체크박스를 현재 상태에 맞춤
- `docs/status/PAGE-UPGRADE-BOARD.md` 상태와 일관성 확인
- status flow: `Ready -> InProgress -> QA -> Done` (Hold 허용)

### 5. 검증 보고

```
## Doc Update Report

변경 파일: N개
갱신 문서: M개
- PROJECT-STATUS.md: (상태 반영)
- PAGE-UPGRADE-BOARD.md: (섹션 X 수정)
- Daily Log: (체크박스 동기화)
```

## 실행 방식

- 기본은 현재 에이전트가 직접 변경 범위 분류, 문서 수정, 검증 보고까지 수행한다.
- 서브에이전트는 사용자가 명시적으로 병렬 리뷰/위임을 요청했을 때만 사용한다.
- 단순 상태 한 줄/체크박스 동기화는 직접 처리하고, 대규모 drift 분석은 먼저 범위를 요약한 뒤 필요한 검증만 실행한다.

## 규칙

- `docs/status/*`는 구현과 충돌하면 구현을 먼저 확인하고 맞춘다
- PROJECT-STATUS.md는 거의 항상 갱신 대상이다
- trivial 변경(주석, 오탈자, 테스트만)이면 "문서 갱신 불필요"로 종료
- 이 커맨드는 점검만 하는 게 아니라 **실제 수정까지 실행**한다

현재 working tree의 모든 변경사항에 대해 자기 리뷰를 수행하세요.

## 수행 순서

### 1. 변경 범위 파악
- `git diff --stat`과 `git diff --cached --stat`으로 변경 파일, 추가/삭제 라인 수 집계
- untracked 파일 목록 (`git status --porcelain`)
- 변경 규모를 S/M/L/XL로 분류 (S: ~50줄, M: ~200줄, L: ~500줄, XL: 500줄+)

### 2. 타입 안전성
- `npx tsc --noEmit` 실행
- 에러가 있으면 리스트업 (pre-existing vs 신규 구분)

### 2.5. Diff 위생
- `git diff --check`로 trailing whitespace, conflict marker, whitespace error 확인
- staged 변경이 있으면 `git diff --cached --check`도 확인

### 3. 300줄 규칙 점검
- 변경된 TSX/TS 파일 중 300줄 초과인 파일 검출
- 400줄 초과면 경고 표시

### 4. 보안 체크
- 변경/추가된 파일에서 다음 패턴 검색:
  - 하드코딩된 API key, token, password, secret
  - `.env.local`, `.env` 파일이 커밋 대상에 포함되었는지
  - `dangerouslySetInnerHTML`, `eval(`, SQL 인젝션 가능 패턴

### 5. 미사용 코드
- 새로 추가된 import 중 실제 사용되지 않는 것 검출
- 새로 추가된 export 중 다른 파일에서 참조되지 않는 것 확인

### 6. 문서 정합성
- change class 분류 (route/schema/style/automation/skill/architecture)
- 변경 영역에 따라 필수 문서가 갱신되었는지 확인:
  - route/page → `PAGE-UPGRADE-BOARD.md`, `SKILL-DOC-MATRIX.md`
  - schema/edge → `SUPABASE-SCHEMA-INDEX.md`, `BACKEND-PLAN.md`
  - style/token → `ASSET-GUIDE.md`
  - automation/skill → `CLAUDE.md`, `SKILL-DOC-MATRIX.md`
- `docs/daily/MM-DD/page-*.md` 체크박스 상태가 Board 상태와 일치하는지 확인

### 7. 토큰 준수 점검
- 변경된 TSX/TS 파일에서 `styles/tokens.ts` 토큰 대신 하드코딩된 값 검출:
  - 하드코딩 hex 컬러 (#으로 시작)
  - 하드코딩 fontSize/spacing (숫자 + px/rem 직접 사용)
  - `styles/tokens`에서 import 없이 스타일 값 사용

### 8. 코드 품질 스팟체크
- 변경된 파일을 실제로 읽고 다음을 확인:
  - 에러 핸들링 누락 (try/catch 없는 async, unchecked null)
  - 하드코딩된 매직 넘버/스트링
  - 중복 코드 (같은 로직이 2곳 이상)
  - 불필요한 console.log
  - React key 누락, useEffect dependency 문제
  - TDS 컴포넌트 대신 raw RN 컴포넌트 사용

## 출력 포맷

```
## Self-Review Report

**변경 규모**: M (약 200줄, 15파일)

| 항목 | 결과 | 비고 |
|------|------|------|
| Typecheck | PASS/FAIL | |
| Diff hygiene | PASS/FAIL | |
| 300줄 규칙 | PASS/N건 | |
| 보안 체크 | PASS/N건 | |
| 미사용 코드 | PASS/N건 | |
| 문서 정합성 | PASS/N건 | |
| 토큰 준수 | PASS/N건 | |
| 코드 품질 | PASS/N건 | |

### 발견 사항
1. [severity] 파일:줄 — 설명
2. ...

### 추천 조치
- [ ] MUST: 조치 1
- [ ] SHOULD: 조치 2
```

## 규칙
- pre-existing 이슈는 발견 사항에 포함하되 [pre-existing] 태그를 붙임
- 추천 조치는 MUST와 SHOULD를 구분
- 리뷰는 사실 기반으로만 — 추측하지 않고 실제 코드를 읽고 판단

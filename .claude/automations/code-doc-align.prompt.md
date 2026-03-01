작업명: TaillogToss code-doc align (managed routes)
스케줄: 매일 03:30 (Asia/Seoul)

역할:
코드를 기준으로(Managed Routes) 문서/스킬 참조 정합성을 자동 점검·보정한다.
토큰을 최소화하기 위해 2단계 스캔만 수행한다.

프로젝트 루트:
- /mnt/c/Users/gmdqn/tosstaillog

진실원본 정책:
- 전체 라우트 진실원본: src/pages/**
- 관리 라우트 진실원본: src/components/shared/DevMenu.tsx 의 DEV_ROUTES.path

대상 파일:
- src/components/shared/DevMenu.tsx
- src/pages/**/*.tsx
- docs/status/PAGE-UPGRADE-BOARD.md
- docs/status/SKILL-DOC-MATRIX.md
- docs/daily/MM-DD/page-*.md
- .claude/skills/page-skills/page/**/SKILL.md
- .claude/skills/page-skills/feature/**/SKILL.md

출력:
- docs/status/INTEGRITY-REPORT.md
- docs/status/INTEGRITY-HISTORY.ndjson
- lock: docs/status/.code-doc-align.lock

핵심 원칙:
- 코드 우선 자동수정
- 스킬 파일 자동생성 금지 (누락은 manual_required)
- 변경 없으면 정확히 "변경 없음" 출력
- lock 해제 실패 시 released JSON으로 덮어쓰기
- DRY_RUN=true면 계획/카운트만 출력

실행 절차:
0) Lock 처리
- lock 존재 + running이면 종료: "다른 code-doc align run 진행 중"
- 시작 시 lock 생성
- 종료 시 lock 제거, 실패하면 {"status":"released","released_at":"<ISO>"} 덮어쓰기

1) 1차 스캔(저비용)
- 파일별 size+mtime 비교
- 이전 인덱스와 동일하면 본문 파싱 스킵

2) 2차 스캔(정밀)
- 변경 감지 파일만 본문 파싱
- 아래 집합 추출:
  - all_routes (src/pages)
  - managed_routes (DevMenu)
  - board_routes (PAGE-UPGRADE-BOARD)
  - matrix_routes (SKILL-DOC-MATRIX)

3) 정합 검사
- managed_routes == board_routes == matrix_routes
- matrix의 page_skill/feature_skill 경로 존재 확인
- matrix의 required_docs 경로 존재 확인
- all_routes - managed_routes는 unmanaged_routes로 분류

4) daily 체크박스 집계
- 입력: docs/daily/MM-DD/page-<route-slug>.md
- 상태 매핑:
  - 핵심 체크 0개 완료: Ready
  - 핵심 체크 일부 완료: InProgress
  - 구현 체크 완료 + 검증 일부 미완료: QA
  - 구현/검증 체크 모두 완료: Done
  - blocker 항목 존재: Hold

5) 자동 보정
- 우선순위:
  1. PAGE-UPGRADE-BOARD.md
  2. SKILL-DOC-MATRIX.md
- 누락 스킬은 생성하지 말고 manual_required에 기록

6) 리포트 기록
- INTEGRITY-REPORT.md 갱신
- INTEGRITY-HISTORY.ndjson append:
  run_at, managed_count, drift_count, auto_fixed_count, manual_required_count, unmanaged_routes, errors

7) 출력
- 변경 0건: 변경 없음
- 변경 있음:
  [code-doc align 완료] YYYY-MM-DD HH:mm
  - managed routes: X
  - drift: X
  - auto-fix: X
  - manual-required: X
  - unmanaged routes: X
  - errors: none 또는 <내용>

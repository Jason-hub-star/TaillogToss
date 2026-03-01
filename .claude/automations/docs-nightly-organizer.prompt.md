작업명: TaillogToss docs nightly organizer
  스케줄: 매일 22:00 (Asia/Seoul)

  역할:
  너는 아래 경로에서 docs 정리 자동화를 수행한다.

  프로젝트 루트:
  - /sessions/epic-intelligent-davinci/mnt/tosstaillog

  docs 경로:
  - /sessions/epic-intelligent-davinci/mnt/tosstaillog/docs

  목표:
  - docs를 ref/status/daily/weekly 구조로 유지
  - 7일+ 지난 daily 로그를 weekly 압축본으로 통합
  - CLAUDE.md 문서 참조 경로를 최신화
  - 변경 없으면 "변경 없음" 출력 후 종료

  안전 원칙:
  - 대상 경로에 이미 파일이 있으면 덮어쓰지 않고 스킵
  - weekly 압축 전, 대상 daily 폴더의 모든 .md 파일 내용을 반드시 읽고 요약
  - weekly 생성 성공 판정 전에는 daily 폴더 삭제 금지
  - status/PROJECT-STATUS.md는 절대 삭제 금지
  - 중복 실행 방지 lock 사용: docs/.docs-nightly.lock
  - DRY_RUN=true면 이동/삭제/파일수정 없이 계획과 카운트만 출력

  실행 절차:

  0) 사전 체크
  - lock 파일이 있으면 종료: "다른 nightly run 진행 중"
  - lock 생성 후 시작, 종료 시 lock 제거(오류 시에도 제거)

  1) 폴더 구조 보장 (없으면 생성)
  - docs/ref
  - docs/status
  - docs/daily
  - docs/weekly

  2) 영구 참조 문서 이동 (docs 루트 -> docs/ref)
  - BACKEND-PLAN.md
  - SCHEMA-B2B.md
  - ASSET-GUIDE.md
  - PRD-TailLog-B2B.md
  - PRD-TailLog-Toss.md
  - 10-MIGRATION-OPERATING-MODEL.md
  - 12-MIGRATION-WAVES-AND-GATES.md

  3) 상태판 문서 이동 (docs 루트 -> docs/status)
  - PROJECT-STATUS.md
  - 11-FEATURE-PARITY-MATRIX.md
  - MISSING-AND-UNIMPLEMENTED.md

  4) 날짜 폴더 이동 (docs 루트 -> docs/daily)
  - 폴더명이 M-DD 또는 MM-DD 패턴인 폴더만 이동
  - 동일 이름 폴더가 daily에 있으면 스킵
  - 숫자-숫자 형식이 아니면 이동하지 않음

  5) weekly 압축
  5-1. 대상 선정 규칙
  - 1순위: 폴더명 날짜(M-DD/MM-DD)를 Asia/Seoul 기준 오늘과 비교해 7일 초과인 폴더
  - 연도 롤오버 처리: MM-DD가 오늘보다 미래면 전년도 날짜로 간주
  - 2순위(fallback): 날짜 파싱 불가 폴더만 mtime +7로 판단
  - 대상 폴더를 ISO 주차(YYYY-WNN) 기준으로 그룹화

  5-2. 읽기/요약
  - 각 대상 폴더의 모든 .md 파일을 읽고 핵심 작업/결정/완료 항목 중심 요약
  - Parity ID(예: AAA-001 패턴) 추출 후 중복 제거 목록 작성

  5-3. weekly 파일 생성/병합
  - 파일명: docs/weekly/YYYY-WNN.md
  - 기존 파일이 없으면 신규 생성
  - 기존 파일이 있으면 덮어쓰기 금지, 같은 주차 항목 병합 업데이트
  - 포맷:
    # TaillogToss 주간 작업 로그 — YYYY년 MM월 WN주차
    ## 포함 날짜: MM/DD ~ MM/DD
    ### MM/DD (요일)
    [요약]
    ## 이번 주 완료 Parity ID
    - XXX-001: 내용

  5-4. 생성 성공 판정
  - weekly 파일 존재
  - 파일 크기 > 0
  - 필수 헤더 포함:
    - "# TaillogToss 주간 작업 로그"
    - "## 포함 날짜:"
    - "## 이번 주 완료 Parity ID"

  5-5. 삭제
  - 성공 판정 통과한 주차에 한해
  - "이번 run에서 실제 요약에 포함된 daily 폴더만" 삭제
  - 그 외 폴더 삭제 금지

  6) CLAUDE.md 갱신
  대상 파일:
  - /sessions/epic-intelligent-davinci/mnt/tosstaillog/CLAUDE.md

  수정 범위 제한:
  - "## 상세 상태/기록 문서" 섹션(표) 내부만 수정
  - 다른 섹션 수정 금지

  치환 규칙:
  - docs/PROJECT-STATUS.md -> docs/status/PROJECT-STATUS.md
  - docs/11-FEATURE-PARITY-MATRIX.md -> docs/status/11-FEATURE-PARITY-MATRIX.md
  - docs/MISSING-AND-UNIMPLEMENTED.md -> docs/status/MISSING-AND-UNIMPLEMENTED.md
  - docs/BACKEND-PLAN.md -> docs/ref/BACKEND-PLAN.md
  - docs/SCHEMA-B2B.md -> docs/ref/SCHEMA-B2B.md
  - docs/ASSET-GUIDE.md -> docs/ref/ASSET-GUIDE.md
  - docs/10-MIGRATION-OPERATING-MODEL.md -> docs/ref/10-MIGRATION-OPERATING-MODEL.md
  - 이번 실행에서 생성/갱신된 docs/weekly/YYYY-WNN.md가 있으면 표에 추가
  - 표 안의 존재하지 않는 파일 경로 항목 제거

  7) 무결성 검증
  - docs/status/PROJECT-STATUS.md 존재 확인(없으면 실패 종료)
  - 루트 docs 구경로 직접 참조 잔존 여부 점검
  - weekly 파일 포맷 검증 실패 시 삭제/갱신 롤백 또는 실패 처리

  8) 실행 로그 기록
  - docs/status/NIGHTLY-RUN-LOG.md에 아래 항목 append:
    - run_at
    - dry_run
    - ref 이동 수
    - status 이동 수
    - daily 이동 수
    - weekly 생성/갱신 파일명
    - 삭제된 daily 수
    - 오류 요약(없으면 none)

  9) 결과 출력
  - 변경 0건:
    변경 없음

  - 변경 있음:
    [docs/ 정리 완료] YYYY-MM-DD 22:00
    - ref/로 이동: X개 파일
    - status/로 이동: X개 파일
    - daily/로 이동: X개 폴더
    - weekly/ 압축: YYYY-WNN.md 생성/갱신 (X개 폴더 -> 1개 파일)
    - 삭제된 daily/ 폴더: X개
    - 현재 docs/ 파일 수: XX개
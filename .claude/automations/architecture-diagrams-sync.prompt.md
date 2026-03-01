작업명: TaillogToss architecture diagrams sync
스케줄: 매일 04:00 (Asia/Seoul)

역할:
토스 인앱 아키텍처 다이어그램 문서 세트를 코드/문서 진실원본과 동기화한다.
변경이 없으면 "변경 없음"을 출력한다.

프로젝트 루트:
- /mnt/c/Users/gmdqn/tosstaillog

대상 문서:
- docs/ref/ARCHITECTURE-DIAGRAMS.md
- docs/ref/architecture/01-system-topology.md
- docs/ref/architecture/02-auth-sequence.md
- docs/ref/architecture/03-iap-points-sequence.md
- docs/ref/architecture/04-b2b-reporting-flow.md
- docs/ref/architecture/05-data-rls-boundary.md
- docs/ref/architecture/06-runtime-deploy-observability.md

실행 산출물:
- docs/status/ARCHITECTURE-DIAGRAM-SYNC-LOG.md (최신 실행 요약, 덮어쓰기)
- docs/status/ARCHITECTURE-DIAGRAM-SYNC-HISTORY.ndjson (실행 이력 append)
- lock: docs/ref/.architecture-sync.lock

환경 변수:
- DRY_RUN=true: 파일 수정 없이 점검/계획/카운트만 출력

안전 원칙 (MUST):
- 코드 파일 수정 금지 (`src/`, `Backend/`, `supabase/` 수정 금지)
- 다이어그램 문서 외 범위 수정 금지
- lock 파일은 실행 시작 시 생성, 종료 시 해제
- lock 해제 실패 시 내용 덮어쓰기:
  {"status":"released","released_at":"<ISO>"}
- mermaid 블록 깨지면 반영 금지
- 변경 없으면 정확히 "변경 없음" 출력

실행 절차:

0) Lock 처리
- lock 존재 + running이면 종료: "다른 architecture sync run 진행 중"
- lock 없으면 생성
- 종료 시 lock 제거 (실패 시 released 덮어쓰기)

1) 인덱스/헤더 구조 검증
- `docs/ref/ARCHITECTURE-DIAGRAMS.md` 존재 확인
- `docs/ref/architecture/*.md` 6개 존재 확인
- 각 분할 문서에 아래 헤더 존재 확인:
  - Diagram-ID
  - Owner
  - Last-Verified
  - Parity-IDs
  - Source-of-Truth
  - Update-Trigger

2) 변경 감지 (저비용 1차)
- 각 다이어그램의 Source-of-Truth 경로를 읽어 size+mtime 수집
- 이전 실행 메타(없으면 최초실행)와 비교
- 동일하면 해당 다이어그램 본문 파싱/재생성 스킵

3) 정밀 동기화 (2차)
- 변경 감지된 다이어그램만 업데이트
- 규칙:
  - Diagram-ID/파일명/섹션 순서 유지
  - mermaid 코드블록 1개 이상 유지
  - Source-of-Truth 목록은 실제 경로만 남김
  - Last-Verified를 현재 날짜(Asia/Seoul)로 갱신
- 비변경 다이어그램은 untouched

4) 인덱스 동기화
- `ARCHITECTURE-DIAGRAMS.md`의 표를 실제 파일 상태와 동기화
- 각 row의 `last_verified`, `status(ok/stale)` 갱신
- 누락 파일/경로가 있으면 status=`stale` 및 메모 기록

5) 품질 게이트
- mermaid fence(````mermaid`) 유효성 확인
- Source-of-Truth 경로 존재 확인
- 깨진 링크/파일 있으면 해당 diagram 반영 롤백하고 stale 처리

6) 실행 로그 기록
- `docs/status/ARCHITECTURE-DIAGRAM-SYNC-LOG.md` 덮어쓰기:
  - run_at
  - dry_run
  - scanned_diagrams
  - changed_diagrams
  - stale_diagrams
  - errors
- `docs/status/ARCHITECTURE-DIAGRAM-SYNC-HISTORY.ndjson` append:
  {"run_at":"<ISO>","dry_run":false,"scanned":6,"changed":N,"stale":N,"errors":[]}

7) 결과 출력
- 변경 0건:
  변경 없음

- 변경 있음:
  [architecture sync 완료] YYYY-MM-DD HH:mm
  - scanned diagrams: 6
  - changed diagrams: X
  - stale diagrams: X
  - index updated: yes/no
  - errors: none 또는 <내용>

운영 규칙:
- 이 자동화는 다이어그램 문서 정합만 담당한다.
- 코드/DB 스키마 변경은 별도 자동화(`code-doc-align`, `docs-nightly-organizer`)가 담당한다.

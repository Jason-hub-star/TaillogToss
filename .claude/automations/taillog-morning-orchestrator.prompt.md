# TaillogToss Morning Orchestrator

작업명: TaillogToss 모닝 오케스트레이터
스케줄: 매일 02:00 (Asia/Seoul)

역할:
아래 TASK 목록을 순서대로 실행하고 종합 결과를 보고한다.
각 TASK는 독립 실행이며, 하나가 실패해도 다음 TASK는 반드시 계속 진행한다.

프로젝트 루트:
- /sessions/<current-session>/mnt/TaillogToss
  (실행 시점에 마운트된 실제 경로로 대체)

lock: docs/status/.morning-orchestrator.lock

---

## 공통 원칙 (MUST)

- lock 존재 + running이면 즉시 종료: "모닝 오케스트레이터 이미 실행 중"
- lock 없으면 시작 시 생성, 종료 시 해제
- lock 해제 실패 시 {"status":"released","released_at":"<ISO>"} 덮어쓰기
- DRY_RUN=true면 각 TASK도 DRY_RUN=true로 전달
- 각 TASK 결과(변경 없음 / 완료 / 오류)를 RESULTS 배열에 기록

---

## TASK 실행 방법

각 TASK에 대해:
1. 아래 지정된 prompt 파일을 Read 도구로 읽는다
2. 파일의 지침을 그대로 실행한다 (프로젝트 루트만 현재 세션 경로로 치환)
3. 결과를 RESULTS에 기록한다
4. 다음 TASK로 진행한다

---

## TASK 목록 (순서 고정)

### TASK 1: 드리프트 점검 (taillog-daily-guard)

직접 실행 (프롬프트 파일 없음, 아래 절차를 따름):

**목적**: 전일 git log 기반 코드↔문서 정합성 점검. 월요일에는 autoresearch 추가.

실행:
1. `git log --since="yesterday" --until="now" --name-only --pretty=format:""` 실행
2. 변경된 src/**/*.tsx 목록 추출
3. 각 변경 파일에 대응하는 docs/status/PAGE-UPGRADE-BOARD.md 항목 상태 확인
4. 불일치(코드 변경됐으나 board 미반영) 항목을 docs/status/DRIFT-REPORT.md 에 append
5. 월요일(Asia/Seoul 기준)이면 추가 실행:
   - Supabase/Next.js/FastAPI/UX 관련 최신 변경 사항 5개 요약
   - docs/weekly/autoresearch-YYYY-WNN.md 에 저장

출력:
- 드리프트 없음: "TASK 1: 변경 없음"
- 드리프트 있음: "TASK 1: drift N건 → docs/status/DRIFT-REPORT.md"

---

### TASK 2: code-doc-align

프롬프트 파일: `.claude/automations/code-doc-align.prompt.md`
실행: 해당 파일을 Read로 읽고 지침 그대로 실행

---

### TASK 3: architecture-diagrams-sync

프롬프트 파일: `.claude/automations/architecture-diagrams-sync.prompt.md`
실행: 해당 파일을 Read로 읽고 지침 그대로 실행

---

### TASK 4: training-data-pipeline (skills-web-enrichment-7day)

프롬프트 파일: `.claude/automations/skills-web-enrichment-7day.prompt.md`
실행: 해당 파일을 Read로 읽고 지침 그대로 실행

주의: 이 TASK는 자체 lock(src/lib/data/.pipeline.lock)을 가짐.
      lock 충돌 시 "TASK 4: 스킵 (파이프라인 실행 중)" 기록 후 TASK 5로 진행.

---

### TASK 5: automation-health-monitor

프롬프트 파일: `.claude/automations/automation-health-monitor.prompt.md`
실행: 해당 파일을 Read로 읽고 지침 그대로 실행 (항상 마지막에 실행)

---

## 종합 결과 출력

모든 TASK 완료 후:

```
[모닝 오케스트레이터 완료] YYYY-MM-DD HH:mm (Asia/Seoul)
- TASK 1 drift-guard:   <결과 한 줄>
- TASK 2 code-doc-align: <결과 한 줄>
- TASK 3 arch-sync:      <결과 한 줄>
- TASK 4 data-pipeline:  <결과 한 줄>
- TASK 5 health-monitor: <결과 한 줄>
이슈: <없음 | N건 — 상세: docs/status/AUTOMATION-HEALTH.md>
```

---

## 이력 기록

docs/status/MORNING-ORCHESTRATOR-LOG.md 에 append:

```
## YYYY-MM-DD HH:mm
| TASK | 결과 | 비고 |
|------|------|------|
| drift-guard    | 변경 없음 / drift N건 | |
| code-doc-align | 변경 없음 / fix N건   | |
| arch-sync      | 변경 없음 / changed N | |
| data-pipeline  | 변경 없음 / published vXXX | |
| health-monitor | N개 정상 / 이슈 N건   | |
```

작업명: TaillogToss 자동화 상태 감시 (Automation Health Monitor)
스케줄: 매일 09:30 (Asia/Seoul)

역할:
.claude/automations/ 디렉터리의 모든 *.prompt.md 파일을 스캔하고,
각 자동화의 실행 건강 상태를 점검하여 이상 여부를 보고한다.
새 자동화가 추가되면 레지스트리에 항목을 추가하고 자동으로 감시 범위에 포함시킨다.

프로젝트 루트:
- /mnt/c/Users/gmdqn/tosstaillog

출력:
- docs/status/AUTOMATION-HEALTH.md  (최신 상태 보고서, 매 실행마다 덮어쓰기)
- docs/status/AUTOMATION-HEALTH-HISTORY.ndjson  (이력 누적 append)

안전 원칙:
- 이 감시 스크립트는 읽기 전용 점검만 수행한다 (파일 수정 금지)
- lock 파일은 상태 확인만 하고 절대 수정·삭제하지 않는다
- DRY_RUN=true면 파일 쓰기 없이 콘솔 출력만 한다

---

## 자동화 레지스트리 (MUST)

⚠️ 새 자동화(.prompt.md) 추가 시 반드시 이 JSON 레지스트리에도 항목 추가.
   미등록 파일은 UNREGISTERED 경고로 보고됨.

항목 필드 설명:
  name          : 식별용 이름 (영문)
  file          : .claude/automations/ 내 파일명
  task_id       : 등록된 scheduled task ID (없으면 null)
  schedule_kr   : 스케줄 설명 (사람이 읽는 용)
  lock          : lock 파일 경로 (프로젝트 루트 기준, 없으면 null)
  freshness_hours : 정상 허용 최신성(시간) — 스케줄 주기 + 여유 2시간 권장
  artifacts     : 건강 판단에 사용할 주요 출력 파일 경로 목록 (프로젝트 루트 기준)
                  mtime이 freshness_hours 이내이면 최신으로 판단

```json
[
  {
    "name": "docs-nightly-organizer",
    "file": "docs-nightly-organizer.prompt.md",
    "task_id": "daily-docs-slim",
    "schedule_kr": "매일 22:00 (Asia/Seoul)",
    "lock": "docs/.docs-nightly.lock",
    "freshness_hours": 26,
    "artifacts": [
      "docs/status/NIGHTLY-RUN-LOG.md"
    ]
  },
  {
    "name": "code-doc-align",
    "file": "code-doc-align.prompt.md",
    "task_id": "taillogtoss-code-doc-align",
    "schedule_kr": "매일 03:30 (Asia/Seoul)",
    "lock": "docs/status/.code-doc-align.lock",
    "freshness_hours": 26,
    "artifacts": [
      "docs/status/INTEGRITY-REPORT.md",
      "docs/status/INTEGRITY-HISTORY.ndjson"
    ]
  },
  {
    "name": "skills-web-enrichment-7day",
    "file": "skills-web-enrichment-7day.prompt.md",
    "task_id": "taillogtoss-training-data-pipeline",
    "schedule_kr": "매일 03:00 (Asia/Seoul)",
    "lock": "src/lib/data/.pipeline.lock",
    "freshness_hours": 26,
    "artifacts": [
      "src/lib/data/catalog.json",
      "src/lib/data/CHANGELOG.ndjson"
    ]
  },
  {
    "name": "architecture-diagrams-sync",
    "file": "architecture-diagrams-sync.prompt.md",
    "task_id": "taillogtoss-architecture-diagrams-sync",
    "schedule_kr": "매일 04:00 (Asia/Seoul)",
    "lock": "docs/ref/.architecture-sync.lock",
    "freshness_hours": 26,
    "artifacts": [
      "docs/status/ARCHITECTURE-DIAGRAM-SYNC-LOG.md",
      "docs/status/ARCHITECTURE-DIAGRAM-SYNC-HISTORY.ndjson"
    ]
  }
]
```

---

## 점검 절차

### 0) 사전 준비
- 현재 시각(Asia/Seoul) 기록: YYYY-MM-DD HH:mm
- 프로젝트 루트 확인: /mnt/c/Users/gmdqn/tosstaillog
- docs/status/ 디렉터리 없으면 생성

### 1) 자동화 파일 스캔
- .claude/automations/*.prompt.md 파일 목록 수집
- 이 감시 파일(automation-health-monitor.prompt.md) 자체는 목록에서 제외
- 실제 파일 목록 vs 레지스트리 파일 목록 비교:
  - 레지스트리에 있지만 파일 없음 → FILE_MISSING 경고
  - 파일은 있지만 레지스트리에 없음 → UNREGISTERED 경고

### 2) 각 자동화 건강 점검

레지스트리의 각 항목에 대해 아래 순서로 점검:

2-1. 파일 존재 확인
  - .claude/automations/{file} 존재 → OK / 없음 → FILE_MISSING

2-2. Lock 상태 점검 (lock 경로가 null이면 스킵)
  - lock 파일 없음 → LOCK_CLEAR (정상)
  - lock 내용이 {"status":"released",...} 포함 → LOCK_RELEASED (정상)
  - lock 내용이 running/locked_at이고 생성 시간이 현재 기준 2시간 이내 → LOCK_RUNNING (실행 중, 이상 아님)
  - lock 내용이 running/locked_at이고 생성 시간이 2시간 초과 → LOCK_STUCK (비정상 잠금, 이슈)
  - lock 파일 읽기 불가 → LOCK_UNKNOWN

2-3. 아티팩트 최신성 점검
  각 artifact 경로에 대해:
  - 파일 없음 → ARTIFACT_MISSING
  - mtime이 freshness_hours 이내 → ARTIFACT_FRESH
  - mtime이 freshness_hours 초과 → ARTIFACT_STALE
  가장 최근 mtime을 "최신 실행 시각"으로 기록

2-4. 종합 상태 판정
  - HEALTHY   : lock 정상(CLEAR/RELEASED), 모든 artifact FRESH
  - RUNNING   : lock RUNNING (현재 실행 중, 이상 아님)
  - STALE     : lock 정상이지만 artifact STALE (실행은 됐으나 오래됨)
  - MISSING   : 핵심 artifact가 하나 이상 ARTIFACT_MISSING
  - STUCK     : lock LOCK_STUCK (비정상 잠금)
  - FILE_MISSING : .prompt.md 파일 자체 없음

### 3) 보고서 작성

docs/status/AUTOMATION-HEALTH.md 를 아래 형식으로 덮어쓰기:

```
# 자동화 상태 보고서

점검 시각: YYYY-MM-DD HH:mm (Asia/Seoul)
총 자동화: N개 | 정상: N개 | 이슈: N개 | 미등록: N개

## 상태 요약

| 자동화 | 스케줄 | 상태 | Lock | 최신 실행 | 메모 |
|--------|--------|------|------|-----------|------|
| docs-nightly-organizer | 매일 22:00 | ✅ HEALTHY | CLEAR | MM-DD HH:mm | |
| code-doc-align | 매일 03:30 | ✅ HEALTHY | CLEAR | MM-DD HH:mm | |
| skills-web-enrichment-7day | 매일 03:00 | ⚠️ STALE | CLEAR | MM-DD HH:mm | artifact 26h 초과 |

상태 아이콘: ✅ HEALTHY / 🔄 RUNNING / ⚠️ STALE / ❌ MISSING / 🔒 STUCK / ❓ FILE_MISSING

## 미등록 파일
- (없으면 "없음")

## 이슈 상세
- (이슈 없으면 "이슈 없음")
- 이슈 있으면 자동화별로 원인과 확인 방법 기재
```

### 4) 이력 기록

docs/status/AUTOMATION-HEALTH-HISTORY.ndjson 에 아래 형식으로 1줄 append:

```json
{"checked_at":"<ISO>","summary":{"total":N,"healthy":N,"running":N,"stale":N,"missing":N,"stuck":N,"file_missing":N,"unregistered":N},"details":[{"name":"...","status":"HEALTHY","lock":"CLEAR","latest_artifact_at":"<ISO>","artifacts_checked":N},...]}
```

### 5) 결과 출력

이슈 없음:
```
[자동화 감시 완료] YYYY-MM-DD HH:mm
전체 N개 자동화 정상 ✅
```

이슈 있음:
```
[자동화 감시 완료] YYYY-MM-DD HH:mm
⚠️ 이슈 감지: N개

- {automation_name}: {STATUS} — {간단한 이유}
  예: code-doc-align: STALE — INTEGRITY-REPORT.md 마지막 갱신 32h 전

상세: docs/status/AUTOMATION-HEALTH.md
```

미등록 파일 발견 시 추가 출력:
```
🆕 레지스트리 미등록 파일: {파일명}
   → automation-health-monitor.prompt.md 레지스트리에 항목 추가 필요
```

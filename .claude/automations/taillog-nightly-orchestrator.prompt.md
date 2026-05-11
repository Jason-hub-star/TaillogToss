# TaillogToss Nightly Orchestrator

작업명: TaillogToss 나이틀리 오케스트레이터
스케줄: 매일 22:00 (Asia/Seoul)

역할:
아래 TASK 목록을 순서대로 실행하고 종합 결과를 보고한다.
각 TASK는 독립 실행이며, 하나가 실패해도 다음 TASK는 반드시 계속 진행한다.

프로젝트 루트:
- /sessions/<current-session>/mnt/TaillogToss
  (실행 시점에 마운트된 실제 경로로 대체)

lock: docs/status/.nightly-orchestrator.lock

---

## 공통 원칙 (MUST)

- lock 존재 + running이면 즉시 종료: "나이틀리 오케스트레이터 이미 실행 중"
- lock 없으면 시작 시 생성, 종료 시 해제
- lock 해제 실패 시 {"status":"released","released_at":"<ISO>"} 덮어쓰기
- DRY_RUN=true면 각 TASK도 DRY_RUN=true로 전달

---

## TASK 실행 방법

각 TASK에 대해:
1. 아래 지정된 prompt 파일을 Read 도구로 읽는다
2. 파일의 지침을 그대로 실행한다 (프로젝트 루트만 현재 세션 경로로 치환)
3. 결과를 RESULTS에 기록한다
4. 다음 TASK로 진행한다

---

## TASK 목록 (순서 고정)

### TASK 1: vision-labeling (강아지 행동 Vision 라벨링)

직접 실행 (아래 절차를 따름):

**목적**: TailLog 앱에서 수집된 강아지 행동 영상/이미지에 대한 자동 Vision 라벨링.

실행:
1. Supabase MCP로 미라벨링 레코드 조회:
   ```sql
   SELECT id, video_url, image_url, recorded_at
   FROM dog_behavior_logs
   WHERE vision_label IS NULL
     AND created_at >= NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC
   LIMIT 20;
   ```
2. 각 레코드에 대해 Vision으로 행동 분류 (barking/aggression/separation_anxiety/destructive/fear/hyperactivity/marking/normal)
3. 분류 결과 Supabase에 업데이트:
   ```sql
   UPDATE dog_behavior_logs
   SET vision_label = '<분류>', vision_labeled_at = NOW()
   WHERE id = '<id>';
   ```
4. 처리 결과를 docs/status/VISION-LABEL-LOG.md 에 append

출력:
- 대상 없음: "TASK 1: 변경 없음"
- 처리됨: "TASK 1: vision 라벨링 N건 완료"
- DB 오류: "TASK 1: 오류 — <메시지>"

---

### TASK 2: docs-nightly-organizer

프롬프트 파일: `.claude/automations/docs-nightly-organizer.prompt.md`
실행: 해당 파일을 Read로 읽고 지침 그대로 실행

주의: 이 TASK는 자체 lock(docs/.docs-nightly.lock)을 가짐.
      lock 충돌 시 "TASK 2: 스킵 (다른 nightly run 진행 중)" 기록 후 완료.

---

## 종합 결과 출력

모든 TASK 완료 후:

```
[나이틀리 오케스트레이터 완료] YYYY-MM-DD HH:mm (Asia/Seoul)
- TASK 1 vision-labeling:     <결과 한 줄>
- TASK 2 docs-nightly-organizer: <결과 한 줄>
이슈: <없음 | N건>
```

---

## 이력 기록

docs/status/NIGHTLY-RUN-LOG.md 에 아래 형식으로 append (기존 docs-nightly-organizer 로그와 통합):

```
## YYYY-MM-DD 22:00 [오케스트레이터]
- vision-labeling: N건 / 변경 없음 / 오류
- docs-organizer: ref N / status N / weekly N / daily-삭제 N
```

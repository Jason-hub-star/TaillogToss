# TaillogToss Weekly Orchestrator

작업명: TaillogToss 위클리 오케스트레이터
스케줄: 매주 금요일 10:00 (Asia/Seoul)

역할:
아래 TASK 목록을 순서대로 실행하고 종합 결과를 보고한다.
각 TASK는 독립 실행이며, 하나가 실패해도 다음 TASK는 반드시 계속 진행한다.

프로젝트 루트:
- /Users/family/jason/TaillogToss

lock: docs/status/.weekly-orchestrator.lock

---

## 공통 원칙 (MUST)

- lock 존재 + running이면 즉시 종료: "위클리 오케스트레이터 이미 실행 중"
- lock 없으면 시작 시 생성, 종료 시 해제
- lock 해제 실패 시 {"status":"released","released_at":"<ISO>"} 덮어쓰기
- 매월 첫째 주 금요일이면 각 TASK에 MONTHLY_RUN=true 전달

---

## TASK 실행 방법

각 TASK에 대해:
1. 아래 지정된 prompt 파일을 Read 도구로 읽는다
2. 파일의 지침을 그대로 실행한다 (프로젝트 루트만 현재 세션 경로로 치환)
3. 결과를 RESULTS에 기록한다
4. 다음 TASK로 진행한다

---

## TASK 목록 (순서 고정)

### TASK 1: training-data-maintenance

프롬프트 파일: `.claude/automations/training-data-maintenance.prompt.md`
실행: 해당 파일을 Read로 읽고 지침 그대로 실행

매월 첫째 주 금요일: STEP 3 (갭 분석) 추가 실행

---

### TASK 2: coaching-finetune-review

프롬프트 파일: `.claude/automations/weekly-coaching-finetune-review.md`
실행: 해당 파일을 Read로 읽고 지침 그대로 실행

(기존 일요일 → 금요일로 통합. training-data-maintenance 직후 실행하면
같은 날 훈련 데이터 현황을 바탕으로 검수 결정 가능.)

---

## 종합 결과 출력

모든 TASK 완료 후:

```
[위클리 오케스트레이터 완료] YYYY-MM-DD HH:mm (Asia/Seoul)
- TASK 1 training-maintenance: <결과 한 줄>
- TASK 2 finetune-review:      <결과 한 줄>
이슈: <없음 | 내용>
```

Fine-tuning 준비 완료(approved >= 50건) 시 추가 출력:
```
📦 Fine-tuning 배치 준비 완료: N건
   '훈련 배치 실행해줘'라고 말씀해주세요.
```

---

## 이력 기록

docs/status/TRAINING-DATA-LOG.md 에 주간 섹션 append (기존 포맷 유지):

```markdown
## 주간 리포트: YYYY-MM-DD (W{week}) [오케스트레이터]
...
```

# TaillogToss 주간 훈련 데이터 검수 + Fine-tuning 준비

스케줄: taillog-weekly-orchestrator TASK 2

## 목적

주간 생성된 합성+실사용자 코칭 후보를 검토하고
Fine-tuning 배치 준비 상태를 보고한다.

## 단계

### 0. 누적 현황 확인 (Supabase MCP 실행)

```sql
SELECT
  COUNT(*) as total_candidates,
  COUNT(*) FILTER (WHERE training_approved) as approved,
  COUNT(*) FILTER (WHERE is_synthetic) as synthetic,
  COUNT(*) FILTER (WHERE NOT is_synthetic) as real_user,
  ROUND(AVG(training_quality_score)) as avg_score
FROM ai_coaching
WHERE training_candidate = TRUE;
```

→ approved < 50건: "Fine-tuning 준비 부족" 상태 표시
→ approved >= 50건: "Fine-tuning 준비 완료" + 주인님께 알림

### 1. 이번 주 합성 생성 요약

```sql
SELECT
  category,
  COUNT(*) as runs,
  SUM(generated_count) as total_generated,
  MIN(run_date) as first_run,
  MAX(run_date) as last_run
FROM coaching_synthetic_log
WHERE run_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY category
ORDER BY total_generated DESC;
```

### 2. 품질 분포 리포트

```sql
SELECT
  (training_quality_score / 10) * 10 as score_bucket,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct
FROM ai_coaching
WHERE training_candidate = TRUE AND training_approved = FALSE
GROUP BY 1
ORDER BY 1;
```

### 3. 검수 대상 목록 (상위 10건)

```sql
SELECT
  id,
  is_synthetic,
  training_quality_score,
  feedback_score,
  created_at::date as date,
  blocks->'dog_voice'->>'message' as dog_voice_preview,
  blocks->'risk_signals'->>'overall_risk' as risk
FROM ai_coaching
WHERE training_candidate = TRUE AND training_approved = FALSE
ORDER BY training_quality_score DESC
LIMIT 10;
```

### 4. 결과 저장 (자동)

`docs/status/TRAINING-DATA-LOG.md` 주간 섹션 추가:

```markdown
## 주간 리포트: YYYY-MM-DD (W{week})

### 누적 현황
- 전체 후보: N건
- 승인 완료: N건
- 합성 데이터: N건 / 실사용자: N건
- 평균 품질 점수: N점

### 이번 주 생성
| 카테고리 | 생성 건수 |
|---------|---------|
| barking | N |
| ... | ... |

### Fine-tuning 상태
- [ ] 준비 부족 (< 50건)
- [ ] 준비 완료 (>= 50건) → 주인님 승인 대기
```

### 5. Fine-tuning 준비 완료 시 알림

approved >= 50건이면:
```
📦 Fine-tuning 배치 준비 완료: N건
   '훈련 배치 실행해줘'라고 말씀해주세요.
   실행 명령:
   POST /api/v1/coaching/admin/export-jsonl?batch_name=2026-WXX
```

## 운영자 검수 방법

검수 후 승인 (관리자 API):
```http
POST /api/v1/coaching/admin/training-candidates/{coaching_id}/review
X-Admin-Key: {ADMIN_API_KEY 환경변수 값}
Content-Type: application/json

{"approved":true,"training_version":"2026-04-W{week}"}
```

반려 (낮은 품질):
```http
POST /api/v1/coaching/admin/training-candidates/{coaching_id}/review
X-Admin-Key: {ADMIN_API_KEY 환경변수 값}
Content-Type: application/json

{"approved":false,"quality_score":45}
```

## 비용 절감 타임라인 참조

| 기간 | 누적 | 목표 |
|------|------|------|
| 1개월 | ~90건 | Fine-tuning 1차 가능 |
| 3개월 | ~300건 | 2차 배치 |
| 6개월 | ~600건 | Rule engine 강화 |
| 1년 | ~2000건+ | 비용 곡선 역전 |

# TaillogToss 매일 합성 코칭 훈련 데이터 생성

스케줄: 매일 08:00 (Asia/Seoul)

## 목적

실 사용자 없이도 카테고리별 합성 개 프로필로 코칭을 생성해
Fine-tuning용 훈련 데이터를 매일 축적한다.
7개 카테고리를 순환하며 하루 3건씩 생성.

## 카테고리 순환표

| day % 7 | 카테고리 |
|---------|---------|
| 0 | barking (짖음) |
| 1 | aggression (공격성) |
| 2 | separation_anxiety (분리불안) |
| 3 | destructive (파괴행동) |
| 4 | fear (공포심) |
| 5 | hyperactivity (과잉활동) |
| 6 | marking (마킹/배변) |

## 단계

### 0. 오늘 이미 실행됐는지 확인

FastAPI가 내부적으로 coaching_synthetic_log.run_date = CURRENT_DATE 체크.
`generate_synthetic_today` 응답에 `skipped: true`가 오면 즉시 종료.

### 1. 합성 코칭 생성 (FastAPI 호출)

```
POST ${BACKEND_BASE_URL:-http://localhost:8765}/api/v1/coaching/admin/generate-synthetic
X-Admin-Key: {ADMIN_API_KEY 환경변수 값}
```

응답 예시:
```json
{
  "category": "barking",
  "generated": 3,
  "tagged": 3,
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

→ 카테고리별 3개 프로필로 코칭 생성 (is_synthetic=TRUE)
→ 품질 점수 계산 + training_candidate 태깅 포함

### 2. 미점수 레코드 일괄 태깅 (선택적)

이전 실패분이 있을 경우 보정:
```
POST ${BACKEND_BASE_URL:-http://localhost:8765}/api/v1/coaching/admin/tag-candidates
X-Admin-Key: {ADMIN_API_KEY 환경변수 값}
```

### 3. 결과 기록

`docs/status/TRAINING-DATA-LOG.md` 업데이트:

```markdown
## YYYY-MM-DD 합성 생성 결과
- 카테고리: {category}
- 생성: {generated}건
- 후보 태깅: {tagged}건 (70점 이상)
- 누적 후보 총계: (SELECT COUNT(*) FROM ai_coaching WHERE training_candidate = TRUE)건
```

### 4. 종료 조건

- `skipped: true` 응답 → "오늘 이미 실행됨" 기록 후 종료
- FastAPI 오류 → 오류 내용 TRAINING-DATA-LOG.md에 기록 후 종료 (파이프라인 중단 금지)
- 자동 적용 범위: TRAINING-DATA-LOG.md 업데이트만
- 주인님 승인 필요: `POST /api/v1/coaching/admin/training-candidates/{coaching_id}/review`, fine-tuning 실행

## 검증 쿼리

```sql
-- 오늘 생성 확인
SELECT category, generated_count, created_at
FROM coaching_synthetic_log
WHERE run_date = CURRENT_DATE;

-- 누적 후보 현황
SELECT
  COUNT(*) FILTER (WHERE training_candidate) as candidates,
  COUNT(*) FILTER (WHERE training_approved) as approved,
  ROUND(AVG(training_quality_score)) as avg_score
FROM ai_coaching
WHERE is_synthetic = TRUE;
```

# 2026-05-04 — FastAPI 서버사이드 E2E 테스트 결과

## 환경
- FastAPI: `http://127.0.0.1:8765` (uvicorn --reload)
- 테스트 유저: `mock_stable_user_001` (ID: `0579da6b-b04c-4723-a46c-09fcb4b395d4`)
- 테스트 강아지: `테스트멍` (ID: `37246130-6176-481d-bb52-4af16c694779`)

## 테스트 결과

| # | 엔드포인트 | 상태 | 비고 |
|---|---|---|---|
| 1 | `GET /api/v1/dogs/` | ✅ | 강아지 2마리 반환 |
| 2 | `GET /api/v1/settings/` | ✅ | JSONB 파싱 정상 |
| 3 | `PATCH /api/v1/settings/` | ✅ | ai_persona 왕복 검증 (JSONB 500 픽스 확인) |
| 4 | `GET /api/v1/dashboard/` | ✅ | dog_profile + stats + recent_logs |
| 5 | `POST /api/v1/logs/quick` | ✅ | behavior_type + category + intensity → DB 저장 |
| 6 | `GET /api/v1/logs/{dog_id}` | ✅ | 저장된 로그 조회 확인 |
| 7 | `GET /api/v1/dogs/{id}/behavior-analytics` | ✅ | total_logs + top_behaviors 반환 |
| 8 | `POST /api/v1/onboarding/survey/stage1` | ✅ | 강아지 생성 (sex=MALE 대문자 ENUM) |
| 9 | `POST /api/v1/onboarding/survey/stage2/{id}` | ✅ | completion_stage=2, 60% |
| 10 | `POST /api/v1/onboarding/survey/stage3/{id}` | ✅ | completion_stage=3, 100% |
| 11 | `POST /api/v1/coaching/generate` | ✅ | stage<2 → rule-based 3블록, stage3 → 4블록 |
| 12 | `PATCH /api/v1/coaching/{id}/feedback` | ✅ | rating=5, comment 저장 |
| 13 | `POST /api/v1/subscription/iap/verify` | ✅ | proxy→Edge→mock, grant_status=granted |

## 발견 사항
- `DogSex` enum: BE는 `MALE`/`FEMALE`/`MALE_NEUTERED`/`FEMALE_NEUTERED` 대문자 — FE `types/dog.ts`도 동일 대문자 ✅ 불일치 없음
- `GET /api/v1/subscription/` → null (미결제 유저 정상)
- `POST /api/v1/training/status` → `stage_id` 필수 (테스트 payload 오류, 앱 정상 경로 무관)

## 잔여 검증 항목
- [ ] 실기기(앱) 로그 API E2E
- [ ] 실기기(앱) 코칭 생성 E2E
- [ ] 실기기 결제 UI 3시나리오

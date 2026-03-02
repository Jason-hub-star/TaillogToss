# `page-onboarding-survey-upgrade` (2026-03-02)

## Goal
- **Parity ID:** UIUX-004 (Onboarding Survey Parity)
- **Target:** `/onboarding/survey`
- **Issue:** 현재 `SurveyData`의 방대한 입력값(환경, 문제행동 등)이 UI에만 머물고 DB(`dog_env`)에 저장되지 않아 유실됨. 사용자 입력 피로도 높음.

## Execution Plan

### Phase 1: API & DB Pipeline Rescue (Critical)
- **File:** `src/lib/api/dog.ts`
- **Action:** `createDogFromSurvey` 함수 수정.
- **Detail:** `dogs` 테이블에 기본 정보 insert 후 반환된 `dog_id`를 사용하여, 서베이의 나머지 데이터를 `dog_env` 테이블의 JSONB 컬럼 구조에 맞게 매핑하여 insert 하도록 파이프라인 완성.
- **Dependency:** `Backend/app/shared/models.py` (arch-05 Data RLS Boundary)

### Phase 2: Type Modeling & Mapper
- **File:** `src/types/dog.ts`, `src/components/features/survey/survey-mapper.ts`
- **Action:** 프론트엔드의 7단계 `SurveyData`를 Supabase `dog_env`의 JSONB 스키마(`household_info`, `activity_meta` 등) 규격에 맞게 변환하는 헬퍼 함수 작성 및 타입 정비.

### Phase 3: UI/UX & AI Enrichment
- **File:** `src/components/features/survey/*` (Step1Profile, etc.)
- **Action:** 
  1. `dog-wiki` 로직을 본딴 **스마트 견종 검색** 컴포넌트 도입 (오타 교정, 자동완성).
  2. 주관식 '기타' 입력을 최소화하고 TDS 기반 **칩(Chip) / 바텀 시트** 선택형 UI로 개편.
  3. 7단계를 3단계 핵심 플로우로 압축하여 이탈률 감소.

## Status Check
- [ ] Phase 1: API 파이프라인 구현 (`src/lib/api/dog.ts`)
- [ ] Phase 2: 타입 및 매퍼 구성
- [ ] Phase 3: Survey UI (TDS 칩 기반, 견종 검색) 개편
- [ ] Verification: `dog_env` 테이블에 JSONB 데이터 정상 적재 확인

---
*Self-Review: 아키텍처 다이어그램과 일치하는 DB 적재 흐름 복구가 0순위. 이후 UI 컴포넌트 리팩토링으로 AI 분석 품질 향상 도모.*

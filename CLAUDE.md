이 문서는 DogCoach 작업의 최우선 로컬 규칙이다. 에이전트는 모든 작업 전에 반드시 읽고 따른다.
# TailLog (DogCoach) - Claude Code 프로젝트 가이드

개 행동 교정 SaaS. ABC(선행-행동-결과) 기록 → 데이터 시각화 → AI 코칭.

## 핵심 개발 원칙
1. **파일 수정 전 필수 정독**: 어떤 파일이든 수정하기 전 현재 내용을 직접 읽고 작업한다.
2. **폴더별 지침 우선**: 작업 시작 전 해당 폴더의 `CLAUDE.md`를 반드시 먼저 확인하고 준수한다.
3. **파일 상단 기능 주석**: 모든 파일 상단에는 1~3줄의 기능 요약 주석을 유지한다.
4. **기존 코드 재사용**: 타입, 훅, 함수, API 등 기존 구현을 우선 재사용하여 중복을 피한다.
5. **BE ↔ FE 동기화**: 백엔드 모델/응답 변경 시 프론트엔드 타입/클라이언트를 1:1로 함께 갱신한다.

## 빠른 시작
- **Frontend (Next.js 16)**: `cd Frontend && npm run dev` (Port 3000)
- **Backend (FastAPI)**: `cd Backend && python -m uvicorn app.main:app --reload` (Port 8000)
- **테스트**: `cd Backend && python -m pytest tests`
- **빌드 검증**: `cd Frontend && npm run build`

## 프로젝트 구조
- `Backend/`: FastAPI + Supabase (3-Layer Architecture)
- `Frontend/`: Next.js 16 App Router + React 19 + TypeScript + TanStack Query
- `.agent/ai-context/`: 프로젝트 맥락 및 진행 상황 (START-HERE: `00-index.md`)

## 환경 변수
- **Frontend**: `Frontend/.env.local` (`NEXT_PUBLIC_` 접두사 필수)
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_URL` (기본: `http://localhost:8000/api/v1`)
- **Backend**: `Backend/.env`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## BE ↔ FE 미러 구조
- `Backend/app/models/{domain}.py` ↔ `Frontend/src/types/{domain}.ts`
- `Backend/app/routers/{domain}.py` ↔ `Frontend/src/lib/api/{domain}.ts`
- 도메인: dog, behavior_log, solution, coach, auth, user

## 개발 가이드라인

### Backend (엄격한 3-Layer)
- **Router** (HTTP) → **Service** (Business Logic) → **Repository** (DB)
- 모든 엔드포인트는 **async** 필수
- DB 세션은 `Depends(get_db)` 사용 (수동 close 금지)
- 소유권 검증: `verify_dog_ownership()` 데코레이터/함수 적용 필수

### Frontend (레이어 의존성)
- `app/` → components, lib, types 의존 가능
- `components/` → lib, types 의존 가능
- `lib/` → types만 의존 (컴포넌트 import 절대 금지)
- **스타일**: 정적 스타일은 `*.module.css` 사용, 동적 계산값만 인라인 style 사용

## 커밋 전 체크리스트
1. `cd Frontend && npm run build` - 빌드 성공 확인
2. `cd Backend && python -m pytest tests` - 테스트 통과 확인
3. `cd Frontend && npm run check:utf8` - 인코딩/줄바꿈 검증
4. 백엔드 모델 변경 시 프론트엔드 타입 동기화 여부 확인
5. 새 파일 및 수정 파일 상단에 기능 요약 주석 확인

## 참고 문서
- 프로젝트 상세: @.agent/ai-context/project-context.md
- 마스터 플랜: @.agent/ai-context/master-plan.md
- DB 스키마: @Backend/supabase_schema.sql

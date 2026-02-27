<!-- React Native 이식 단계 및 품질 게이트 -->
<!-- Wave별 진입/종료 조건을 정의한다. -->
# 12. Migration Waves and Gates

## 1) Wave 설계 원칙

- 작은 단위로 완료 가능한 수직 슬라이스를 우선한다.
- 각 Wave는 기능/품질/운영 게이트를 모두 통과해야 종료한다.

## 1.1) 정합성 고정 규칙

- `UserRole` 표준은 `user | trainer | org_owner | org_staff`를 사용한다.
- 광고 배치 계약은 `R1=survey-result`, `R2=dashboard`, `R3=coaching-result`로 고정한다.
- 백엔드 경로 계약: `Backend/app/...`(FastAPI), `Backend/alembic/...`(마이그레이션), `supabase/functions/...`(Edge Functions).
- B2B 구현은 Wave 3 진입 전까지 타입/테이블 스텁만 허용하며, 사용자 노출 기능은 금지한다.

## 2) Wave 계획

### Wave 0: Foundation

- 범위: 앱 셸, 라우팅, 환경변수, 인증 브릿지 골격
- 대상 Parity: `APP-001`, `AUTH-001`
- Exit Gate:
  - [x] RN 앱 기본 실행 가능
  - [ ] Toss Login 브릿지 호출 성공(개발 환경) — mock만 완료, 실 mTLS 대기
- **상태: 부분 통과**

### Wave 1: Core B2C

- 범위: 대시보드/행동기록/AI 코칭 기본 플로우 + 광고 터치포인트
- 대상 Parity: `LOG-001`, `AI-001`, `UI-001`, `AD-001`
- Exit Gate:
  - [x] TDS RN 기반 화면 16개 전환 완료 (3+ 초과 달성)
  - [x] 기록 생성/조회 UI 완료
  - [x] 코칭 UI 완료
  - [x] AD-001: R1/R2/R3 보상형 광고 훅+컴포넌트+페이지 통합 (mock SDK)
  - [ ] 기록→코칭 E2E 1회 통과 — Supabase 실 연동 대기
  - [ ] 사업자등록 후 실제 Ad Unit ID 교체 + Sandbox 광고 검증
- **상태: 부분 통과 (FE 완료, BE 연동 + 실 광고 SDK 대기)**

### Wave 2: Toss Core Features

- 범위: IAP, Smart Message, 포인트 연동 준비
- 대상 Parity: `IAP-001`, `MSG-001`
- Exit Gate:
  - [x] IAP UI + featureGuard 완료
  - [x] 주문 검증 + 멱등 처리 코드 구현 (`verify-iap-order`, mock 기준)
  - [x] 메시지 발송 정책(쿨다운/빈도) 코드 구현 (`send-smart-message`)
  - [x] `noti_history` 실DB 영속 연결 + 확장 스키마 반영
  - [x] Jest timeout 이슈 해소 (`test:app`/`test:edge` 분리)
  - [ ] Edge Function 런타임 invoke 검증 로그 확보 (앱 수동호출 + MCP 로그 수집 대기)
- **상태: 부분 통과 (코드/테스트/DB 완료, 런타임 invoke 증적 대기)**

### Wave 3: B2B Expansion

- 범위: Today Ops Queue, Bulk 편집, 보호자 공유
- 대상 Parity: `B2B-001` 및 B2B 확장 항목
- Exit Gate:
  - [ ] 40마리 리스트 스크롤 성능 점검 통과
  - [ ] 공유 링크 2경로(토스/비토스) 검증 완료
- **상태: 미통과**

### Wave 4: Release Readiness

- 범위: QA, 성능, 운영 점검
- Exit Gate:
  - [ ] 테스트 통과 + 릴리즈 체크리스트 충족
  - [ ] Toss QA 제출 준비 완료
- **상태: 미통과**

## 3) 공통 게이트 체크리스트

1. Parity 상태 최신화
2. 테스트 결과 첨부
3. 문서 정합성 확인(PRD/SCHEMA 충돌 없음)
4. 잔여 리스크 명시

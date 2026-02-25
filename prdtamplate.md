[프로젝트 명] — Master Product Requirements Document (AI Agent Optimized)

Project: [프로젝트 이름]
Version: 2.1.0 (AI Agent Optimized)
Date: 20XX-XX-XX
Context: 이 문서는 AI 코딩 에이전트가 단독으로 프로젝트를 셋업하고 구현·배포·검증까지 수행하기 위한 절대적 기준 문서입니다. 에이전트는 본 문서의 규칙을 위반할 수 없습니다.

0. 메타 / 버전관리

문서 버전: 2.1.0

변경 기록: (날짜) — (수정 내용)

릴리스 노트 및 마이그레이션 가이드 필수 작성.

1. 프로젝트 개요 (Overview)
1.1 문제 / 목표

Problem: [사용자가 겪는 구체적 문제 — 1문장으로 요약]

Goal: [측정 가능한 목표 — 예: "첫 주 사용자 100명, API 응답 200ms 이내"]

Non-goals: [이 프로젝트에서 의도하지 않는 사항]

1.2 Target User & Success Metrics

Target User: [Persona: 연령, 직무, 기술 수준]

Primary KPI: [예: DAU, 전환율, 평균 응답시간]

SLO / SLA: 응답시간 95th percentile < 300ms, 가용성 99.9%

1.3 핵심 사용자 경험 (User Stories)

사용자 스토리 표로 정리 (Given/When/Then + 수락기준)

예: Given 로그인 상태가 아니면 When 로그인 시도하면 Then 2FA 요청 (AC: 이메일 전송 확인)

2. 기술 스택 & 제약 (Tech Stack & Constraints)
2.1 권장/고정 스택 (버전 명시)

(항목: 기술 — 버전 — 이유 — pin 필요 여부)

Framework: Next.js — 14.x (App Router) — pin: yes

Language: TypeScript — 5.x (strict=true) — pin: yes

Styling: Tailwind CSS — 3.x — pin: yes

State: Zustand — ^5.0.0 — pin: preferably fixed

DB: Supabase(Postgres) — 관리 DB 권장

CI: GitHub Actions — 지정 워크플로우

Container: Docker — Dockerfile + multi-stage build

2.2 환경/인프라 제약

Node.js LTS: 20.x (명시)

브라우저 지원: Chrome 최신 2버전, Safari 최신 2버전

보안: 모든 비밀은 Secrets Manager에 보관. .env 커밋 금지.

라이선스: 외부 패키지 OSI 승인 여부 검증

3. 디자인 시스템 (Design System)

Tailwind config 토큰 정의(예시 포함)

컴포넌트 카탈로그: Button, Input, Modal, Tooltip, Card (각 변형 + props 명시)

접근성(A11y) 기준: WCAG AA 준수, 키보드 탐색/스크린리더 테스트 포함

국제화: i18n 키 사용(한국어 기본) — 날짜/통화 포맷 명시

4. 데이터 모델 & 인터페이스 (Data Models)

모든 인터페이스는 types/*.ts로 먼저 생성. 변경 시 마이그레이션 스크립트 필요.

// types/user.ts
export interface User {
  id: string; // UUID v4
  email: string;
  nickname: string;
  avatarUrl?: string;
  role: 'admin'|'user';
  createdAt: string; // ISO 8601
  updatedAt?: string;
}


(추가: Post, Comment, AuditLog 등 예시 포함 — 각 필드의 제약, 인덱스, unique 제약 명시)

5. 아키텍처 & 파일 구조 (Directory Structure)

소스 트리 + 각 파일 역할 간단 설명 (기존 구조에 더해 테스트/, e2e/, infra/, scripts/ 추가)

src/
├── app/
├── components/
├── lib/
├── stores/
├── types/
├── tests/          # unit
├── e2e/            # Playwright
└── infra/          # IaC: terraform / k8s manifests

6. 기능 명세 & 비즈니스 로직 (Feature Specifications)

각 기능마다: 목적, 유저 플로우, API contract, 에러 케이스, 수락 기준(AC)

예: 로그인(상세)

Flow, API 요청/응답 예시(성공/실패 코드), 보안(토큰 만료), 브루트포스 대응(레이트리밋)

Acceptance Criteria (테스트 케이스) — 예: 잘못된 비밀번호 시 401, 3회 실패 후 15분 락

7. API 계약 (API Contract) — 상세

표준 응답 래핑 규칙(예: { success: boolean, data: T, error?: {code, message} })

필수 헤더, 인증 방식, 버저닝(/api/v1/...)

예시: POST /api/v1/auth/login (request body + response examples + error codes)

8. 테스트 / 검증 전략 (Testing & QA)

Unit tests: Jest + ts-jest — 커버리지 80% 목표

Integration: DB-in-memory or test DB, Supabase emulator or docker-compose

E2E: Playwright scripts covering critical flows (로그인, 게시물 작성, 권한)

Test jobs: CI에서 매 PR마다 실행, 실패 시 병합 금지

QA checklist: accessibility audit, performance smoke test, security scan (npm audit)

9. CI / CD & 배포 전략

Git: trunk-based + feature branch, commit 메시지 컨벤션(Conventional Commits)

PR 템플릿 + 코드리뷰 체크리스트(테스트, 타입, 보안, 성능)

GitHub Actions: build → test → lint → e2e(옵션) → docker build → push

배포: staging → canary/prod 롤아웃, 모니터링/릴리스 태그

롤백 계획: 이전 이미지로 자동 롤백 스크립트

예시 워크플로우 스니펫(간단):

# .github/workflows/ci.yml
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage

10. 보안 · 개인정보 (Security & Privacy)

Secrets: env vars only in CI/Secrets Manager; never print secrets in logs

Auth: JWT + refresh token or Supabase auth, 토큰 저장 전략(HTTP-only cookie 권장)

개인정보: PII 식별 및 마스킹 정책, GDPR/Local 법규 준수 체크리스트

11. 관찰성 (Observability)

로깅: structured logs (JSON), log level 정책

에러 추적: Sentry 연결 + 버전 태깅

메트릭: Prometheus / Grafana 혹은 호스팅 솔루션, 기본 메트릭(응답시간, 오류율)

헬스체크: /health 엔드포인트 (DB 연결 등)

12. 성능 · 확장성 (Performance & Scaling)

캐싱: CDN + 서버사이드 캐시(Edge, Redis) 전략

DB 인덱싱 정책, 쿼리 비용 상한

API rate limits: per-user & per-IP 기준

13. 운영(오퍼레이션) / 유지보수

Backup schedule, DB migration 절차 (migrations 폴더 + rollback)

온콜 가이드, 연락처, 복구 시나리오

문서화: 자동 생성 API docs (OpenAPI/Swagger) + README

14. 위험관리 (Risks & Mitigation)

리스크 목록(우선순위/영향/완화 조치)

예: 외부 auth 장애 시 fallback(guest mode 제한), DB 마이그레이션 실패 시 롤백

15. 산출물(Deliverables) & 수락 기준 (Deliverables & Acceptance)

최소 산출물: 컴파일 가능한 코드, unit tests, e2e scripts, Dockerfile, infra manifests, README, API docs

Acceptance Checklist (체크박스): 타입 에러 0, 테스트 통과, CI green, security scan 통과, perf SLO 충족

16. Agent 운영 프롬프트 (업그레이드된 프롬프트)

Agent에게 한 번에 줄 ‘명령 템플릿’ (복사해서 사용)

당신은 시니어 풀스택 개발자이자 CI/CD, 보안, 관찰성 지침을 준수하는 배포 가능한 코드 생성기입니다.
첨부된 Master_PRD.md(버전 2.1.0)를 엄격히 준수하세요.

작업 규칙:
1) 변경 불가 규칙: (Node 20.x, TS strict, Tailwind 3.x, Next 14.x) — 해당 버전으로 고정.
2) 생성 순서:
   A. 파일 트리 출력(텍스트)
   B. types/*.ts 생성 (컴파일 우선)
   C. 기본 컴포넌트 3개(Button, Input, Card) 생성 + 유닛 테스트
   D. 로그인 API 구현 + 통합 테스트
3) 모든 코드 스니펫은 `npm run build` 성공을 기준으로 작성합니다.
4) 커밋 메시지: conventional-commits 형식 사용.
5) 각 단계 완료 후 "진행 보고"와 함께 산출물(파일 리스트, 테스트 결과 요약)을 출력하세요.
6) PR 생성 전 코드는 lint, typecheck, unit test 통과여야 합니다.

지금 바로 Step 1 (파일 트리 출력)과 Step 2 (types 생성)을 실행하세요.

17. 빠른 시작 체크리스트 (Agent Quick-Start)

 node 버전 고정(20.x)

 typescript tsconfig strict=true

 eslint + prettier 설정

 Dockerfile 기본 템플릿

 CI에서 npm ci && npm run build && npm run test 통과

부록: 예시 파일 · 스니펫

.env.example (비밀값 주의)

NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgres://user:pass@localhost:5432/db


Dockerfile (멀티 스테이지 스켈레톤) — 제공
이 문서는 TaillogToss 프로젝트의 최우선 전역 규칙이다. 에이전트는 모든 작업 전에 반드시 읽고 따른다.

# TaillogToss 운영 인덱스 (Slim)

DogCoach(Next.js PWA) -> Toss 미니앱(React Native) 마이그레이션.
이 파일은 핵심 규칙과 현재 상태만 관리하며, 상세 구현 지침은 스킬/문서 참조로 분리한다.

## 세션 시작 가이드 (MUST)

새 세션 시작 시 아래 순서로 읽는다. (`CLAUDE.md`는 자동 로드)

| 순서 | 문서 | 필수 |
|------|------|------|
| 1 | `docs/11-FEATURE-PARITY-MATRIX.md` | ✅ |
| 2 | `docs/BACKEND-PLAN.md` | ✅ |
| 3 | `docs/MISSING-AND-UNIMPLEMENTED.md` | ✅ |
| 4 | `docs/2-28/PHASE13-FE-BE-ROLLING-MIGRATION.md` | ✅ |

### 자동 참조 번들 (MUST)
1. 기본 번들: `11-FEATURE-PARITY-MATRIX` -> `BACKEND-PLAN` -> `MISSING-AND-UNIMPLEMENTED` -> `PHASE13-FE-BE-ROLLING-MIGRATION`
2. DB 작업: `docs/SCHEMA-B2B.md`
3. Sandbox/실기기: `docs/2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md`
4. 정책/요건: `docs/PRD-TailLog-Toss.md`, `docs/PRD-TailLog-B2B.md`

## 저장소 경계 (MUST)

| 구분 | 경로 | 권한 |
|------|------|------|
| Write Repo | `C:\Users\gmdqn\tosstaillog` | 읽기/쓰기 |
| Read-Only Ref | `C:\Users\gmdqn\DogCoach` | 읽기 전용 |

## 에이전트 실행 규약 (MUST)
1. 수정 전 변경 계획을 1~2문장으로 먼저 알린다.
2. 수정 전 파일 원문을 반드시 읽는다.
3. 작업은 Parity ID와 연결한다.
4. 완료 보고는 아래 완료 포맷을 사용한다.
5. 사용자 요청 없는 파괴적 명령(`reset --hard`, 대량 삭제) 금지.
6. 코드 중복보다 기존 타입/훅/함수 재사용 우선.
7. 코드 파일 상단 1~3줄 기능 요약 주석 유지.
8. 반복되는 실행/검증 절차가 확인되면 기존 스킬 업데이트 또는 신규 스킬로 즉시 지침화한다.

## 스택/아키텍처 요약

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | `@granite-js/react-native` |
| UI | TDS React Native (`@toss/tds`) |
| 상태 | React 기본 + TanStack Query |
| 백엔드 | `Backend/` FastAPI + `supabase/functions/` Edge |
| 인증 | Toss Login -> Edge -> Supabase Auth bridge |
| 결제 | Toss IAP (`verify-iap-order`) |
| 광고 | Toss Ads SDK 2.0 |

## 스킬 참조 인덱스 (MUST)

상세 구현 지침은 아래 스킬로 참조한다.

| 주제 | 스킬 |
|------|------|
| 화면 와이어프레임/레이아웃 | `Skill("toss_wireframes")` |
| 사용자 여정/상태 전환 | `Skill("toss_journey")` |
| Toss 앱 기본(TDS, SDK, mTLS, IAP, Ads) | `Skill("toss_apps")` |
| DB 변환/마이그레이션 전략 | `Skill("toss_db_migration")` |
| Edge 보안 하드닝/우회 차단 검증 | `Skill("toss-edge-hardening")` |
| Phase 13 게이트 판정/증적 동기화 | `Skill("toss-phase13-gate")` |
| Supabase MCP 운영 표준 | `Skill("toss-supabase-mcp")` |
| Sandbox Metro 실기기 연결 | `Skill("toss-sandbox-metro")` |

## 상세 지침 분리 원칙
- 이 문서에는 절차 상세를 중복 작성하지 않는다.
- 구현 상세는 스킬 `SKILL.md`에, 도메인 사실은 `docs/`에 둔다.
- 변경 시 우선순위: `CLAUDE.md(핵심 규칙)` -> `스킬(절차)` -> `docs(상태/증적)`.

## 완료 포맷

```
- Scope: Parity ID 목록
- Files: 변경 파일 목록
- Validation: 실행/검증 결과
- Risks: 미해결 리스크와 다음 액션
- Self-Review: 잘한 점 / 부족한 점 / 남은 검증 공백
- Next-Session Docs: 다음 세션 시작 전 읽을 문서 + 이번 업데이트 문서
- Next Recommendations: 다음 우선순위 1~3개
```

## Phase 진행 현황 (Snapshot)

| Phase | 상태 | 비고 |
|-------|------|------|
| 1~10 | Done | FE 전체 완료 |
| 11 | Done | 보안(mTLS, rate-limit, pii) 완료 |
| 12 | Done | 광고 SDK mock 적용, 실 ID 검증 대기 |
| 13 | In progress | Sandbox 로그인 확보, IAP/광고 E2E 잔여 |
| B2B | Done | 코드/문서 정합 완료, 성능/실기기 검증 대기 |
| REG | Done | legal + toss-disconnect + 약관 페이지 완료 |
| BE | Done | BE-P1~P8 완료 |
| INFRA-1 | Done | DB 26->38 + RLS 적용 |

## 현재 핵심 리스크 (요약)
- IAP/MSG/AD 실기기 E2E 증적 부족
- Real mTLS 전환(인증서/콘솔) 후속 필요
- Ad Group ID 실 교체 대기
- 일부 도메인 happy-path payload 실검증 필요

## 상태 업데이트 (2026-02-28)
- FE API backend-first 전환: `dashboard`, `training` 포함 완료
- Edge invoke/auth-policy 7종 스모크 검증 완료
- `send-smart-message` v8, `grant-toss-points` v8, `verify-iap-order` v8, `generate-report` v3 배포 완료
- 위조 `x-user-role` 우회 재시도 차단 확인(8건 모두 403)
- IAP happy-path 실증은 fresh Sandbox `authorization_code` 필요(`login-with-toss` stale code 호출 시 502 invalid_grant 확인)

## 다음 우선순위 (Single Source)
1. INFRA-2 후속: Edge happy-path payload 검증 + secrets drift 점검
2. Phase 13 E2E: AUTH 실패400, IAP 복구, MSG 실발송, AD 실노출 증적 확보
3. INFRA-3: Real mTLS 인증서/토스 콘솔 등록 마무리

## 참고 문서 인덱스
- `docs/PRD-TailLog-Toss.md`
- `docs/PRD-TailLog-B2B.md`
- `docs/SCHEMA-B2B.md`
- `docs/11-FEATURE-PARITY-MATRIX.md`
- `docs/MISSING-AND-UNIMPLEMENTED.md`
- `docs/2-28/PHASE13-FE-BE-ROLLING-MIGRATION.md`
- `docs/2-27/PHASE13-E2E-SANDBOX-PLAYBOOK.md`

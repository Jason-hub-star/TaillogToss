# TaillogToss 마케팅 파이프라인 — 페이즈 진행 보드

> 출처 플랜: `/Users/family/.claude/plans/unified-finding-yao.md`
> 메모리 규칙: `feedback_self_review_per_phase.md`, `feedback_marketing_scope.md`, `feedback_lock_decisions_first.md`, `feedback_data_visualization_pii_guard.md`
> 자기리뷰 모드: **엄격** (L9) — 발견 이슈 0건 도달 후 다음 페이즈 진입.
> **🌐 https://tailog.kr** — 라이브 운영 중 (2026-05-22)

---

## 🔒 잠금 의사결정 요약 (위배 금지)

| L | 잠금 내용 |
|---|---|
| L1 | **호스팅 = tailog.kr 별도 사이트 신설** (mungmungfit 도메인 부재로 갱신) |
| L2 | `/Users/family/jason/tailog-marketing-site/` 신설, mungmungfit 코드 fork 패턴 |
| L3 | 월 5만원 예산 가드레일, 누적 4만원 도달 시 일시정지 |
| L4 | Manus AI 미도입 (Phase 0-4) |
| L5 | Phase 0-4 본체 무수정 / Phase 5-6 수정 허용 + 회귀 테스트 의무 |
| L6 | mungmungfit 톤 가이드 우선 (광고티/금지어 차단) |
| L7 | (폐기 — L1 변경으로 별도 사이트라 충돌 없음) |
| L8 | 당근은 수동 (API 부재) |
| L9 | 페이즈별 `/self-review` 엄격 모드 (이슈 0건) |
| L10 | 토스 콘솔 운영은 콘솔에서 / 공유 리워드 코드는 본 플랜 |
| L11 | 데이터 콘텐츠 PII 익명화 4중 방어 |

---

## 페이즈 진행 상태 (2026-05-22 https://tailog.kr 라이브 시점)

| Phase | 기간 | 상태 | 산출 문서 | 자기리뷰 통과 |
|---|---|---|---|---|
| **0** — 채널 셋업 + 메시징 | D-3 ~ D+3 | 🟡 코드 완료 / 사용자 작업 대기 | `messaging-cards.md`, `env-vars.md` | — (M0.4/M0.5 대기) |
| **1** — tailog.kr 사이트 신설 (Next.js 16) | D+3 ~ D+10 | 🟡 코드 완료 / 로컬 빌드 대기 | `tailog-marketing-site/docs/phase-1.md` | — (`pnpm build` 대기) |
| **1B** — 데이터 시각화 + PII | D+10 ~ D+17 | 🟡 코드 완료 / 토글 UI 대기 | `SELF-REVIEW-PHASE-0-TO-5.md` §B4 | — |
| **2** — Threads 자동 발행 | D+17 ~ D+24 | 🟡 코드 완료 / cron 트리거 대기 | `marketing-threads-publish.prompt.md` | — |
| **3** — 인스타 + 당근 | D+24 ~ D+35 | 🟡 코드 완료 / 사용자 캐러셀 대기 | `marketing-instagram-publish.prompt.md` | — |
| **4** — 측정 + KPI 봇 | D+35 ~ D+42 | 🟡 코드 완료 / GA4 키 대기 | `marketing-weekly-report.prompt.md` | — |
| **5** — 공유 리워드 (본체 수정 시작) | D+42 ~ D+56 | 🟡 코드 완료 / point_events 미완 | `referral-settlement-weekly.prompt.md` | — (B2 의존) |
| **6** — Subscription 전환 | D+56 ~ D+70 | ⏸ 대기 (토스 샌드박스 미지원) | — | — |

상태 범례: ⚪ 대기 / 🟡 진행 중 / 🟢 통과 / 🔴 블로커 / ⏸ 외부 의존 대기

종합 자기리뷰: `docs/marketing/SELF-REVIEW-PHASE-0-TO-5.md`

---

## 누적 비용 트래커 (L3 가드레일 모니터링)

| 월 | 인스타 부스트 | 당근 동네홍보 | 도메인/토큰 | 합계 | 한도 | 상태 |
|---|---|---|---|---|---|---|
| (Phase 0 시작 월) | 0 | 0 | 0 | 0 | 50,000원 | 🟢 |

> 자동화 `marketing-weekly-report` (매주 일 21:00)가 본 표를 갱신. 누적 ≥ 40,000원 도달 시 텔레그램 알림.

---

## Phase별 진입 체크리스트

### Phase 0 → Phase 1 진입 조건
- [ ] M0.1-M0.5 모두 사용자 완료
- [ ] `messaging-cards.md`, `env-vars.md` 작성 완료
- [ ] Graph API 토큰 200 OK
- [ ] 자기리뷰 발견 이슈 0건

### Phase 1 → Phase 1B 진입 조건
- [ ] mungmungfit 사이트 `/apps/taillogtoss` 배포
- [ ] 블로그 카테고리 `taillogtoss` + 첫 5개 글
- [ ] Lighthouse SEO 95+
- [ ] L7 디자인 검수 통과 (본업 CTA 우선순위 보존)

### Phase 1B → Phase 2 진입 조건
- [ ] `users.marketing_data_consent` 컬럼 + 토글 UI
- [ ] 익명화 뷰 신설 (raw PII 검색 0건)
- [ ] PII 검사기 단위 테스트 통과
- [ ] 첫 사례연구 1건 텔레그램 검수 → 승인 → 발행 E2E

### Phase 5 → Phase 6 진입 조건 (본체 수정 영역)
- [ ] `npm test` 통과
- [ ] 공유 리워드 E2E (다른 디바이스 가입 → 7일+3건 → 양방향 500pt)
- [ ] 어뷰징 가드 검증
- [ ] L5 회귀 방지 — 기존 기능 정상 동작

---

## 잠금 위배 신고 (자기리뷰 시 발견 즉시 여기에)

| 일자 | 잠금# | 위배 내용 | 해결 페이즈 | 해결 결과 |
|---|---|---|---|---|
| (없음) | — | — | — | — |

---

## 외부 의존성 알림

| 항목 | 만료/주기 | 다음 액션 |
|---|---|---|
| Meta Graph 토큰 | 60일 | `marketing-threads-token-refresh` 자동 알림 (만료 7일 전) |
| 토스 mTLS 인증서 | 90일 | Phase 6에서 `automation-health-monitor` 확장 |
| 토스 Subscription 샌드박스 | 토스 공지 대기 | Phase 6 시작 전 확인 |

---

## 다음 액션 (현재 시점)

1. ⏳ **사용자 직접 작업 M0.1-M0.5** — 인스타·Threads·당근·Meta Graph 토큰·GA4 발급 (디테일 가이드는 별도 메시지로 안내됨)
2. ✅ **코드 작업 C0.1-C0.3** — 본 문서 + `messaging-cards.md` + `env-vars.md` 작성 완료
3. ⏳ **자기리뷰 체크포인트** — M0.1-M0.5 완료 보고 시 통과 기준 점검 후 Phase 1 진입

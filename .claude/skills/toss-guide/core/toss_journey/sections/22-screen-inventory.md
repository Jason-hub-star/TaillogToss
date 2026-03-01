Section-ID: toss_journey-22
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: internal

### 11.1 전체 화면 인벤토리 (19개)

기존 Section 9의 10개 + 신규 6개 화면 + 재사용 컴포넌트 2개 + PRO 업셀 바텀시트 1개.

| # | 화면 | 파일 경로 | 레이아웃 패턴 | 신규/기존 |
|---|------|----------|-------------|----------|
| 1 | login | `src/pages/login.tsx` | Standalone | 기존 9-1 |
| 2 | **welcome** | `src/pages/onboarding/welcome.tsx` | B (상세형) | **NEW** |
| 3 | survey | `src/pages/onboarding/survey.tsx` | C (입력폼형) | 기존 9-2 |
| 4 | **survey-result** | `src/pages/onboarding/survey-result.tsx` | B (상세형) | **NEW** |
| 5 | dashboard | `src/pages/dashboard/index.tsx` | D+A (탭+목록) | 기존 9-3 보강 |
| 6 | quick-log | `src/pages/dashboard/quick-log.tsx` | E (모달형) | 기존 9-4 보강 |
| 7 | analysis | `src/pages/dashboard/analysis.tsx` | D (탭형) | 기존 9-5 |
| 8 | coaching-result | `src/pages/coaching/result.tsx` | B (상세형) | 기존 9-6 보강 |
| 9 | training-academy | `src/pages/training/academy.tsx` | A 변형 (GridList) | 기존 9-7 |
| 10 | **training-detail** | `src/pages/training/detail.tsx` | B (상세형) | **NEW** |
| 11 | dog-profile | `src/pages/dog/profile.tsx` | C (입력폼형) | 기존 9-8 |
| 12 | **dog-switcher** | `src/pages/dog/switcher.tsx` | E (모달형) | **NEW** |
| 13 | **dog-add** | `src/pages/dog/add.tsx` | C (입력폼형) | **NEW** |
| 14 | settings | `src/pages/settings/index.tsx` | A (목록형) | 기존 9-9 |
| 15 | **subscription** | `src/pages/settings/subscription.tsx` | B (상세형) | **NEW** |
| 16 | **notification** | `src/pages/onboarding/notification.tsx` | B (상세형) | **NEW** |
| 17 | ops-today | `src/pages/ops/today.tsx` | D+A (탭+목록) | 기존 9-10 |
| 18 | EmptyState | `components/EmptyState.tsx` | Result 기반 | **NEW** |
| 19 | ErrorState | `components/ErrorState.tsx` | ErrorPage 기반 | **NEW** |

---


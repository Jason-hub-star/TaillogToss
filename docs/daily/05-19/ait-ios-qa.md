# AIT iOS QA — Umji의 iPhone (iPhone 16 Pro, iOS 26.3.1)

> 날짜: 2026-05-19 | 기기: iPhone 16 Pro (iPhone17,1) UDID: 00008140-00044C80029B001C
> AIT 빌드: 019e3f5c-7bf2-72f4-bd9e-b6d0c9dd6437 (2026-05-19 배포)
> 툴: xcrun devicectl device screenshot → Claude 자동 분석

---

## Wave A — 실제 Toss 로그인 (AIT 전용)

> `/onboarding/welcome` — dev 모드에서 검증 불가, 가장 중요

| # | 액션 | 기대 결과 | 실제 결과 | 판정 |
|---|---|---|---|---|
| A-1 | 앱 최초 진입 | Welcome 화면 표시 | 이미 로그인 상태 — 스킵 | SKIP |
| A-2 | "토스로 시작하기" 탭 | Toss 로그인 OAuth 팝업 | 로그아웃 후 재테스트 필요 | DEFER |
| A-3 | 실 계정 로그인 완료 | `/onboarding/survey` 또는 `/dashboard` 이동 | 로그아웃 후 재테스트 필요 | DEFER |
| A-4 | 로그인 후 dog 없을 때 | `/dog/add` 이동 | 로그아웃 후 재테스트 필요 | DEFER |
| A-5 | 재진입 (토큰 유효) | 로그인 생략 → 바로 `/dashboard` | /dashboard 바로 표시, 메이 실데이터 로딩 확인 | ✅ PASS |

---

## Wave B — iOS Safe Area / Dynamic Island (iOS 전용)

> iPhone 16 Pro — Dynamic Island + 홈 인디케이터, Android에서 못 확인

| # | 화면 | 확인 포인트 | 실제 결과 | 판정 |
|---|---|---|---|---|
| B-1 | `/dashboard` | 상단 콘텐츠가 Dynamic Island에 가려지는지 | "테일로그" 타이틀 Dynamic Island 아래 정상 표시 | ✅ PASS |
| B-2 | `/dashboard` | 하단 버튼/탭바가 홈 인디케이터에 가려지는지 | 탭바 아래 여백 충분, 잘림 없음 | ✅ PASS |
| B-3 | `/training/academy` | 상단 헤더 + Dynamic Island 겹침 | 진행 중 | - |
| B-4 | `/training/detail` | 하단 CTA 버튼 + 홈 인디케이터 겹침 | 진행 중 | - |
| B-5 | `/onboarding/welcome` | 전체 화면 배경 Safe Area 처리 | 진행 중 | - |
| B-6 | `/dashboard/quick-log` | 저장 버튼 + 홈 인디케이터 겹침 | 진행 중 | - |

---

## Wave C — iOS 제스처 (iOS 전용)

> 스와이프백(edge swipe)이 React Navigation과 충돌하는지

| # | 화면 | 액션 | 기대 | 실제 | 판정 |
|---|---|---|---|---|---|
| C-1 | 임의 화면 | 왼쪽 엣지 스와이프 | 이전 화면으로 자연스럽게 이동 | | |
| C-2 | Bottom Sheet 열린 상태 | 스와이프 다운 | Sheet 닫힘 (뒤로가기 아님) | | |
| C-3 | `/training/detail` | 엣지 스와이프 | academy로 복귀 | | |
| C-4 | Modal 화면 | 스와이프 다운 | Modal 닫힘 | | |

---

## Wave D — PRELAUNCH-QA 핫픽스 실기기 검증

> LOCAL PASS 8개 → 실기기 미확인, AIT 기기에서 최종 확인

| # | 항목 | 확인 방법 | 실제 결과 | 판정 |
|---|---|---|---|---|
| D-1 | Quick log 저장 완료 Toast | 행동 저장 후 "저장 완료" 토스트 + `/dashboard` 복귀 | | |
| D-2 | Quick log 광고 제거 | quick-log 화면에 인라인 배너 광고 없음 | | |
| D-3 | 훈련 무료/Pro 경계 | 기본 커리큘럼 광고 없이 바로 진입 | | |
| D-4 | 훈련 진입 마찰 제거 | 아카데미 카드 탭 → 전면광고 없이 바로 detail | | |
| D-5 | AI 히어로 탭 가능 | "맞춤 훈련을 준비했어요" 탭 → 커리큘럼 이동 | | |
| D-6 | 완료 마커 | 완료 step에 취소선 없음, 체크 아이콘만 | | |
| D-7 | B2C→B2B 라우트 방어 | B2C 계정으로 `/ops/*` 접근 → `/dashboard` redirect | | |
| D-8 | 하단 네비 아이콘 | Imagen blue 톤 아이콘, 이모지 없음 | 홈/훈련/설정 모두 blue 톤 아이콘 확인 | ✅ PASS |

---

## Wave E — 광고 render (AIT + iOS 전용)

> Toss 지원 환경 첫 확인 — dev 모드에서 code=1007로 불가

| # | 화면 | 광고 슬롯 | 기대 | 실제 결과 | 판정 |
|---|---|---|---|---|---|
| E-1 | `/dashboard` | 배너 (R 슬롯) | 분석탭 광고 없음(정상), 코칭결과 Rewarded Ad 버튼 표시 | ✅ PASS |
| E-Reward | `/coaching/result` | Rewarded Ad | **광고 보고 코칭 결과 확인하기** 탭 → Screwdom 게임 광고 19초 재생 확인. Toss iOS AIT 환경 광고 SDK 정상 동작 최초 확인 | ✅ PASS |
| E-2 | `/dashboard/quick-log` | 광고 없음 확인 | 광고 슬롯 미표시 | 진행 중 |
| E-3 | `/training/academy` | 배너 (B 슬롯) | render 또는 no-fill | 진행 중 |
| E-4 | `/training/detail` | 전면 (I 슬롯) | 진입 시 한 번만, 이후 없음 | 진행 중 |

---

## Wave F — 전체 화면 smoke test

> 23개 라우트 crash/blank 없음 확인

| 라우트 | 진입 확인 | crash | blank | Safe Area | 판정 |
|---|---|---|---|---|---|
| `/onboarding/welcome` | | | | | |
| `/onboarding/survey` | | | | | |
| `/onboarding/survey-result` | | | | | |
| `/onboarding/notification` | | | | | |
| `/onboarding/stage1-form` | | | | | |
| `/onboarding/stage2-form` | | | | | |
| `/onboarding/stage3-form` | | | | | |
| `/dashboard` | | | | | |
| `/dashboard/quick-log` | | | | | |
| `/dashboard/analysis` | | | | | |
| `/coaching/result` | | | | | |
| `/training/academy` | | | | | |
| `/training/detail` | | | | | |
| `/dog/profile` | | | | | |
| `/dog/add` | | | | | |
| `/dog/switcher` | | | | | |
| `/settings` | | | | | |
| `/settings/subscription` | | | | | |
| `/legal/terms` | | | | | |
| `/legal/privacy` | | | | | |
| `/ops/setup` | | | | | |
| `/ops/today` | | | | | |
| `/parent/reports` | | | | | |

---

## 이슈 로그

| ID | Wave | 화면 | 증상 | 판정 | 수정 |
|---|---|---|---|---|---|
| | | | | | |

---

## 요약

| Wave | 항목 수 | PASS | FAIL | 미확인 |
|---|---|---|---|---|
| A 실Toss로그인 | 5 | | | 5 |
| B Safe Area | 6 | | | 6 |
| C iOS 제스처 | 4 | | | 4 |
| D QA 핫픽스 | 8 | | | 8 |
| E 광고 render | 4 | | | 4 |
| F Smoke test | 23 | | | 23 |
| **합계** | **50** | | | **50** |

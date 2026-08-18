# /coaching/result — AI 행동 진단 UX/프롬프트 점검

Parity: UIUX-005, AI-001, AI-COACHING-ANALYTICS-001, UI-TRAINING-PERSONALIZATION-001, PRO-INTAKE-001

## Done

- [x] `관련 훈련 시작하기` CTA가 `/training/academy`로만 이동하던 문제를 확인했다.
- [x] `action_plan.items[].reference_curriculum_ids`의 첫 번째 유효 커리큘럼 ID를 사용해 `/training/detail?curriculum_id=...`로 직접 이동하도록 수정했다.
- [x] 유효한 커리큘럼 ID가 없을 때만 훈련 아카데미 fallback을 유지했다.
- [x] 행동 개선 계획의 `자세히 보기` drawer에서 `tools`와 `reference_curriculum_ids`가 영어/ID로 보이는 문제를 한글 라벨로 정규화했다.
- [x] `next_7_days`의 오늘 강조가 요일 기준이라 금요일에 5일차가 강조되던 문제를 확인했고, 코칭 생성일 기준 1~7일차만 강조하도록 수정했다.
- [x] `강아지의 마음`, `위험 신호 분석`, `전문가 상담 질문`은 기본 접힘 drawer로 바꿨다.
- [x] 프롬프트에 한국어-only 구조 필드, 첫 번째 관련 커리큘럼 ID 우선순위, 생성일 기준 7일 플랜, drawer 친화적인 짧은 위험/질문 출력 규칙을 추가했다.

## Prompt Findings

- 관련 훈련 이동 품질은 프롬프트의 `reference_curriculum_ids` 품질에 직접 의존한다. 현재는 런타임 guard가 첫 번째 유효 ID를 사용하므로, 프롬프트에서 가장 관련도 높은 ID를 배열 첫 번째에 넣게 강제했다.
- 영어 노출은 UI fallback만으로는 근본 해결이 어렵다. `technique`, `psychological_principle`, `environment`, `progression_rule`, `risk_signals`, `consultation_questions`도 처음부터 한국어로 생성하도록 프롬프트를 강화했다.
- 7일 플랜은 달력 요일이 아니라 “코칭 생성일이 1일차”라는 계약이 필요하다. 프롬프트와 UI 계산을 같은 기준으로 맞췄다.
- 위험 신호와 전문가 질문은 정보량이 많아 결과 화면을 밀어내므로, 기본 접힘 UI에 맞춰 1~3개 위험 신호와 3~4개 상담 질문으로 제한하는 편이 낫다.

## Further Improvements

- 다음 백엔드 스키마 개선 후보: `action_plan.primary_curriculum_id`, `next_7_days.plan_start_date`, `risk_signals.summary`를 명시 필드로 추가하면 프론트 추론을 줄일 수 있다.
- 관련 훈련 CTA 클릭 시 `training_related_started` 같은 analytics event를 남기면 프롬프트 추천 품질을 사후 측정할 수 있다.
- drawer 안의 영어 fallback은 현재 안전하게 `맞춤 안내`로 숨긴다. 장기적으로는 서버 사후 정규화에서 영어 잔여 문장을 더 풍부한 한국어로 변환하는 편이 좋다.

## Validation

- [x] `npx jest src/components/features/coaching/__tests__/FreeBlock.test.tsx src/components/features/coaching/__tests__/LockedBlock.test.tsx --runInBand` — 4 passed
- [x] `git diff --check` for touched coaching/prompt files — passed
- [x] DEV_LOCAL 실기기 `/coaching/result` PASS — Metro + local FastAPI, `관련 훈련 바로 시작하기` 탭 시 `/training/detail?curriculum_id=fear_desensitization` 진입 확인
- [x] AIT build PASS — `taillog-app.ait`, deploymentId `019e4e5a-bfc6-703e-a6c8-01e80fb41ac9`, android/ios 0 errors 0 warnings
- [x] AIT artifact scan PASS — `ait-ad-test-*` 0건, `isDevToolsEnabled() return false`, backend `https://taillogtoss-backend-l35lj.ondigitalocean.app`, brand icon Toss CDN
- [x] AIT actual Toss PASS — Metro/FastAPI off, `viva.republica.toss`에서 `intoss-private://taillog-app?_deploymentId=019e4e5a-bfc6-703e-a6c8-01e80fb41ac9` 실행 확인
- [x] AIT actual Toss CTA PASS — `관련 훈련 바로 시작하기` 탭 시 훈련 상세 `씽씽한 독립심 클래스` 진입, logcat `curriculumId: 'separation_anxiety'`
- [x] DigitalOcean backend prompt deploy PASS — commit `2f237fdb2e2fd2ec24f4e2c986f5ca9a393a5ab6`, deployment `406c2ac2-ab30-435d-889a-7ada930cb660` ACTIVE, `/health` 200, `POST /api/v1/coaching/generation-jobs` no-auth smoke 401
- [ ] `npx tsc --noEmit` — blocked by existing unrelated `src/components/features/dashboard/ShareRewardCard.tsx` type errors

## Remaining QA

- [x] 실제 기기에서 AI 행동 진단 최신 결과의 `관련 훈련 바로 시작하기`가 해당 `/training/detail`로 들어가는지 확인
- [x] 실제 생성 결과에서 `메이의 마음`이 기본 접힘 drawer로 보이는지 확인
- [x] 생성일이 오늘인 결과가 1일차로 강조되는지 확인
- [ ] 2~6일 지난 결과는 해당 일차, 7일 초과 결과는 강조 없음으로 보이는지 추가 히스토리 데이터에서 확인

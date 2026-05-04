# Smart Message 도메인 훅 재구조화 (2026-04-30)

Parity: MSG-001

## 완료 항목

- [x] `src/lib/data/notificationTemplates.ts` — TEMPLATE_CODES 6종 확장 (LOG_REMINDER ✅ 승인, 나머지 ⏳ 등록 대기), `buildTemplate()` 각 타입별 템플릿 코드 매핑
- [x] `src/lib/notifications/index.ts` — 도메인 훅 배럴 신규 생성: `useLogReminder`, `useCoachingReady`, `useTrainingReminder`, `useStreakAlert`, `useSurgeAlert`
- [x] `src/types/notification.ts` — `SmartMessageTemplate.variables` 필드 제거 (Toss 푸시 본문 정적 텍스트 전용, 변수 치환 미지원)
- [x] `src/lib/hooks/useNotification.ts` — `useSendSmartMessage` variables 파라미터 제거
- [x] `src/lib/api/notification.ts` — API 페이로드에서 `variables` 키 제거
- [x] tsc 0 errors 확인

## 콘솔 소재 현황 (정적 텍스트 전용)

| 캠페인 | 제목 (≤7자) | 본문 (≤25자) | 상태 |
|---|---|---|---|
| LOG_REMINDER | 기록하셨나요 | 오늘도 테일로그와 반려견을 기록해보세요 | ✅ 승인 완료 |
| COACHING_READY | AI코칭 완성 | 반려견 맞춤 AI 코칭이 준비됐어요 | ⏳ 등록 대기 |
| TRAINING_REMINDER | 훈련 시간이에요 | 오늘의 훈련 미션을 확인해보세요 | ⏳ 등록 대기 |
| STREAK_ALERT | 연속기록 중 | 연속 기록을 이어가 보세요 | ⏳ 등록 대기 |
| SURGE_ALERT | 행동 급증 감지 | 반려견 행동 패턴을 확인해보세요 | ⏳ 등록 대기 |
| PROMO | 테일로그 Pro | Pro로 AI 코칭을 무제한 이용하세요 | ⏳ 등록 대기 (광고성) |

## 변경 근거

토스 Smart Message 콘솔 푸시 본문은 정적 텍스트 전용 — `{dogName}` 형태의 중괄호 변수 치환 미지원.
기존 `variables: Record<string, string>` 필드가 API 페이로드에 포함되어 있었으나 완전 제거.

## 검증

- tsc: 0 errors
- 4파일 변경: types/notification.ts, lib/data/notificationTemplates.ts, lib/hooks/useNotification.ts, lib/api/notification.ts

# Smart Message 콘솔 등록 가이드 (TaillogToss)

> 최종 갱신: 2026-04-29 | Parity: MSG-001
> 코드 정본: `src/lib/notifications/index.ts`, `src/lib/data/notificationTemplates.ts`

---

## 1. 소재 작성 규칙 (공통)

| 항목 | 제한 |
|---|---|
| 제목 | **최대 7자** (공백 포함) |
| 본문 | **최대 25자** (공백 포함) |
| 톤앤매너 | **해요체** 필수 |
| 비게임 앱 | 제목에 **'토스에서' 또는 '토스'** 포함 필수 |
| 변수 | ❌ 중괄호 변수 불가 — 정적 텍스트만 |

---

## 2. 캠페인 목록

| 타입 | 유형 | 비용 | 콘솔 상태 |
|---|---|---|---|
| `log_reminder` | 기능성 | 무료 | ✅ 승인 완료 |
| `coaching_ready` | 기능성 | 무료 | ⏳ 등록 대기 |
| `training_reminder` | 기능성 | 무료 | ⏳ 등록 대기 |
| `streak_alert` | 기능성 | 무료 | ⏳ 등록 대기 |
| `surge_alert` | 기능성 | 무료 | ⏳ 등록 대기 |
| `promo` | **광고성** | **₩9.9/건** | ⏳ 앱 제출 후 등록 |

---

## 3. 캠페인별 콘솔 입력값

### ① log_reminder ✅ 승인 완료

```
캠페인 제목:  토스에서 기록
발송 방법:    API

[A안]
  푸시 제목:  토스에서 기록          (7자)
  푸시 내용:  오늘 반려견 기록을 남겨요.   (14자)

[B안]
  푸시 제목:  토스 기록 시간          (7자)
  푸시 내용:  잠깐, 기록 한 줄 남겨요.   (12자)

그룹 이름:    기록_퀵로그
랜딩 URL:     /dashboard/quick-log
템플릿 코드:  TAILLOG_BEHAVIOR_REMIND
```

---

### ② coaching_ready ⏳ 등록 대기

```
캠페인 제목:  테일로그 코칭 완성
발송 방법:    API

푸시 제목:  토스 코칭              (5자)
푸시 내용:  AI 코칭 결과가 완성됐어요.  (13자)

그룹 이름:    코칭_결과화면
랜딩 URL:     /coaching/result
템플릿 코드:  TAILLOG_COACHING_READY
```

---

### ③ training_reminder ⏳ 등록 대기

```
캠페인 제목:  테일로그 훈련 알림
발송 방법:    API

푸시 제목:  토스 훈련              (5자)
푸시 내용:  오늘 훈련 미션이 남았어요.  (13자)

그룹 이름:    훈련_아카데미
랜딩 URL:     /training/academy
템플릿 코드:  TAILLOG_TRAINING_REMIND
```

---

### ④ streak_alert ⏳ 등록 대기

```
캠페인 제목:  테일로그 연속 기록
발송 방법:    API

푸시 제목:  토스 연속 기록          (7자)
푸시 내용:  오늘도 기록하고 연속 달성해요.  (15자)

그룹 이름:    연속기록_대시보드
랜딩 URL:     /dashboard
템플릿 코드:  TAILLOG_STREAK_ALERT
```

---

### ⑤ surge_alert ⏳ 등록 대기

```
캠페인 제목:  테일로그 행동 변화
발송 방법:    API

푸시 제목:  토스 행동              (5자)
푸시 내용:  반려견 행동 변화가 감지됐어요.  (16자)

그룹 이름:    행동변화_분석
랜딩 URL:     /dashboard/analysis
템플릿 코드:  TAILLOG_SURGE_ALERT
```

---

### ⑥ promo ⏳ 앱 제출 후 등록

```
캠페인 제목:  테일로그 PRO 안내
발송 방법:    API
캠페인 유형:  광고성  (₩9.9/건, 수신 동의 유저만)

[A안]
  푸시 제목:  토스 PRO              (5자)
  푸시 내용:  AI 코칭을 무제한으로 이용해요.  (16자)

[B안]
  푸시 제목:  토스에서 PRO           (7자)
  푸시 내용:  코칭 횟수 초과 전에 PRO 해요.  (17자)

그룹 이름:    PRO_구독유도
랜딩 URL:     /settings/subscription
세그먼트:     테일로그_앱방문365  (현재 1,000명 미만)
템플릿 코드:  TAILLOG_PROMO
```

---

## 4. 세그먼트

| 이름 | 조건 | 용도 | 인원 |
|---|---|---|---|
| `테일로그_앱방문365` | 서비스 방문 > 테일로그 > 최근 365일 | promo 광고성 타겟 | 1,000명 미만 |

> 기능성 캠페인(①~⑤)은 API가 userId를 직접 지정하므로 세그먼트 불필요.

---

## 5. 코드 연결

```typescript
// src/lib/data/notificationTemplates.ts
TEMPLATE_CODES = {
  LOG_REMINDER:      'taillog-app-TAILLOG_BEHAVIOR_REMIND',  // ✅
  COACHING_READY:    'taillog-app-TAILLOG_COACHING_READY',   // ⏳
  TRAINING_REMINDER: 'taillog-app-TAILLOG_TRAINING_REMIND',  // ⏳
  STREAK_ALERT:      'taillog-app-TAILLOG_STREAK_ALERT',     // ⏳
  SURGE_ALERT:       'taillog-app-TAILLOG_SURGE_ALERT',      // ⏳
  PROMO:             'taillog-app-TAILLOG_PROMO',            // ⏳
}

// 사용 예시 (어디서든)
import { useLogReminder } from 'lib/notifications';
const { send } = useLogReminder();
send(userId);
```

---

## 6. 관련 파일

| 파일 | 역할 |
|---|---|
| `src/lib/notifications/index.ts` | 도메인 훅 배럴 (정본) |
| `src/lib/data/notificationTemplates.ts` | TEMPLATE_CODES + buildTemplate() |
| `src/lib/hooks/useNotification.ts` | TanStack Query mutation 래퍼 |
| `src/types/notification.ts` | NotificationType + CooldownPolicy |
| `supabase/functions/send-smart-message/` | Edge Function |

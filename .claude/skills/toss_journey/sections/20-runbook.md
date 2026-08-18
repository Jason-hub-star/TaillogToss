Section-ID: toss_journey-20
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: internal

### 11.8 구현 우선순위 (Migration Wave 연동)

| 우선순위 | 화면 | Wave | 비고 |
|---------|------|------|------|
| **P0** | login, welcome, survey, survey-result, dashboard, quick-log | Wave 0-1 | Cold Start + Daily Loop 핵심 |
| **P1** | analysis, coaching-result, training-academy, training-detail, notification | Wave 1 | Deep-Dive + 알림 |
| **P2** | subscription, dog-profile, dog-switcher, dog-add, settings | Wave 2 | 수익화 + 프로필 관리 |
| **P3** | ops-today | Wave 3 | B2B 운영 |
| **P4** | EmptyState, ErrorState, 엣지 케이스 | Wave 4 | 폴리싱 + 안정화 |

**Wave 간 의존성**:
- Wave 0-1 (P0): 독립 실행 가능. 최소 MVP.
- Wave 1 (P1): P0 대시보드 데이터(3건+) 필요.
- Wave 2 (P2): P0 인증 + P1 코칭 데이터 필요.
- Wave 3 (P3): P2 구독/역할 시스템 필요.
- Wave 4 (P4): 전체 화면 완성 후 엣지 케이스 처리.

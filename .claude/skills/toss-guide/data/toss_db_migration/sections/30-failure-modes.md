Section-ID: toss_db_migration-30
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 7. 불일치 항목 (해결 필요)

| # | 문서 | 값 | 비고 |
|---|------|----|------|
| 1 | `SCHEMA-B2B.md` 2.1절 | UserRole에 `admin` 포함 (5개) | CLAUDE.md/12-MIGRATION는 4개 (admin 없음) |
| 2 | DogCoach `users.role` | enum (GUEST/USER/PRO_USER/EXPERT/ADMIN) | TaillogToss는 TEXT CHECK 4개로 전환 |
| 3 | DogCoach `subscriptions.plan_type` | enum에 PRO_YEARLY 포함 | TaillogToss에서 PRO_YEARLY 제거 |

**결정 기준**: CLAUDE.md > 12-MIGRATION-WAVES-AND-GATES.md > 개별 SCHEMA 문서

---


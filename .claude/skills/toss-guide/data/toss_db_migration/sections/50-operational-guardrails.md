Section-ID: toss_db_migration-50
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 6. 정합성 고정 규칙 (12-MIGRATION 1.1절)

| 항목 | 고정 값 |
|------|---------|
| UserRole | `user \| trainer \| org_owner \| org_staff` |
| 광고 배치 | R1=survey-result, R2=dashboard, R3=coaching-result |
| 백엔드 경로 | `Backend/app/...`(FastAPI), `Backend/alembic/...`(마이그레이션), `supabase/functions/...`(Edge Functions) |
| B2B 제한 | Wave 3 진입 전 타입/테이블 스텁만 허용, 사용자 노출 기능 금지 |

---


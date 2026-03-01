Section-ID: toss_db_migration-20
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: supabase.com/docs

## 4. Alembic 마이그레이션 스크립트 계획

> 경로: `Backend/alembic/versions/` (CLAUDE.md 백엔드 경로 계약 준수)

### Big-Bang 전략 (프로덕션 유저 없음)
- 모든 테이블 Drop → Recreate (데이터 보존 불필요)
- **Up/Down 양방향** 필수

| # | 마이그레이션 | 내용 | Parity ID |
|---|-------------|------|-----------|
| ALM-01 | `001_toss_user.py` | users 재생성 (toss_user_key + 4 roles + pepper_version) | AUTH-001 |
| ALM-02 | `002_toss_subscriptions.py` | subscriptions 수정 (PRO_YEARLY 제거, ai_tokens 추가) | IAP-001 |
| ALM-03 | `003_toss_orders.py` | toss_orders 신규 (2축 상태) | IAP-001 |
| ALM-04 | `004_edge_function_requests.py` | edge_function_requests 신규 (멱등키) | IAP-001 |
| ALM-05 | `005_behavior_logs_b2b.py` | behavior_logs 컬럼 추가 (recorded_by, org_id) | B2B-001 |
| ALM-06 | `006_media_assets_b2b.py` | media_assets 컬럼 추가 | B2B-001 |
| ALM-07 | `007_noti_history_b2b.py` | noti_history 컬럼 추가 | MSG-001 |
| ALM-08 | `008_b2b_organizations.py` | organizations 신규 | B2B-001 |
| ALM-09 | `009_b2b_members.py` | org_members 신규 | B2B-001 |
| ALM-10 | `010_b2b_dogs.py` | org_dogs 신규 | B2B-001 |
| ALM-11 | `011_b2b_assignments.py` | dog_assignments 신규 (partial unique) | B2B-001 |
| ALM-12 | `012_b2b_reports.py` | daily_reports 신규 (XOR split FK) | B2B-001 |
| ALM-13 | `013_b2b_interactions.py` | parent_interactions 신규 | B2B-001 |
| ALM-14 | `014_b2b_analytics.py` | org_analytics_daily 신규 | B2B-001 |
| ALM-15 | `015_b2b_subscriptions.py` | org_subscriptions 신규 (XOR + plan CHECK) | B2B-001 |
| ALM-16 | `016_b2b_ai_cost.py` | ai_cost_usage_org 신규 | B2B-001 |
| ALM-17 | `017_b2b_pii.py` | org_dogs_pii + RLS + RPC + CRON 함수 | B2B-001 |

---


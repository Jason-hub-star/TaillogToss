# Supabase Schema Index (Single View)

Last updated: 2026-03-01 (Asia/Seoul)
Source priority: 1) Supabase MCP live metadata 2) `supabase/migrations/*.sql` 3) `Backend/app/shared/models.py`

## 1) Snapshot

- Public schema tables: 38
- RLS enabled tables: 38 / 38
- Key B2B helper functions: 5
- Public enums: 13
- Applied migrations on remote DB: 9

## 2) Public Table Inventory (Live DB)

### Core/Auth/Billing
- `users`
- `subscriptions`
- `dogs`
- `dog_env`
- `user_settings`
- `noti_history`
- `toss_orders`
- `edge_function_requests`

### Behavior/Coaching
- `behavior_logs`
- `media_assets`
- `ai_coaching`
- `action_tracker`
- `log_summaries`
- `ai_recommendation_snapshots`
- `ai_recommendation_feedback`
- `ai_cost_usage_daily`
- `ai_cost_usage_monthly`

### Training Content/Execution
- `content_providers`
- `content_metrics`
- `training_library`
- `training_media`
- `training_plans`
- `plan_items`
- `training_sessions`
- `training_goals`
- `training_behavior_snapshots`
- `user_training_status`

### B2B Layer
- `organizations`
- `org_members`
- `org_dogs`
- `dog_assignments`
- `daily_reports`
- `parent_interactions`
- `org_analytics_daily`
- `org_subscriptions`
- `ai_cost_usage_org`
- `org_dogs_pii`
- `pii_access_log`

## 3) B2B Core Tables (Design + DDL Source)

Primary reference: `docs/ref/SCHEMA-B2B.md`
Canonical DDL: `supabase/migrations/20260228020042_b2b_tables_and_extensions.sql`

- 10 new B2B tables: `organizations`, `org_members`, `org_dogs`, `dog_assignments`, `daily_reports`, `parent_interactions`, `org_analytics_daily`, `org_subscriptions`, `ai_cost_usage_org`, `org_dogs_pii`
- Additional audit table: `pii_access_log`
- Existing table extensions: `behavior_logs`, `media_assets`, `noti_history`

## 4) Public Enums (Live DB)

- `asset_type`: PHOTO, VIDEO, LOTTIE_SNAPSHOT
- `difficulty_level`: BEGINNER, INTERMEDIATE, ADVANCED
- `dog_sex`: MALE, FEMALE, MALE_NEUTERED, FEMALE_NEUTERED
- `goal_status`: ACTIVE, COMPLETED, PAUSED, EXPIRED
- `goal_type`: WEEKLY_SESSIONS, DAILY_MINUTES, WEEKLY_REPS
- `noti_channel`: ALIMTALK, WEB_PUSH, EMAIL
- `plan_type`: FREE, PRO_MONTHLY, PRO_YEARLY
- `provider_type`: COMPANY, CREATOR, COMMUNITY
- `report_type`: DAILY, WEEKLY, INSIGHT
- `session_event_type`: PAUSE, RESUME, TREAT, REST, NOTE
- `training_status`: COMPLETED, SKIPPED_INEFFECTIVE, SKIPPED_ALREADY_DONE, HIDDEN_BY_AI
- `user_role`: user, trainer, org_owner, org_staff
- `user_status`: active, inactive, banned

## 5) RLS Policy Summary (Live DB)

All public tables have RLS enabled.

High-signal policy counts:
- `behavior_logs`: 4
- `daily_reports`: 3
- `dog_assignments`: 3
- `dog_env`: 5
- `dogs`: 5
- `org_dogs`: 4
- `org_dogs_pii`: 4
- `org_members`: 3
- `organizations`: 2
- `parent_interactions`: 3
- `toss_orders`: 3
- `user_training_status`: 4

B2B helper functions present:
- `is_org_member(uuid) -> boolean`
- `is_parent_of_dog(uuid) -> boolean`
- `is_org_member_with_role(uuid, text[]) -> boolean`
- `get_parent_contact(uuid) -> table(phone_enc bytea, email_enc bytea)`
- `purge_expired_pii() -> integer`

## 6) Migration Status and Drift Check

### Remote applied migrations (MCP)
- `20260212083318_phase7_ai_recommendation_tables`
- `20260212092350_hotfix_user_training_status`
- `20260212095042_training_behavior_snapshots`
- `20260214134529_fix_dog_profiles_rls`
- `20260227030437_phase11_expand_noti_history`
- `20260228015912_b2c_column_gaps_and_enum_migration`
- `20260228020042_b2b_tables_and_extensions`
- `20260228034127_dogs_and_dog_env_rls_write_policies`
- `20260301111950_add_user_training_status_rls_policies`

### Local migration files in repo
- `20260227121000_phase11_expand_noti_history.sql`
- `20260228015912_b2c_column_gaps_and_enum_migration.sql`
- `20260228020042_b2b_tables_and_extensions.sql`
- `20260228124500_dogs_and_dog_env_rls_write_policies.sql`
- `20260228_b2b_tables.sql` (legacy duplicate form)

### Drift notes (needs sync)
- Remote has versions not present in local repo: `20260212083318`, `20260212092350`, `20260212095042`, `20260214134529`, `20260301111950`.
- Similar-purpose migration version mismatch exists for dogs/dog_env RLS:
  - remote: `20260228034127...`
  - local: `20260228124500...`
- `20260228_b2b_tables.sql` and `20260228020042_b2b_tables_and_extensions.sql` overlap heavily. Keep one canonical source (`20260228020042`) and archive/deprecate the other.

## 7) Recommended Operating Rule

- Schema truth source: remote MCP metadata + applied migrations list.
- Code truth source: models and queries in `Backend/app/shared/` + `supabase/functions/`.
- When conflict occurs, treat remote applied migrations as current truth and backfill missing local migration files before next release.

Section-ID: toss_db_migration-23
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 5. RLS 4-tier 접근 제어

### 5.1 헬퍼 함수 (3개)

```sql
is_org_member(_org_id UUID) → BOOLEAN
is_parent_of_dog(_dog_id UUID) → BOOLEAN
is_org_member_with_role(_org_id UUID, _roles TEXT[]) → BOOLEAN
```

전체 DDL은 `docs/SCHEMA-B2B.md` Section 3 참조.

### 5.2 SELECT 4-tier 순서

1. **B2C 소유자**: `dogs.user_id = auth.uid()`
2. **센터 멤버**: `org_id IS NOT NULL AND is_org_member(org_id)`
3. **담당 훈련사**: `dog_assignments WHERE trainer_user_id = auth.uid() AND status = 'active'`
4. **보호자**: `is_parent_of_dog(dog_id)`

### 5.3 쓰기 정책 원칙

- INSERT: 소유자 OR 센터(owner/manager/staff) OR 담당 훈련사
- UPDATE: 작성자 본인(`recorded_by`) OR B2C 소유자
- DELETE: B2C 소유자 OR 센터(owner/manager)만

---


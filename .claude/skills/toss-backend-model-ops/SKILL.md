---
name: toss-backend-model-ops
description: FastAPI + SQLAlchemy + Supabase 모델 작성 규칙 — DB 타입 불일치 방지, async cascade 패턴, Pydantic enum 검증. 2026-05-19 E2E 테스트(Wave 1~9)에서 발견한 BUG-01~05 재발 방지 지침.
---

# Toss Backend Model Ops

FastAPI + SQLAlchemy(async) + Supabase 환경에서 반복적으로 발생하는  
**모델-DB 불일치** 버그를 예방하기 위한 4가지 핵심 규칙.

## 언제 사용하나
- "새 SQLAlchemy 모델 컬럼을 추가할 때"
- "B2B 모델에 enum 컬럼을 추가하려는데"
- "DELETE가 500으로 터지는데 cascade 문제인 것 같아"
- "Pydantic에서 잡아야 할 enum인데 DB CHECK 위반으로 500이 나와"
- "DatatypeMismatchError / UndefinedObjectError 가 났는데"

---

## 규칙 1 — 컬럼 추가 전 DB 타입 먼저 확인

### 문제 패턴
migration 파일의 타입과 SQLAlchemy 모델 선언이 달라 INSERT/UPDATE 시 `DatatypeMismatchError`.

| BUG | 모델 선언 | DB 실제 타입 | 증상 |
|-----|-----------|-------------|------|
| BUG-01 | `Column(String(50))` | `jsonb` | INSERT 500 |
| BUG-05 | `Column(Text)` | `jsonb` | INSERT 500 |
| BUG-05b | `Column(JSONB)` | `text[]` (ARRAY) | INSERT 500 |

### 검증 명령
```sql
-- 새 컬럼 추가 전 반드시 실행
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = '<테이블명>';
```

### 타입 매핑 규칙
| DB 타입 | SQLAlchemy | 비고 |
|---------|-----------|------|
| `jsonb` | `Column(JSONB)` | `from sqlalchemy.dialects.postgresql import JSONB` |
| `text[]` | `Column(ARRAY(String))` | `from sqlalchemy.dialects.postgresql import ARRAY` |
| `uuid[]` | `Column(ARRAY(UUID(as_uuid=True)))` | |
| `text` | `Column(String)` 또는 `Column(Text)` | |
| `timestamptz` | `Column(DateTime(timezone=True))` | |

```python
# 올바른 예
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
behavior_summary = Column(JSONB)             # DB: jsonb
highlight_photo_urls = Column(ARRAY(String), default=[])  # DB: text[]
```

---

## 규칙 2 — Postgres에 없는 Enum 타입 선언 금지

### 문제 패턴
`Enum(MyEnum, name="my_enum_name")`으로 선언하면 SQLAlchemy가 쿼리에  
`$1::my_enum_name` 캐스팅을 추가 → DB에 해당 타입이 없으면 `UndefinedObjectError`.

```
sqlalchemy.exc.ProgrammingError: type "org_member_status" does not exist
```

### 검증 — DB에 실제 enum 타입 존재 여부 확인
```sql
SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;
```
이 목록에 없는 이름으로 `Enum(..., name="...")` 사용 금지.

### 올바른 패턴
```python
# ❌ 잘못된 방법 (DB에 타입이 없는 경우)
status = Column(Enum(OrgMemberStatus, name="org_member_status"), ...)

# ✅ 올바른 방법: Python Enum은 유지, DB는 String
class OrgMemberStatus(str, PyEnum):
    PENDING = "pending"
    ACTIVE  = "active"

status = Column(String, default=OrgMemberStatus.ACTIVE.value)
```

> DB에 실제로 enum 타입이 있는 경우(예: `dog_sex`, `user_role`)는 `Enum(name="dog_sex")` 사용 가능.

---

## 규칙 3 — async ORM + cascade 시 반드시 passive_deletes=True

### 문제 패턴
async SQLAlchemy에서 `cascade="all, delete-orphan"` 단독 사용 시  
부모 삭제 전 자식 레코드를 lazy load 시도 → `MissingGreenlet` / 500.

```
sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called
```

### DB 설정 선행 조건
외래키에 `ON DELETE CASCADE` 또는 `ON DELETE SET NULL`이 선언되어 있어야 함.

### 올바른 패턴
```python
# ❌ 잘못된 방법
logs = relationship("BehaviorLog", cascade="all, delete-orphan")

# ✅ 올바른 방법
logs = relationship(
    "BehaviorLog",
    cascade="all, delete-orphan",
    passive_deletes=True,   # DB CASCADE에 위임, lazy load 불필요
)
```

`passive_deletes=True`를 붙여야 하는 관계:
- 부모 삭제 시 자식도 삭제되는 모든 `cascade="all, delete-orphan"` 관계
- 특히 `Dog → BehaviorLog/AICoaching/CaseIntake`, `AICoaching → ActionTracker`

---

## 규칙 4 — 외부 입력 enum 필드는 Pydantic에서 잡기

### 문제 패턴
`reaction: str`처럼 `str`로만 선언하면 Pydantic이 검증을 생략.  
DB CHECK 제약(`IN ('enjoyed','neutral','sensitive')`)을 위반해 500 발생.

```
sqlalchemy.exc.IntegrityError: new row for relation violates check constraint
```

### 올바른 패턴
```python
# ❌ 잘못된 방법
class StepFeedbackUpdate(BaseModel):
    reaction: str  # "enjoyed" | "neutral" | "sensitive"

# ✅ 올바른 방법
class StepReaction(str, Enum):
    enjoyed   = "enjoyed"
    neutral   = "neutral"
    sensitive = "sensitive"

class StepFeedbackUpdate(BaseModel):
    reaction: StepReaction  # 잘못된 값 → 422 (DB까지 안 감)
```

**적용 기준**: DB에 CHECK 제약 또는 enum 제약이 있는 필드 + 외부 입력(request body, query param)

---

## 빠른 체크리스트 (새 모델/컬럼 추가 시)

```
□ DB 실제 타입을 information_schema.columns로 확인했는가?
□ jsonb/text[]/uuid[] 컬럼에 올바른 SQLAlchemy 타입을 사용했는가?
□ Enum(name="...")을 쓰기 전에 pg_type에서 해당 타입 존재를 확인했는가?
□ cascade="all, delete-orphan"에 passive_deletes=True를 붙였는가?
□ 외부 입력 enum 필드에 Pydantic Enum 타입을 선언했는가?
```

---

## 참고: 발견 이력 (2026-05-19 E2E Wave 1~9)

| BUG | 파일 | 수정 내용 | 관련 규칙 |
|-----|------|----------|----------|
| BUG-01 | models.py | `daily_activity` String(50)→JSONB | 규칙 1 |
| BUG-02 | training/schemas.py | `StepReaction` enum 추가 | 규칙 4 |
| BUG-03 | models.py | Dog/AICoaching 관계에 `passive_deletes=True` | 규칙 3 |
| BUG-04 | models.py | B2B 8개 컬럼 `Enum(name=...)`→`String` | 규칙 2 |
| BUG-05 | models.py | `behavior_summary` Text→JSONB, `highlight_photo_urls` JSONB→ARRAY(String) | 규칙 1 |

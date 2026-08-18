Section-ID: toss_db_migration-40
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 8. 검증 체크리스트

### 마이그레이션 실행 검증
- [ ] `alembic upgrade head` 성공
- [ ] `alembic downgrade -1` → `alembic upgrade head` 왕복 성공
- [ ] B2B 테이블이 B2C 기능에 무영향 확인 (nullable FK만)
- [ ] `npx tsc --noEmit` FE 타입 동기화 확인

### RLS 검증
- [ ] B2C 소유자: 자기 개 데이터만 조회
- [ ] 센터 멤버: 소속 조직 데이터만 조회
- [ ] 담당 훈련사: 배정된 개 데이터만 조회
- [ ] 보호자: 공유된 리포트만 조회
- [ ] PII 직접 쿼리 차단 확인

### 성능 검증
- [ ] 40마리 리스트 스크롤 성능 (Wave 3 게이트)
- [ ] 4-tier RLS EXPLAIN ANALYZE 벤치마크

---


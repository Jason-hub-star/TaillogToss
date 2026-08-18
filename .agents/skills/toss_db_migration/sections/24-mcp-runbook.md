Section-ID: toss_db_migration-24
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: supabase.com/docs

## 9. Supabase MCP 활용

다음 세션부터 `.mcp.json` 설정으로 Supabase MCP 도구 사용 가능.

### 사용 가능한 MCP 작업
- `list_tables`: 현재 테이블 목록 조회
- `get_table_schema`: 특정 테이블 DDL 확인
- `execute_sql`: 마이그레이션 SQL 실행 (주의: 프로덕션 DB에서는 금지)
- `search_docs`: Supabase 문서 검색

### MCP로 할 수 있는 검증
1. 현재 DogCoach DB 실제 테이블 목록 대조
2. 각 테이블 실제 컬럼/인덱스/RLS 확인
3. 마이그레이션 SQL 로컬 실행 테스트
4. RLS 정책 동작 테스트

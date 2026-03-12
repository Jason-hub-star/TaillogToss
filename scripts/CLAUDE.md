# scripts/

Operational scripts for repeatable project maintenance.

- Scripts must be idempotent where possible.
- Support dry-run mode before destructive operations.
- Pre-commit hook (husky + lint-staged): 커밋 시 staged 파일 lint/format + 전체 typecheck 자동 실행.

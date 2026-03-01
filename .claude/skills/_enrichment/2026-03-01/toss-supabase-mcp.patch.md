# Patch: ops/toss-supabase-mcp — 2026-03-01

Target: `.claude/skills/toss-guide/ops/toss-supabase-mcp/SKILL.md`
Run ID: 20260301-0030

## Added Sections

### ## Failure Modes (marker: `enrich:a3f1c8d2e901`)
Items added: 3

```diff
+ ## Failure Modes
+ <!-- enrich:a3f1c8d2e901 -->
+ - Edge Function 번들 사이즈가 10MB를 초과하면 배포가 거부되므로, 의존성 최소화 또는 함수 분할이 필요하다.
+   (source: https://supabase.com/docs/guides/functions/troubleshooting)
+ - 546 오류는 Edge Function의 wall-clock timeout 또는 메모리/CPU 한계 초과를 의미하며,
+   함수 재구성 또는 작업 분할로 해소해야 한다.
+   (source: https://supabase.com/docs/guides/functions/troubleshooting)
+ - `_shared/*` 파일이 배포 payload에 누락되면 런타임 첫 호출에서 import 에러(500)가 발생하므로,
+   배포 직후 스모크 호출로 즉시 확인해야 한다.
```

### ## Operational Guardrails (marker: `enrich:b7d4e2f0c512`)
Items added: 2

```diff
+ ## Operational Guardrails
+ <!-- enrich:b7d4e2f0c512 -->
+ - Static egress IP 허용 목록은 Supabase Edge에서 지원하지 않으므로, 외부 방화벽 IP 화이트리스트 정책이
+   필요한 경우 대안 아키텍처를 설계해야 한다.
+   (source: https://supabase.com/docs/guides/functions/troubleshooting)
+ - CI/CD 환경에서 배포 전 `supabase link --project-ref <id>` 선행 없이 `deploy` 실행 시 프로젝트
+   미지정 오류가 발생하므로, 링크 단계를 파이프라인 앞에 배치해야 한다.
+   (source: https://supabase.com/docs/guides/functions/deploy)
```

## Sources
- https://supabase.com/docs/guides/functions/troubleshooting (confidence: 0.92)
- https://supabase.com/docs/guides/functions/deploy (confidence: 0.90)

## Stats
- scanned_sections: 5 (언제 사용하나, 기본 원칙, 표준 절차, 자주 쓰는 점검 항목, 실패 대응)
- added_items: 5
- skipped_duplicates: 0
- new_categories: 2

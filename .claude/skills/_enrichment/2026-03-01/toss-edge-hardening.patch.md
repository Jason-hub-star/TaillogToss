# Patch: security/toss-edge-hardening — 2026-03-01

Target: `.claude/skills/toss-guide/security/toss-edge-hardening/SKILL.md`
Run ID: 20260301-0030

## Added Sections

### ## Failure Modes (marker: `enrich:f1b6c3e8a956`)
Items added: 3

```diff
+ ## Failure Modes
+ <!-- enrich:f1b6c3e8a956 -->
+ - `--no-verify-jwt`(`verify_jwt=false`) 설정 시 누구나 인증 없이 함수를 호출할 수 있으므로,
+   함수 내부에서 반드시 `/auth/v1/user` 또는 동등한 자체 검증 로직을 포함해야 한다.
+   (source: https://supabase.com/docs/guides/functions/deploy)
+ - `isAdminRole()` 허용 role 범위를 축소하면 기존 사용자의 서비스가 갑자기 403으로 차단될 수 있으므로,
+   패치 전 현재 사용 중인 role 목록을 DB에서 먼저 확인한다.
+ - 번들 사이즈 10MB 초과 시 배포 자체가 거부되므로, `_shared/` 모듈이 누적되면
+   주기적으로 사이즈를 측정해야 한다.
+   (source: https://supabase.com/docs/guides/functions/troubleshooting)
```

### ## Operational Guardrails (marker: `enrich:02d5f7a1c867`)
Items added: 3

```diff
+ ## Operational Guardrails
+ <!-- enrich:02d5f7a1c867 -->
+ - 배포 전 `npm run typecheck` + `npm run test:edge`를 CI 필수 단계로 포함하여
+   role 파싱 회귀를 조기 탐지해야 한다.
+ - 패치 후 재배포 시 `_shared/*` 파일을 payload에 반드시 포함해야 bundling 실패를 방지할 수 있으며,
+   누락 시 런타임 import 오류로 첫 호출이 실패한다.
+ - 런타임 보안 검증(위조 헤더 probe)은 패치 배포 직후에만 수행하며,
+   증적(`sb-request-id` + Edge 로그 버전 일치)을 보고서에 포함해야 완료로 인정한다.
```

## Sources
- https://supabase.com/docs/guides/functions/deploy (confidence: 0.92)
- https://supabase.com/docs/guides/functions/troubleshooting (confidence: 0.90)

## Stats
- scanned_sections: 7 (언제 사용하나, 핵심 원칙, 함수별 최소 권한 정책, 작업 순서, 증적 최소 세트, 완료 기준, 보고 포맷)
- added_items: 6
- skipped_duplicates: 0
- new_categories: 2

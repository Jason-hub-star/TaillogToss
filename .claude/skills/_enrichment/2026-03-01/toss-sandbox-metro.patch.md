# Patch: ops/toss-sandbox-metro — 2026-03-01

Target: `.claude/skills/toss-guide/ops/toss-sandbox-metro/SKILL.md`
Run ID: 20260301-0030

## Added Sections

### ## Operational Guardrails (marker: `enrich:35a1c6d9b290`)
Items added: 3

Note: 기존 `## 트러블슈팅` 섹션이 이미 상세 오류별 대응을 커버하므로,
Operational Guardrails는 사전 점검 패턴(예방) 위주로 구성.

```diff
+ ## Operational Guardrails
+ <!-- enrich:35a1c6d9b290 -->
+ - LAN IP(`DEV_LAN_BACKEND_URL`)는 네트워크 변경 시마다 수동 업데이트가 필요하므로,
+   `.env.local`로 추출하거나 세션 시작 루틴에 `ipconfig` 확인 단계를 포함한다.
+ - Windows 방화벽 8000번 인바운드 허용 규칙이 없으면 실기기 → PC FastAPI 요청이 무소음으로
+   drop되므로, 세션 시작 전 `netsh advfirewall` 규칙 존재 여부를 확인한다.
+ - `adb reverse tcp:8081 tcp:8081`은 USB 재연결 또는 Android 재시작 시 해제되므로,
+   Metro 번들 오류 발생 시 먼저 adb reverse를 재실행한다.
```

## Sources
- Project operational knowledge (confidence: 0.95, based on 2026-02-28 confirmed resolution)

## Stats
- scanned_sections: 6 (목적, 빠른 결론, 로컬 Metro 연결 절차, 테스트 모드 구분, 검증 체크리스트, 트러블슈팅, 로그인 성공 패턴, 공식 문서)
- added_items: 3
- skipped_duplicates: 2 (adb reverse, Windows 방화벽 — 트러블슈팅에 부분 커버됨, guardrail 관점 추가)
- new_categories: 1

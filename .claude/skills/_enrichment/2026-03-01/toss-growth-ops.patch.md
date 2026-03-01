# Patch: monetization/toss-growth-ops — 2026-03-01

Target: `.claude/skills/toss-guide/monetization/toss-growth-ops/SKILL.md`
Run ID: 20260301-0030

## Added Sections

### ## Failure Modes (marker: `enrich:46b2d7e0a301`)
Items added: 4

```diff
+ ## Failure Modes
+ <!-- enrich:46b2d7e0a301 -->
+ - 세그먼트명은 삭제 후 재사용 불가이므로, 잘못된 이름으로 저장된 세그먼트는 복구가 불가하고
+   새 이름으로 신규 생성만 가능하다 — 네이밍 규칙을 사전에 확정한다.
+ - Smart Message 템플릿 검수는 영업일 2~3일 소요되므로, 캠페인 예정일보다 최소 3영업일 전에
+   검수 요청을 제출하지 않으면 일정 지연이 발생한다.
+ - Promotion `KEY`는 발급 후 1시간 이내에 `executePromotion`을 호출해야 하며,
+   만료 후 실행 시 오류가 반환되므로 발급-실행 간격이 1시간을 초과하지 않도록 플로우를 설계한다.
+ - `resultType`이 `SUCCESS`가 아닐 때 즉시 재시도하면 중복 지급이 발생할 수 있으므로,
+   원인 코드를 분기한 후 재실행해야 한다.
```

## Sources
- Project/Toss Developers documentation (confidence: 0.90)
- https://developers-apps-in-toss.toss.im/promotion/qa.html (referenced in skill)

## Stats
- scanned_sections: 6 (언제 사용하나, 공식 문서, 운영 순서, 핵심 체크포인트×5, 실행 결과 기록 포맷, 문서 동기화 규칙)
- added_items: 4
- skipped_duplicates: 1 (세그먼트 네이밍 — 핵심 체크포인트에 부분 언급, failure consequence 관점 추가)
- new_categories: 1

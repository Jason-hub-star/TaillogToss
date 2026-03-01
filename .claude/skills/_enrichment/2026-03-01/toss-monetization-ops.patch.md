# Patch: monetization/toss-monetization-ops — 2026-03-01

Target: `.claude/skills/toss-guide/monetization/toss-monetization-ops/SKILL.md`
Run ID: 20260301-0030

## Added Sections

### ## Failure Modes (marker: `enrich:57c3e8f1b412`)
Items added: 4

```diff
+ ## Failure Modes
+ <!-- enrich:57c3e8f1b412 -->
+ - IAP 상품 이미지가 `1024x1024` 미충족이거나 현금성/환가성+토스포인트 결합 상품 등록 시
+   콘솔 심사에서 차단되므로, 상품 등록 전 정책 요건을 사전 점검한다.
+ - TossPay 테스트 키는 결제 생성만 가능하고 실승인이 불가하므로, 실 결제 플로우 E2E 검증은
+   운영 키 발급(영업일 7~14일) 후에만 수행 가능하다.
+ - Ads 광고 그룹 ID 전파는 최대 2시간 소요되므로, 그룹 생성 직후 SDK 호출 시 광고가
+   노출되지 않을 수 있으며 이를 결함으로 오판하지 않는다.
+ - mTLS 인증서 미설정 또는 만료 시 토스 로그인/IAP/프로모션/기능성 메시지 전 계열의
+   S2S 호출이 연결 단계에서 실패하므로, 인증서 교체 일정을 운영 캘린더에 등록한다.
+   (source: https://developers-apps-in-toss.toss.im/development/integration-process.html)
```

## Sources
- https://developers-apps-in-toss.toss.im/development/integration-process.html (confidence: 0.90)
- Project/skill content (IAP 정책, Ads 전파, TossPay 테스트 키 한계 — confidence: 0.95)

## Stats
- scanned_sections: 8 (언제 사용하나, 공식 문서, 운영 순서, 통신 선행조건, Ads 체크리스트, IAP 체크리스트, TossPay 체크리스트, 증적 포맷)
- added_items: 4
- skipped_duplicates: 2 (IAP 정책 — checklist에 이미 있음, Ads ID 전파 — checklist에 부분 있음; failure consequence 관점으로 추가)
- new_categories: 1

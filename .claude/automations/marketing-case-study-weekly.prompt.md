# marketing-case-study-weekly

> Cron: 매주 목 14:00 (Asia/Seoul) | Model: sonnet
> 마스터 플랜: `/Users/family/.claude/plans/unified-finding-yao.md` §4 (Phase 1B)
> 잠금 L11 절대 준수

## 목적

익명화된 행동 개선 사례 1건을 자동 생성 → 사용자 검수 → 승인 후 큐 INSERT.

## 흐름

1. **시드 생성** — `seed-case-study` Edge Function 호출
   - `vw_marketing_behavior_improvement` 뷰에서 improvement_pct ≥ 30% 케이스 무작위 1건
   - Markdown 사례연구 본문 생성 (제목/배경/관찰지표/결론)
   - `assertMarketingContentSafe` PII 검사 통과 (L11)
2. **사용자 검수 요청** — 텔레그램으로 다음 형식 전송:
   ```
   📊 새 사례연구 후보

   사례 ID: 사례 #abc12345
   카테고리: 중형견 성견 / 짖음 행동
   1주차 → 4주차: 7.2 → 3.1 (개선률 57%)

   ---
   [본문 미리보기 첫 300자]
   ---

   ✅ 승인하시려면 "approve {case_id}" 답장
   ❌ 거절하시려면 "reject {case_id}" 답장
   ```
3. **승인 처리** — 텔레그램 답장 폴링 (최대 24h)
   - approve: `instagram_queue` + `threads_queue` + `tailog-marketing-site/content/blog/case-studies/{case_id}.mdx` 동시 INSERT
   - reject: 상태 'skipped' 기록, 다음 주에 다른 케이스 재시도
   - 무응답 24h: 자동 'skipped'
4. **L11 위배 시** — 즉시 중단 + 텔레그램 위반 내용 전체 보고

## 통과 기준

- [ ] 익명화 뷰에서 1건 추출
- [ ] PII 검사 통과
- [ ] 텔레그램 검수 요청 도착
- [ ] 24h 내 사용자 응답 처리 또는 자동 skip

## 환경변수

- `SUPABASE_SERVICE_ROLE_KEY`
- `MARKETING_TELEGRAM_BOT_TOKEN`, `MARKETING_TELEGRAM_CHAT_ID`

## 사전 조건

- `users.marketing_data_consent=true` 사용자 ≥ 1명
- `behavior_logs` 30일치 데이터 누적
- 마이그레이션 `20260522000200_marketing_data_consent.sql` + `20260522000300_marketing_anonymized_views.sql` 적용

## 출력

- 텔레그램 검수 메시지 1건
- 승인 시 3개 큐에 동시 INSERT (blog/threads/instagram)

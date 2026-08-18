# marketing-weekly-report

> Cron: 매주 일 21:00 (Asia/Seoul) | Model: opus
> 마스터 플랜: `/Users/family/.claude/plans/unified-finding-yao.md` §4

## 목적

지난 7일 마케팅 메트릭을 텔레그램 + `docs/marketing/MARKETING-BOARD.md` 누적 비용 표에 보고.

## 흐름

1. **데이터 수집** — Supabase에서 다음 집계
   - 발행 수: threads_queue/instagram_queue WHERE status='published' AND published_at >= now() - 7days
   - 인사이트 합산: insights_log 7일치 (views, reach, likes, comments, shares, saves)
   - 비용 누적: marketing_budget_log 이번 달 합계
   - 블로그 발행: tailog-marketing-site/content/blog/ 최근 7일 신규 파일
2. **GA4 데이터** (옵션) — `NEXT_PUBLIC_GA_ID` 설정 시 GA4 API로 채널별 referer 분포 조회
3. **L3 예산 가드레일 점검**
   - 이번 달 누적 ≥ 40,000원: 텔레그램 알림
   - 이번 달 누적 ≥ 50,000원: 다음 광고 부스트 자동 일시정지
4. **L9 잠금 위배 점검** — 지난 7일 자기리뷰 보고서 스캔, 위배 신고 0건 확인
5. **리포트 생성** — Markdown:
   ```
   ## 주간 마케팅 리포트 (YYYY-MM-DD ~ YYYY-MM-DD)
   - 신규 블로그 글: N개
   - Threads 발행: N건 / 누적 도달 N
   - Instagram 발행: N건 / 누적 도달 N / 좋아요 N
   - 당근 캡션 봇 전송: N건
   - 이번 달 누적 비용: ₩N / ₩50,000 (가드레일)
   - L 위배 신고: N건
   ```
6. 텔레그램 전송 + `MARKETING-BOARD.md` 누적 비용 표 갱신

## 통과 기준

- [ ] 텔레그램 리포트 1건 도착
- [ ] 누적 비용 표 갱신
- [ ] 예산 가드레일 점검 완료
- [ ] L9 위배 0건 확인

## 환경변수

- 모든 위 자동화의 env 종합
- 추가: `GA4_API_SECRET` (선택)

# marketing-blog-publish-nightly

> Cron: 매일 22:00 (Asia/Seoul) | Model: sonnet
> 출처: `mungmungfit/.claude/automations/blog-publish-nightly.prompt.md` fork
> 마스터 플랜: `/Users/family/.claude/plans/unified-finding-yao.md` §4

## 목적

tailog.kr 블로그 큐 상태를 매일 밤 점검하고 변경분을 텔레그램으로 보고.

## 흐름

1. `/Users/family/jason/tailog-marketing-site/content/blog/` 의 `.mdx` 파일 목록 스캔
2. frontmatter 검증 — slug/title/description/date/author/category/tags/keywords 필수 필드 누락 검사
3. 잠금 L6 톤 검사 — "교정", "복종", "혼낸다", "다운로드", "설치" 금지어 자동 grep
4. 어제 대비 신규 글 검출
5. `/Users/family/jason/tailog-marketing-site/docs/BLOG-QUEUE-STATUS.md` 갱신
6. `TaillogToss/docs/marketing/MARKETING-BOARD.md` 의 페이즈 진행 표 갱신
7. 텔레그램으로 결과 보고 (신규 글 수, 톤 위반 건수, 다음 발행 예정)

## 통과 기준

- [ ] frontmatter 검증 0 errors
- [ ] L6 톤 위반 0건 (위반 시 즉시 중단 + 텔레그램 알림)
- [ ] git status clean (auto-commit 없음 — 사용자가 직접 push)
- [ ] 텔레그램 메시지 1건 도착

## 입력

없음 (스케줄 트리거).

## 출력

- `tailog-marketing-site/docs/BLOG-QUEUE-STATUS.md` 업데이트
- 텔레그램 메시지 1건

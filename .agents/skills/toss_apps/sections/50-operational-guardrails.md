Section-ID: toss_apps-50
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im,supabase.com/docs

## Operational Guardrails
- 콘솔 설정 변경은 코드 반영과 분리하지 말고 동일 run에서 증적을 함께 기록한다.
- 보상/결제/로그인 흐름은 기능 추가 전/후 스모크 시나리오를 반드시 재실행한다.
- 심사 체크리스트 위반 가능 항목(응답시간, 뒤로가기, 번들크기)을 릴리즈 전 고정 점검한다.

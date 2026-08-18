Section-ID: toss_apps-30
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: developers-apps-in-toss.toss.im,supabase.com/docs

## Failure Modes
- Toss Sandbox 진입 스킴이 appName과 불일치하면 앱 진입 자체가 실패한다.
- mTLS 인증서 누락/만료 시 로그인/결제/프로모션 S2S 호출이 연결 단계에서 실패한다.
- SDK/콘솔 버전 갭이 크면 테스트는 통과해도 실제 심사에서 reject 될 수 있다.

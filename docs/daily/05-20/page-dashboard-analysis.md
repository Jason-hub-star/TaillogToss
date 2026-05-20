# /dashboard/analysis — BackButton 공용화

## Scope

- Parity: UIUX-001, UI-001, LOG-001, APP-001, B2B-001, B2B-002
- Skill: `page-dashboard-analysis-upgrade`, `feature-navigation-and-gesture`
- Source route: `/dashboard/analysis`

## Checklist

- [x] `/dashboard/analysis` 좌상단 PNG 뒤로가기 버튼을 공용 `BackButton`으로 승격
- [x] `components/shared` barrel export에 `BackButton`, `BackButtonSpacer` 추가
- [x] shared layouts(`ListLayout`, `DetailLayout`, `FormLayout`)의 텍스트 화살표 뒤로가기 제거
- [x] 직접 헤더 구현 페이지의 뒤로가기 버튼 교체: quick-log, legal, dog, ops, parent reports
- [x] 분석 페이지 공유 버튼 슬롯 폭을 맞춰 헤더 중앙 정렬 보정
- [x] `npx tsc --noEmit` PASS
- [x] scoped `git diff --check` PASS
- [ ] 실기기 시각 QA: Toss runtime gate가 `지금은 서비스를 사용할 수 없어요` 화면으로 막혀 앱 내부 화면까지 진입 실패

## Evidence

- New component: `src/components/shared/BackButton.tsx`
- Import form:
  - `import { BackButton, BackButtonSpacer } from 'components/shared/BackButton';`
  - `import { BackButton } from 'components/shared';`
- Validation:
  - TypeScript: PASS
  - Diff whitespace check: PASS
- Device attempt:
  - `adb shell am start -a android.intent.action.VIEW -d intoss://taillog-app/dashboard/analysis`
  - Screenshot captured at `/tmp/taillog-backbutton-analysis.png`, but Toss host displayed service-unavailable gate before app render.

## Follow-up

- Re-run visual QA after Toss dev/runtime entry is restored.
- Check `/dashboard/analysis`, `/dashboard/quick-log`, `/dog/add`, `/legal/terms` for header alignment and touch target consistency.

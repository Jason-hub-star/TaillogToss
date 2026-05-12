# 2026-05-12 — Pro 상담지 확장

## Scope

- Parity: `APP-001`, `AI-001`, `B2B-001`, `UIUX-006`, `PRO-INTAKE-001`
- Routes: `/onboarding/stage3-form`, `/dog/profile`, `/ops/today`
- Baseline: `e1d2d51 chore: baseline before pro intake expansion`

## 목표 체크리스트

- [x] `/onboarding/stage3-form`에 Pro 핵심 3섹션 추가
  - [x] 행동 고민/목표
  - [x] 상황별 행동 에피소드
  - [x] 미용·핸들링·소리 민감도
- [x] 건강, 입양/사회화, 영양, 산책/놀이/배변, 교육 경험, 기질 세부 항목을 선택 섹션으로 저장
- [x] `case_intakes` 저장 단위 추가 및 `dog_env` 최신 요약 동기화
- [x] `/dog/profile`에 Pro 상담지 요약, 완성도, 대표 에피소드 수, 민감도/핸들링/건강 요약 표시
- [x] 상세 수정 진입을 `/onboarding/stage3-form?dogId=...&mode=edit`로 연결
- [x] B2B 페이지가 개인 반려견 온보딩 완료 여부로 막히지 않도록 수정
- [x] org 없는 B2B 유저를 `/ops/setup`으로 안내
- [x] AI 프롬프트에 상담지 확장 블록 반영
- [x] 우디 + 합성 fixture 5케이스 추천 결과 검증

## 검증 체크리스트

- [x] `npm run typecheck`
- [x] `npm run test:app -- --runInBand --passWithNoTests`
- [x] `Backend/venv/bin/pytest Backend/tests/ -v`
- [x] Stage 3 핵심 3섹션 저장/복원
- [x] 선택 섹션 비워도 저장 가능
- [x] 긴 서술형과 여러 에피소드 저장/복원
- [x] `/dog/profile` 요약 표시와 수정 진입
- [x] B2B 무한 로딩 해소
- [x] 무료 B2B 상담지 작성 가능, AI 리포트 생성 잠금 경로 유지
- [x] AI 결과가 `case_summary`, `behavior_episodes`, `grooming_handling`, `noise_sensitivity`, `protective_factors`, `owner_goals`를 반영
- [x] `Backend/.env` 기반 실제 OpenAI 호출로 우디 + 5 fixture 6블록 생성
- [x] ADB 실기기 `SM_S926N`에서 `/onboarding/stage3-form` 렌더 확인
- [x] ADB 실기기 `SM_S926N`에서 `/dog/profile` Pro 상담지 요약 카드 렌더 확인

## 작업 로그

- 2026-05-12: 구현 전 baseline 커밋/푸시 완료.
- 2026-05-12: Stage 3 Pro 상담지, `case_intakes`, profile summary, B2B guard/org redirect, AI prompt expansion 구현.
- 2026-05-12: `npm run typecheck`, `npm run test:app -- --runInBand --passWithNoTests`, `Backend/venv/bin/pytest Backend/tests/ -v` PASS.
- 2026-05-12: `python3 scripts/pro_intake_fixture_report.py`로 우디 + 5 합성 fixture 병렬 추천 비교표 생성.
- 2026-05-12: `Backend/.env`의 `OPENAI_API_KEY`를 사용해 실제 OpenAI 병렬 호출 성공. 6케이스 합산 비용 약 `$0.004838`, 입력/출력 토큰 범위 `1028~1136 / 992~1154`, latency `15.1~17.5s`.
- 2026-05-12: ADB reverse `tcp:8081`, `tcp:8765` 설정 후 `viva.republica.toss.test` 실행. `GraniteActivity` resumed, `/onboarding/stage3-form` 및 `/dog/profile` 스크린샷 검증 완료.
- 2026-05-12: AI 프롬프트에 기법/심리원리/도구/환경/단계/성공기준/중단기준/상담지근거 라벨과 humane technique search space 추가. 우디 실제 호출에서 탈감작·안전 신호·도구·환경·10초 기준까지 반영 확인.
- 2026-05-12: Pro 상담지 edit mode CTA를 `저장하기`로 변경.

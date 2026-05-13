# /coaching/result — AI 코칭 심화 스키마 + 훈련 reference

Date: 2026-05-13
Parity: AI-001, UIUX-005, UI-TRAINING-PERSONALIZATION-001, PRO-INTAKE-001
Status: Done

## Scope
- [x] 6블록 구조 유지
- [x] `action_plan.items[]` optional 심화 필드 추가
- [x] `next_7_days.days[]` optional 심화 필드 추가
- [x] backend training reference catalog 추가
- [x] behavior candidates 기반 curriculum 최대 3개 retrieval
- [x] `Retrieved Training References` 프롬프트 섹션 추가
- [x] 복사 금지 + 상담지 기반 재구성 지시 추가
- [x] Toss-style user-visible text 지시 추가
- [x] Pro action card 접힘 영역 쉬운 라벨 적용
- [x] 기존 저장 리포트 optional 필드 부재 호환 확인

## Validation
- [x] `npm run typecheck` PASS
- [x] `npm run test:app -- --runInBand --passWithNoTests` PASS — 16 suites / 103 tests
- [x] `Backend/venv/bin/pytest Backend/tests/ -v` PASS — 65 tests
- [x] 실제 OpenAI 우디 + 5 fixture 호출 PASS
- [x] label leak check PASS — `[기법]`, `[도구]` 등 화면 문장 누출 없음
- [x] Case E 자원보호 우선순위 보정 후 `impulse_control` 반영 PASS
- [x] ADB `adb reverse tcp:8081 tcp:8081`, `adb reverse tcp:8765 tcp:8765` PASS
- [x] ADB `/coaching/result` 렌더 PASS

## Notes
- 실기기 저장 리포트는 기존 생성본이라 optional 심화 필드가 없어 `자세히 보기` 접힘 영역은 미노출이 정상이다.
- 접힘 영역 렌더는 `FreeBlock.test.tsx`에서 Pro fixture로 검증했다.
- OpenAI 결과 샘플은 우디, 어린 강아지 점프/배변, 산책 반응성, 노령견 핸들링, 구조견 소리/낯선 사람, 다견 자원보호 케이스로 확인했다.

## Board Sync
- [x] `docs/status/PAGE-UPGRADE-BOARD.md` `/coaching/result` updated to 2026-05-13
- [x] `docs/status/11-FEATURE-PARITY-MATRIX.md` AI-001 validation note added
- [x] `docs/status/PROJECT-STATUS.md` latest status updated

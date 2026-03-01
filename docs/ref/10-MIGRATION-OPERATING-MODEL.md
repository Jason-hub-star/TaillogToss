<!-- React Native 이식 운영 모델 -->
<!-- 저장소 경계, 작업 루프, 완료 기준을 정의한다. -->
# 10. Migration Operating Model

## 1) 목적

- 이 문서는 TailLog Toss React Native 이식의 실행 규칙(운영 SSOT)이다.
- 제품/요구사항은 `PRD-TailLog-Toss.md`, `PRD-TailLog-B2B.md`, `SCHEMA-B2B.md`를 따른다.

## 2) 저장소 운영

- Write Repo: `TaillogToss` (모든 수정은 여기서 수행)
- Read-Only Repo: `DogCoach` (원본 참조만 허용)
- 작업 단위는 `Parity ID`로 관리한다.

## 3) 표준 작업 루프

1. 원본 분석: DogCoach 원본 기능/타입/API 확인
2. 매핑 확정: `11-FEATURE-PARITY-MATRIX.md` 항목 지정
3. 구현: RN/TDS 기준으로 변경
4. 검증: 단위/통합/수동 시나리오 확인
5. 동기화: 매트릭스 상태와 노트 업데이트
6. 보고: 변경 파일/검증/리스크 보고

## 4) 기술 가드레일

- FE: `@apps-in-toss/react-native-framework` + TDS React Native
- BE: FastAPI 유지, Toss S2S mTLS는 Edge Function 전담
- Auth: Toss Login -> Edge Function -> Supabase Auth 브릿지

## 5) 완료 기준

- 해당 `Parity ID` 상태가 `Done`으로 갱신됨
- 테스트/검증 결과가 기록됨
- PRD/SCHEMA와 충돌 없음

## 6) 참조 문서

- `PRD-TailLog-Toss.md`
- `PRD-TailLog-B2B.md`
- `SCHEMA-B2B.md`
- `11-FEATURE-PARITY-MATRIX.md`
- `12-MIGRATION-WAVES-AND-GATES.md`

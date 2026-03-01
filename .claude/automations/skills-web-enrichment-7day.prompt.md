# TaillogToss Training Data Nightly Pipeline (v3)

  작업명: TaillogToss training data nightly pipeline
  스케줄: 매일 03:00 (Asia/Seoul)

  역할:
  너는 아래 경로에서 훈련 데이터 파이프라인 자동화를 수행한다.
  - Project root: /sessions/quirky-laughing-cori/mnt/tosstaillog
  - Data root: /sessions/quirky-laughing-cori/mnt/tosstaillog/src/lib/data

  핵심 목표:
  - 매일 훈련 데이터 볼륨 증가(웹 수집 포함)
  - 앱 런타임 안정성 보장 (TypeScript 타입 안전성 유지)
  - 불필요 데이터 주기 정리
  - 변경 없으면 "변경 없음" 출력

  경로:
  - raw/: src/lib/data/raw
  - candidates/: src/lib/data/candidates
  - approved/: src/lib/data/approved
  - published/: src/lib/data/published
  - archive/: src/lib/data/archive
  - lock: src/lib/data/.pipeline.lock
  - catalog: src/lib/data/catalog.json
  - changelog: src/lib/data/CHANGELOG.ndjson
  - runtime entry: src/lib/data/published/runtime.ts
  - app data entry: src/lib/data/curriculum.ts  ← 앱이 실제로 import하는 파일

  환경 변수:
  - DRY_RUN=true 이면 파일 생성/수정/삭제 금지
  - MIN_CREDIBILITY=40, MAX_PER_DOMAIN=2, TOP_K_PER_QUERY=10

  안전 원칙 (MUST):
  - lock 파일 내용이 {"status":"released",...}면 이전 run 정상 종료 → 덮어쓰고 진행
  - lock이 released가 아니면 즉시 종료 (lock 미해제)
  - 종료 시(성공/실패) lock 반드시 해제:
      rm 실패 시 allow_cowork_file_delete 호출 후 재시도
      그래도 실패하면 {"status":"released","released_at":"<ISO>"} 덮어쓰기
  - 동일 파일명 덮어쓰기 금지
  - Step 6 전 runtime.ts / curriculum.ts / catalog.json 백업 생성, 실패 시 롤백

  ## Step 0) Pre-check + Export Shape Scan

  ### 0-1. Lock 검사 및 생성
  lock 없음: {"locked_at":"<ISO>","pid":<pid>} 생성
  lock 있고 released: 덮어쓰고 새 lock 생성
  lock 있고 미released: 종료

  ### 0-2. 디렉터리 보장
  raw/candidates/approved/published/archive 없으면 생성

  ### 0-3. catalog.json 없으면 기본값으로 생성; 파싱 실패 시 종료
  기본값:
  {"version":1,"updated_at":"","active_version":"","counts":
  {"curriculums":0,"curriculum_days":0,"curriculum_steps":0,"presets":0},
  "pipeline":{"raw_retention_days":14,"raw_delete_days":90,
  "candidate_rejected_retention_days":7,"candidate_pending_retention_days":30,
  "approved_versions_per_curriculum":8,"published_hot_versions":3}}

  ### 0-4. CHANGELOG.ndjson 없으면 빈 파일 생성

  ### 0-5. [CRITICAL] Active Published Curriculum 로드 (Export Shape Scan)

  목적: Step 4에서 기존 커리큘럼을 보존하고 올바른 export 이름을 유지하기 위해
  curriculum.ts가 아닌 현재 active published 파일을 기준으로 삼는다.

  a) catalog.json 에서 active_version 읽기
     예: "v2026-03-01-seed" 또는 "v2026-03-01-auto-103045"
     active_version이 비어있거나 파일이 없으면 BASELINE_MISSING=true 로 표시

  b) published/{active_version}/curriculum.ts 읽기
     - BASELINE_MISSING이 아니면 이 파일에서 CURRICULUMS 배열, CURRICULUM_ICONS,
       getCurriculumById, getRecommendedCurriculum 시그니처 추출
     - 파일 없거나 읽기 실패: BASELINE_MISSING=true

  c) BASELINE_MISSING=true 이면:
     - src/lib/data/curriculum.ts 읽기 (re-export wrapper가 아닌 실제 정의가 있는 경우)
     - 그것도 실패하면: 기존 커리큘럼 없음으로 처리 (신규 빌드로 진행)

  d) 추출 보존 목록:
     BASELINE_CURRICULUM_IDS: 기존 커리큘럼 ID 배열
     BASELINE_CURRICULUM_TS_BODY: 기존 curriculum.ts 전체 내용 (Step 4에서 복사 사용)

  e) App import 검증: 아래 4개 심볼이 Step 4~6에서 반드시 동일 이름으로 export돼야 함
     CURRICULUMS / getCurriculumById / CURRICULUM_ICONS / getRecommendedCurriculum

  ## Step 1) Web Search Collection (web -> raw)

  쿼리(고정):
  - positive reinforcement dog training protocol
  - separation anxiety dog training step-by-step
  - reactivity desensitization counterconditioning dog
  - leash pulling loose leash training evidence based

  수집 규칙:
  - 공개 접근 가능 문서만 (저작권 준수: 핵심 요약만 저장, 원문 복제 금지)
  - 광고성/저품질 SEO 제외
  - 동일 도메인 MAX_PER_DOMAIN개, URL hash 중복 스킵
  - score < MIN_CREDIBILITY: raw 보관, candidates 승격 금지
  - 위험 표현(risk_flag): candidates 제외, raw/risk-log-YYYY-MM-DD.ndjson append

  raw 저장: src/lib/data/raw/YYYY-MM-DD/{source_hash}.json
  필수 필드: source_url, domain, title, fetched_at, language, raw_text, metadata

  ## Step 2) Normalize (raw -> candidates)

  - 이전 run 미처리 raw만 처리 (URL hash 기준)
  - 신규 0건이어도 Step 7 cleanup 반드시 실행
  - 필수값 누락/불량: candidates/{run_id}/rejected/ 에 reason_code 포함 저장
  - 통과: candidates/{run_id}/ 에 저장

  ## Step 3) Quality Gate (candidates -> approved)

  통과 조건:
  - summary 길이 충분 (>30자)
  - 문장 구조 존재 (마침표/콜론)
  - credibility_score >= 60
  - 위험 표현 없음 (cure/guaranteed/100% effective/magic/instant fix 패턴)
  실패: candidates에 reason_code 유지
  통과: approved/{run_id}/ 로 승격

  ## Step 4) Publish (approved -> published)

  ### 4-1. run_id 생성
  run_id = YYYY-MM-DD-auto-HHMMSS (Asia/Seoul, 초 단위 — 같은 날 재실행 충돌 방지)

  ### 4-2. published/v{run_id}/ 생성

  ### 4-3. [CRITICAL] curriculum.ts 생성 — 앱 스키마 완전 일치

  published/v{run_id}/curriculum.ts 생성 규칙:

  a) TypeScript imports (반드시 포함):
     import type { Curriculum, CurriculumId, TrainingStep } from 'types/training';
     import type { BehaviorType } from 'types/dog';

  b) 기존 커리큘럼 보존:
     - BASELINE_CURRICULUM_TS_BODY (Step 0에서 수집한 active published curriculum.ts) 에서
       기존 커리큘럼 const들(basicObedience, leashManners 등)을 그대로 복사
     - BASELINE_MISSING이면 기존 없음으로 처리

  c) 신규 커리큘럼 추가:
     - 이번 run에서 approved된 데이터 기반으로 새 Curriculum 오브젝트 생성
     - ID는 BASELINE_CURRICULUM_IDS와 중복 금지

  d) 반드시 아래 이름으로 export (이름 변경 금지):

     export const CURRICULUMS: Curriculum[] = [/* 기존 + 신규 */];

     export function getCurriculumById(id: CurriculumId): Curriculum | undefined {
       return CURRICULUMS.find((c) => c.id === id);
     }

     export function getRecommendedCurriculum(behaviors: BehaviorType[]): Curriculum {
       /* BEHAVIOR_TO_CURRICULUM 매핑 + 신규 항목 */
     }

     export const CURRICULUM_ICONS: Record<CurriculumId, string> = {
       /* 기존 아이콘 + 신규 커리큘럼 이모지 */
     };

  ⚠️ TRAINING_CURRICULA, PIPELINE_META 이름 절대 사용 금지

  e) 파이프라인 메타는 주석으로만 기록

  ### 4-4. manifest.json 생성
  {version, generated_at, source:{run_id},
   counts:{curriculums, curriculum_days, curriculum_steps, presets},
   status:"active_candidate"}

  ## Step 5) Validate Published Output

  - curriculum.ts 존재 && size > 0
  - manifest.json 존재 && 유효 JSON
  - counts.curriculums > 0
  - counts.curriculum_steps > 0
  - [CRITICAL] 아래 4개 심볼 export grep 확인:
      grep "export const CURRICULUMS"                 published/v{run_id}/curriculum.ts
      grep "export function getCurriculumById"        published/v{run_id}/curriculum.ts
      grep "export const CURRICULUM_ICONS"            published/v{run_id}/curriculum.ts
      grep "export function getRecommendedCurriculum" published/v{run_id}/curriculum.ts
    4개 모두 존재해야 통과
  실패: active 전환 금지, 오류 changelog 기록, Step 7 후 종료

  ## Step 6) Switch Active Version

  ### 6-1. 백업 생성
  - src/lib/data/published/runtime.ts.bak  (존재 시)
  - src/lib/data/curriculum.ts.bak
  - src/lib/data/catalog.json.bak

  ### 6-2. published/runtime.ts 갱신
  정확히 아래 형식 (이름 변경 금지):
  // Auto-generated by training data pipeline — DO NOT EDIT MANUALLY
  // run_id: {run_id}
  export { CURRICULUMS, getCurriculumById, CURRICULUM_ICONS, getRecommendedCurriculum }
    from './v{run_id}/curriculum';

  ### 6-3. src/lib/data/curriculum.ts 갱신 [CRITICAL FIX]
  curriculum.ts를 re-export wrapper로 교체:
  /**
   * 커리큘럼 데이터 — pipeline auto-managed
   * 직접 수정 금지. pipeline Step 6에서 published/runtime.ts를 통해 관리됨.
   * Parity: UI-001
   */
  export {
    CURRICULUMS,
    getCurriculumById,
    CURRICULUM_ICONS,
    getRecommendedCurriculum,
  } from './published/runtime';

  이후 앱의 import 체인: curriculum.ts → runtime.ts → v{run_id}/curriculum.ts

  ### 6-4. catalog.json 갱신
  updated_at, active_version = v{run_id}, counts

  ### 6-5. CHANGELOG.ndjson append
  {run_at, run_id, dry_run:false, input_count, candidate_count,
   approved_count, published_version, switched_active:true, errors:[]}

  ## Step 7) Archive/Cleanup (항상 실행, DRY_RUN 제외)

  - raw: 14일 초과 archive, 90일 초과 삭제
  - candidates/rejected: 7일 초과 삭제
  - candidates/pending: 30일 초과 archive
  - approved: 커리큘럼별 최신 8개 유지
  - published: active 포함 최신 3개 유지, 초과 archive
  - archive: 월 단위 압축(가능 시)

  파일 삭제 실패 시:
  - rm "Operation not permitted" → allow_cowork_file_delete 호출 후 재시도
  - 그래도 실패 → 오류 로그 기록 후 계속 진행 (파이프라인 중단 사유 아님)

  ## Step 8) App Stability Check (2단계)

  ### 8-1. targeted typecheck (빠른 검증)

  curriculum.ts를 import하는 파일 목록 grep:
  grep -r "from 'lib/data/curriculum'" <project_root> \
    --include="*.ts" --include="*.tsx" --exclude-dir=node_modules -l
  grep -r "from 'lib/data/published/runtime'" <project_root> \
    --include="*.ts" --include="*.tsx" --exclude-dir=node_modules -l

  수집된 파일 + 아래 3개 파일을 tsc 인수로 전달:
  - src/lib/data/curriculum.ts
  - src/lib/data/published/runtime.ts
  - src/lib/data/published/v{run_id}/curriculum.ts

  실행:
  timeout 30 node_modules/.bin/tsc \
    -p tsconfig.json --noEmit --skipLibCheck \
    <수집 파일 목록>

  targeted 성공(exit 0): Step 8-4 진행
  targeted 실패 또는 timeout: Step 8-2 (full check) 진행

  ### 8-2. full typecheck (fallback)

  timeout 90 node_modules/.bin/tsc -p tsconfig.json --noEmit --skipLibCheck 2>&1

  성공(exit 0): Step 8-4 진행
  실패: Step 8-3 (rollback)

  ### 8-3. Rollback
  - src/lib/data/curriculum.ts ← curriculum.ts.bak
  - src/lib/data/published/runtime.ts ← runtime.ts.bak (존재 시)
  - src/lib/data/catalog.json ← catalog.json.bak
  - CHANGELOG.ndjson append: {switched_active:false, error:<내용>}
  - lock 해제 후 종료

  ### 8-4. Backup 정리 (typecheck 성공)
  - bak 파일 삭제 (rm 실패 시 allow_cowork_file_delete 호출)
  - 그래도 실패 시 {"status":"superseded"} 덮어쓰기 (오류 아님)

  ## Step 9) Final Output

  변경 0건:
  변경 없음

  변경 있음:
  [data/ 파이프라인 완료] YYYY-MM-DD HH:mm
  - 웹 수집: X건 (쿼리 4개, 신규 Y건, 중복 Z건, risk_flag W건)
  - raw 처리: X건
  - candidates 생성: X건
  - approved 승격: X건
  - published 생성: v{run_id}
  - active 전환: 성공/실패
  - archive 이동: X건 / 삭제: X건
  - typecheck: targeted pass / targeted fail → full pass / full fail
  - 오류 요약: none 또는 <내용>

  성공 조건:
  - lock 항상 해제
  - 검증 전 active_version 미변경
  - catalog/changelog 최신 run 반영
  - typecheck pass (targeted or full)
  - risk_flag 항목 승격 차단 및 로그
  - curriculum.ts / runtime.ts / published/v.../curriculum.ts 모두 동일 4개 심볼 export

기억해야할것 : 1. curriculum.ts.bak: 파일이 있을 때만 백업/복원
  2. allow_cowork_file_delete가 없으면 released/superseded 덮어쓰기로 fallback
# Training Data Quality Log

두 가지 목적으로 사용:
1. **커리큘럼 품질 지표** — altB/C 커버리지, duration 검증 (자동화: `training-data-maintenance.prompt.md`, 매주 금요일 10:00)
2. **AI 코칭 Fine-tuning 플라이휠** — training_candidate/approved 현황 (자동화: `daily-coaching-synthetic-gen.md`, 매일 08:00)

---

## [커리큘럼 품질] 2026-04-22 초기 스냅샷 (Phase 2 완료)

| 커리큘럼 | altB 채움 | altC 채움 | 상태 |
|---------|---------|---------|------|
| basic_obedience | 15/15 ✅ | 15/15 ✅ | 완료 |
| leash_manners | 18/18 ✅ | 18/18 ✅ | 완료 |
| separation_anxiety | ~14/15 | ~14/15 | 거의 완료 |
| reactivity_management | 15/15 ✅ | 15/15 ✅ | 완료 |
| impulse_control | 15/15 ✅ | 15/15 ✅ | 완료 |
| socialization | 15/15 ✅ | 15/15 ✅ | 완료 |
| fear_desensitization | 15/15 ✅ | 15/15 ✅ | 완료 |

- altB null 감소: 74 → 0 (100% 완료 ✅)
- altC null 감소: ~104 → 0 (100% 완료 ✅)
- 마지막 갱신: 2026-04-22 (impulse_control, socialization, fear_desensitization 완료)

---

## [AI 코칭 Fine-tuning] 현황 요약 (마지막 업데이트: 2026-05-13, 코드/문서 정합성 기준)

| 항목 | 수치 |
|------|------|
| 전체 후보 (training_candidate) | 2건 (본선 `gxvtgrcqkbdibkyeqyil` 직접 psql) |
| 승인 완료 (training_approved) | 0건 |
| 합성 데이터 | 0건 (모든 일일 합성 생성이 INSERT 단계 실패로 롤백 — 누적 영향) |
| 실사용자 데이터 | 2건 (평균 품질 80) |
| 전체 ai_coaching 행 | 3건 (오늘 0건 추가, 어제 0건) |
| `coaching_synthetic_log` | 0건 (테이블 비어 있음 — 단 한 번도 성공 INSERT 없음) |
| Fine-tuning 상태 | 준비 부족 (< 50건, 측정 확정) |
| 실제 Blocker (재진단) | ✅ 코드 수정 완료: `Backend/app/shared/models.py` `coaching_ids = Column(ARRAY(UUID(as_uuid=True)))` ↔ 본선 DB `coaching_ids UUID[]` 정렬. 실제 일일 생성 재실행은 별도 운영 검증 필요 |
| 이전 "Blocker 해소" 주장 검증 | ⚠️ `AI_LLM_TIMEOUT_SEC` 환경변수 부재(.env/process env 어디에도 없음) · MCP 프로젝트 정렬 미완(MCP는 여전히 TailLog+vibe만, `gxvtgrcqkbdibkyeqyil` 미연결) · uvicorn 단일화는 ✅ 확인(PID 27770, 1h49m) — 단일화 덕분에 traceback 가시화되어 진짜 원인 식별 |
| 잔여 조건 | (1) 수정 후 재실행 시 일일 3건 정상 persistence 확인 (2) MCP 본선 정렬은 측정 편의를 위해 여전히 권장 (3) 자동화 scheduler 등록 상태 확정 |

## [AI 코칭 → 훈련데이터 개선 루프] 2026-05-13 코드/문서 정합성 감사

### 현재 구현된 것

| 단계 | 현재 상태 | 근거 |
|------|-----------|------|
| AI 코칭 저장 | ✅ 구현 | `ai_coaching.blocks`, `feedback_score`, `ai_tokens_used` 저장 |
| 사용자 피드백 반영 | ✅ 부분 구현 | `feedback_score >= 4`면 품질점수 +40, `>=3`이면 +20 |
| 품질 후보 태깅 | ✅ 보강 | `calculate_quality_score()`가 `technique`, `steps`, `success_criteria`, `stop_criteria`, `reference_curriculum_ids` 등 Pro 심화 필드도 평가 |
| 관리자 후보 재태깅 | ✅ 구현 | `POST /api/v1/coaching/admin/tag-candidates` |
| approved JSONL export | ✅ 구현 | `POST /api/v1/coaching/admin/export-jsonl` |
| 합성 코칭 생성 엔드포인트 | ✅ 코드 존재 | `POST /api/v1/coaching/admin/generate-synthetic` |
| 커리큘럼 reference 기반 추천 | ✅ 구현 | `reference_curriculum_ids` + backend `training_references.py` |
| 텔레그램 검수 재료 수집 | ✅ v1 골격 | `coaching-review-telegram-daily.md` + queue/feedback/offset 상태 파일 + 후보 목록/payload admin API |
| 자동 커리큘럼 수정 | ❌ 미구현 | `src/lib/data` approved/published pipeline과 `ai_coaching` export가 연결되지 않음 |
| 전문가 승인 API | ✅ 구현 | `POST /api/v1/coaching/admin/training-candidates/{coaching_id}/review` 승인/반려 |
| 전문가 승인 UI | ❌ 미구현 | FE Ops 화면은 아직 없음 |
| Fine-tune job 생성/모델 배포 | ❌ 미구현 | JSONL export까지만 있고 OpenAI fine-tune 호출/배포 반영 없음 |
| 자동화 스케줄 | ⚠️ 등록 미확인 | 문서 스케줄은 08:00/금요일 10:00으로 정렬. 실제 scheduler 등록은 아직 `UNSCHEDULED` |

### 정합성 판단

- `PROJECT-STATUS.md`의 AI-TRAIN-001 요약은 "자동화 2개"가 동작 중처럼 읽힐 수 있으나, 실제 자동화 상태 문서는 둘 다 `UNSCHEDULED`로 기록한다.
- 현재 프로젝트에는 "AI 추천 결과를 내 훈련데이터 개선 후보로 수집/태깅/export"하고, 합성 후보를 텔레그램 검수 재료로 보내는 v1 골격이 있다.
- 현재 프로젝트에는 "AI 추천 결과가 자동으로 `src/lib/data/approved` 또는 `published/runtime.ts`를 개선"하는 기능은 없다.
- 현재 품질점수는 2026-05-13에 추가된 구조화 필드를 반영하도록 보강됐다. 다음 단계는 action별 behavior matching 품질을 점수에 더 세밀하게 반영하는 것이다.
- `coaching_synthetic_log.coaching_ids` ORM 타입은 migration의 `UUID[]`와 정렬됐다. 다음 단계는 실제 `daily-coaching-synthetic-gen` 재실행으로 persistence를 확인하는 것이다.

### 개선 우선순위

1. 실제 `daily-coaching-synthetic-gen`을 재실행해 `coaching_synthetic_log` 1건 + `ai_coaching` 3건 persistence를 확인한다.
2. `coaching-review-telegram-daily.md`를 `DRY_RUN=true`로 실행해 실제 텔레그램 메시지 preview를 확인한다.
3. 새 Taillog 텔레그램 봇 토큰/채팅 ID를 등록하고 합성 후보 1건 실발송을 검증한다.
4. approved JSONL에 placeholder prompt 대신 실제 상담지 요약/행동 episode/reference IDs를 포함한다.
5. action별 behavior matching을 고도화해 reference id 보정과 품질점수 평가를 더 정교하게 만든다.
6. 50건마다 개선 리포트를 만들고, 실제 프롬프트/품질점수/reference matching 수정은 별도 승인 후 진행한다.

### 2026-05-13 — coaching-review-telegram-daily 수동 실발송 검증

| 항목 | 결과 |
|------|------|
| 합성 후보 생성 | ✅ `destructive` 3건 생성/태깅 |
| 새 후보 발송 | ✅ 1건 (`separation_anxiety`, score 70) |
| Telegram queue | ✅ `pending` 기록 후 `rejected` 처리 |
| 반려 코멘트 연결 | ✅ `추천이 너무 일반적이고 파괴 행동 케이스인데 분리불안 중심으로 보임` |
| 개선 태그 | ✅ `too_generic`, `wrong_behavior_focus` |
| DB 반영 | ✅ 해당 coaching 후보 목록에서 제외 |
| 후보 JSON export | 0건 — 반려라 생성하지 않음 |
| 앱 커리큘럼 변경 | ✅ 없음 (`published/runtime.ts`, `curriculum.ts`, `approved/`) |
| 특이사항 | 여러 버튼 탭이 한 번에 수거되어 최신 valid callback(`reject`)과 반려 코멘트를 최종 의도로 처리 |

---

## 일별 생성 로그

<!-- 매일 08:00 자동 추가 -->

### 2026-04-23 (Thu) — daily-coaching-synthetic-gen [SKIPPED]

| 항목 | 결과 |
|------|------|
| 요일 | 4 (Thursday) → STEP A only, STEP B 미실행 |
| FastAPI (`localhost:8000`) | ❌ unreachable (Connection refused) |
| A-1 generate-synthetic | skipped (FastAPI down) |
| A-2 tag-candidates | skipped (FastAPI down) |
| A-4 Supabase 누적 검증 | 후보 스키마 없음 — `training_candidate`/`training_approved`/`is_synthetic` 컬럼 없음, 후보 테이블도 없음 |
| 누적 후보 / 승인 | 0 / 0 (변동 없음, 2026-04-20 기준 동일) |
| Fine-tuning 상태 | 준비 부족 (< 50건, 변동 없음) |

**원인 분석**
- 스케줄 태스크가 sandbox에서 실행되어 사용자 mac의 `localhost:8000` (FastAPI) 에 도달 불가.
- Supabase MCP는 정상 작동하나 `ai_coaching` 테이블에 fine-tuning 후보 컬럼이 없고 별도 후보 테이블도 발견되지 않음.
- 결과적으로 합성 생성·태깅·누적 집계 모두 진행 불가.

**다음 액션 (주인님 승인 필요)**
1. FastAPI 기동 환경에서 실행되도록 스케줄러 위치/네트워크 재설정 또는 사용자 mac에서 수동 실행.
2. coaching fine-tuning 후보 스키마(`training_candidate`, `training_approved`, `is_synthetic`, category 등) 마이그레이션 진행 후 본 파이프라인 재가동.
3. 위 두 가지가 충족되기 전까지 본 스케줄은 매일 동일한 SKIPPED 로그만 누적되므로, 임시 비활성화 검토 권장.

### 2026-04-24 (Fri) — daily-coaching-synthetic-gen [FAILED]

| 항목 | 결과 |
|------|------|
| 요일 | 5 (Friday) → STEP A only, STEP B 미실행 |
| FastAPI (`localhost:8000`) | ✅ reachable (osascript 경유, `/health` 200) |
| 인증 | ✅ `x-admin-key` 확인 (admin endpoints 403 → 200 전환) |
| A-0 중복 실행 확인 | 확인 불가 — FastAPI 내부 가드에 위임 |
| A-1 generate-synthetic | ❌ timeout (exit 28, 0 bytes received, ~394s 경과) — 이전 시도도 54분 대기 후 동일 결과 |
| A-2 tag-candidates | ✅ HTTP 200 `{"processed": 2, "threshold": 70}` — 미태깅 기존 코칭 2건 후보화 |
| A-3 일일 섹션 기록 | ✅ 본 항목으로 기록 |
| A-4 Supabase 누적 검증 | ⚠️ Supabase MCP 프로젝트(`TailLog`)에는 후보 스키마 없음 → FastAPI가 가리키는 DB와 MCP 연결 DB가 불일치로 보임 |
| 누적 후보 / 승인 | MCP 기준 0 / 0 (변동 없음), FastAPI 기준 태깅만 +2 추정 |
| Fine-tuning 상태 | 준비 부족 (< 50건, 변동 미확인) |

**원인 분석**
- `tag-candidates`가 정상 응답하는 것으로 보아 FastAPI 백엔드 DB에는 flywheel 스키마(`training_candidate` 등)가 이미 적용되어 있음.
- `generate-synthetic`은 동일 인증으로 accept된 연결 위에서 0 bytes 응답 후 타임아웃 → 내부에서 LLM 호출(`openai_client.generate` 3회) 단계 중 hang 추정.
- 서버 프로세스 점검 결과 `uvicorn app.main:app`이 두 개(PID 44317 `0.0.0.0:8000`, PID 50052 `127.0.0.1:8000`) 동시에 `--reload`로 기동 중 → `SO_REUSEPORT` 기반 랜덤 라우팅/워커 혼선 가능.
- Supabase MCP에서 보이는 프로젝트(TailLog `kvknerzsqgmmdmyxlorl`) 마이그레이션 이력은 `20260301133009`까지만 적용, `20260420200000_coaching_training_flywheel.sql` / `20260422100000_training_step_attempts.sql` 미적용 → 그러나 FastAPI가 실제 사용하는 DB는 이 프로젝트와 다름(후보 컬럼 존재 확인). SSOT 드리프트 가능성 있음.

**다음 액션 (주인님 승인 필요)**
1. 중복 기동된 uvicorn 2개 중 구버전 PID를 정리 후 단일 프로세스로 재기동하여 라우팅 혼선을 제거.
2. `generate-synthetic` 내부에서 OpenAI 호출 타임아웃/재시도 정책을 추가하거나, 동기 테스트 스크립트(`Backend/scripts/`)로 단일 프로필만 생성해 LLM 쪽 장애인지 애플리케이션 쪽 로직 장애인지 재현.
3. FastAPI DB와 Supabase MCP 연결 프로젝트 정렬 — 본선 DB를 `kvknerzsqgmmdmyxlorl`로 통일할지, 또는 MCP에 다른 프로젝트를 연결할지 결정. 이후 `coaching_training_flywheel` 마이그레이션을 본선 프로젝트에 정식 적용.
4. 복구 전까지 본 스케줄은 부분 실패(A-2만 성공) 상태 — 알림 중복 방지를 위해 임시 비활성화 또는 주 1회로 완화 검토.

### 2026-04-25 (Sat) — daily-coaching-synthetic-gen [FAILED]

| 항목 | 결과 |
|------|------|
| 요일 | 6 (Saturday) → STEP A only, STEP B 미실행 |
| 오늘 카테고리 | `marking` (마킹/배변, `date.toordinal() % 7 = 6`) |
| FastAPI (`localhost:8000`) | ✅ reachable (`/health` 200, `/docs` 200) |
| 인증 | ✅ `x-admin-key` 확인 |
| 중복 uvicorn | ⚠️ PID 44317 (`0.0.0.0:8000`) + PID 50052 (`127.0.0.1:8000`) 여전히 동시 기동 — 어제와 동일 |
| A-0 중복 실행 확인 | 실행 가드(FastAPI 내부)에 위임 — 응답 시 skipped 플래그 부재 |
| A-1 generate-synthetic | ❌ HTTP 500 Internal Server Error (52.6s, body: `Internal Server Error` 21B) |
| A-2 tag-candidates | ✅ HTTP 200 `{"processed": 0, "threshold": 70}` (0.22s) — 어제 처리한 2건 외 새 미태깅 코칭 없음 |
| A-3 일일 섹션 기록 | ✅ 본 항목 |
| A-4 Supabase MCP 누적 검증 | ⚠️ MCP 연결 프로젝트(`TailLog` `kvknerzsqgmmdmyxlorl`)에는 여전히 후보 스키마 부재 — `coaching_synthetic_log` 테이블 0개, `is_synthetic`/`training_candidate` 컬럼 0개. 실제 FastAPI는 다른 Supabase 프로젝트(`gxvtgrcqkbdibkyeqyil` — httpx 로그에서 확인) 사용 중이라 MCP 누적 집계 불가 |
| 누적 후보 / 승인 | MCP 기준 0 / 0 (변동 없음, 본선 DB는 측정 불가) |
| Fine-tuning 상태 | 준비 부족 (< 50건, 측정 불가) |

**원인 분석**
- A-1 응답 시간 52.6초 → 3 × OpenAI 호출(~17초/건) 경로까지 도달 후 마지막 단계에서 예외. body가 stock 21B "Internal Server Error" → FastAPI default exception handler에 잡힌 미캐치 예외(`OpenAIError`/`json.JSONDecodeError`/`KeyError`/`ValueError` 외).
- 두 uvicorn 프로세스 모두 stdout/stderr가 `/dev/null`로 연결되어 있어 traceback 직접 확인 불가. `/tmp/uvicorn.log`, `/tmp/fastapi.log`는 2026-04-22~23 시점에서 정지된 구버전 로그.
- 어제 timeout(394s) → 오늘 500(52.6s)로 실패 양상이 바뀐 것은 어느 한 프로세스의 핸들링 차이(중복 기동 + `--reload`로 인한 라우팅 흔들림 가능) 또는 OpenAI 클라이언트 응답 변화로 추정.
- A-2가 정상 응답 → 후보 컬럼/태깅 경로 자체는 본선 DB에서 동작. A-1만 OpenAI→파싱→삽입→플러시 중 하나에서 무캐치 예외.
- Supabase MCP는 `TailLog` 프로젝트에만 연결되어 있고, 본선 FastAPI는 `gxvtgrcqkbdibkyeqyil` 프로젝트 호출 중 → 어제 의심한 SSOT 드리프트가 사실로 확정.

**다음 액션 (주인님 승인 필요)**
1. uvicorn 중복 기동 정리 — PID 44317, 50052 중 하나만 남기고 stdout/stderr를 파일(`/tmp/uvicorn.log` 등)로 redirect하여 traceback 캡처 가능하게 재기동.
2. `Backend/scripts/`에 단일 프로필 동기 호출 진단 스크립트 추가 → OpenAI 호출/JSON 파싱/ORM insert/commit 중 어느 단계가 무캐치 예외를 던지는지 분리 식별.
3. Supabase MCP 연결을 본선 프로젝트(`gxvtgrcqkbdibkyeqyil`)로 정렬하거나, FastAPI `DATABASE_URL`을 `kvknerzsqgmmdmyxlorl`로 통합. 정렬 후 `coaching_training_flywheel` 마이그레이션을 본선 프로젝트 정식 이력에 등재.
4. 본 스케줄은 1회차(2026-04-23) SKIPPED → 2~3회차(04-24, 04-25) FAILED. 위 1~3 미해결 시 4월 말까지 동일 실패 누적이 예상되므로, 임시 비활성화 또는 주 1회 완화 적용 검토.

### 2026-04-26 (Sun) — daily-coaching-synthetic-gen [STEP A FAILED · STEP B BLOCKED]

| 항목 | 결과 |
|------|------|
| 요일 | 7 (Sunday) → STEP A + STEP B (주간 검수) 병행 |
| FastAPI (`localhost:8000`) | ✅ reachable (osascript 경유, `/health` 200) |
| 인증 | ✅ `x-admin-key` 확인 |
| 중복 uvicorn | ⚠️ 4일째 동일 — PID 44317 (`0.0.0.0:8000`) + PID 50052 (`127.0.0.1:8000`) 동시 기동 |
| 로그 가시성 (신규) | PID 44317 → `/private/tmp/backend.log` (5.6KB, INFO만), PID 50052 → `/private/tmp/claude-501/.../tasks/brm5t4zc0.output` (337KB) — **후자는 `unlinked` 상태**(파일 시스템에 이름 없음)로 fd만 열린 채 보존되어 외부에서 tail/cp 불가 |
| 라우팅 증거 | `backend.log` httpx 라인이 `https://gxvtgrcqkbdibkyeqyil.supabase.co/auth/v1/user` 호출만 기록 → POST `/admin/generate-synthetic`는 PID 44317에 도달하지 않았음(unlinked 로그를 가진 PID 50052로 라우팅됨) |
| A-0 중복 실행 가드 | FastAPI 내부 가드에 위임 — 응답에 `skipped` 플래그 부재 |
| **A-1 generate-synthetic** | ❌ **HTTP 500 Internal Server Error** (45.9s, body `Internal Server Error` 21B) — 어제(2026-04-25)와 동일 지문(500/52.6s/21B). 결정적 회귀 |
| A-2 tag-candidates | ✅ HTTP 200 `{"processed": 0, "threshold": 70}` (0.25s) — 미태깅 후보 0건 (어제와 동일) |
| A-3 일일 섹션 기록 | ✅ 본 항목 |
| A-4 Supabase 누적 검증 | ⚠️ MCP 연결 프로젝트(`TailLog` `kvknerzsqgmmdmyxlorl`)에 flywheel 스키마 부재 — `ai_coaching` 5행 존재하나 `training_candidate`/`training_approved`/`is_synthetic` 컬럼 모두 없음, `coaching_synthetic_log` 테이블 없음 |
| 누적 후보 / 승인 | MCP 기준 측정 불가 (스키마 없음), FastAPI 본선 DB(`gxvtgrcqkbdibkyeqyil`)는 MCP에 미연결 |
| Fine-tuning 상태 | 측정 불가 (본선 DB 접근 경로 부재) |

#### STEP B (주간 검수) — 일요일 [BLOCKED]
| 항목 | 결과 |
|------|------|
| B-0 누적 현황 | ❌ MCP 프로젝트에 후보 컬럼 없음 → 쿼리 무의미 |
| B-1 카테고리별 주간 생성 요약 | ❌ `coaching_synthetic_log` 테이블 없음 |
| B-2 품질 분포 | ❌ 컬럼 부재 |
| B-3 검수 상위 10건 | ❌ 컬럼 부재 |
| B-4 주간 섹션 기록 | ⚠️ 측정 불가 — 본 섹션으로 대체 |
| B-5 알림 (≥50건) | 해당 없음 — 측정 불가 |

**원인 분석 (3일 누적 정리)**
- A-1 실패가 4일 연속 동일 패턴: 23일 SKIPPED → 24일 timeout(394s 0B) → 25일 500(52.6s) → 26일 500(45.9s). 24일→25일에서 timeout이 500으로 전환된 뒤 **2일 연속 동일 응답시간/바디 크기**(~50초/21B) → 결정적 예외 분기 고정.
- 21B body는 FastAPI의 default exception handler. uvicorn 로그가 unlinked 상태라 traceback 직접 확인이 여전히 막혀 있음 — 그러나 본선 backend.log(PID 44317)는 admin POST 요청 자체가 도달하지 않았다는 증거를 남겼고, 따라서 **모든 진단 가시성은 PID 50052의 unlinked task output에 갇혀 있음**.
- A-2가 매번 정상 → 후보 컬럼/태깅 경로 자체는 살아 있음. A-1의 OpenAI 호출 → 파싱 → ORM insert → 후속 태깅 중 한 단계에서 무캐치 예외.
- SSOT 드리프트 확인 누적: FastAPI는 `gxvtgrcqkbdibkyeqyil`, MCP 연결은 `kvknerzsqgmmdmyxlorl`(TailLog) — 동일 조직 내 두 프로젝트가 혼재. 본 스케줄이 측정하도록 설계된 모든 SQL은 본선이 아닌 빈 프로젝트를 가리키고 있어 **B-* 검수는 구조적으로 0건만 회신**.

**다음 액션 (주인님 승인 필요 · 우선순위 재정렬)**
1. **PID 50052 단독 종료 + 로깅 가시화 재기동.** 중복 기동된 두 uvicorn 중 PID 50052(unlinked 로그) 제거, PID 44317만 유지하고 stdout/stderr를 `/tmp/backend.log`로 일관 redirect. `--reload` 플래그도 단일 인스턴스에만 둠. 이 1단계 없이는 traceback 확보 불가, 즉 어떤 패치도 추측이 됨.
2. **단일 프로필 동기 진단 스크립트.** `Backend/scripts/diagnose_synthetic.py` (가칭) — `coaching` 서비스 함수를 직접 import해 1프로필×1카테고리만 호출. OpenAI 호출/JSON 파싱/ORM insert 단계를 try/except로 분리해 어느 단계에서 21B 500을 던지는지 식별.
3. **Supabase MCP 본선 정렬.** 본 스케줄이 의미 있는 측정을 하려면 MCP가 `gxvtgrcqkbdibkyeqyil` 프로젝트에 연결되거나, FastAPI의 `DATABASE_URL`이 `kvknerzsqgmmdmyxlorl`로 통합되어야 함. 정렬 후 `coaching_training_flywheel` 마이그레이션을 본선에 정식 등재.
4. **본 스케줄 임시 비활성화 또는 주 1회 완화.** 1~3 미해결 시 매일 동일한 STEP A FAIL + STEP B BLOCKED 로그가 누적되어 신호가 둔화됨. 알림/스케줄 정책에서 `--paused` 또는 `cron: 0 8 * * 0`(주 1회 일요일)로 일시 변경 권장.

#### Fine-tuning 배치 준비 상태 (일요일 정례 보고)
- 준비 부족 (< 50건). 측정 자체가 4일째 막혀 있어 변동 신호 없음.
- 본선 DB 측정 경로 복구 전까지는 "Fine-tuning 배치 실행해줘" 알림 발화 조건 미정의 상태.

### 2026-04-27 (Mon) — daily-coaching-synthetic-gen [STEP A FAILED · 진짜 원인 식별]

| 항목 | 결과 |
|------|------|
| 요일 | 1 (Monday) → STEP A only, STEP B 미실행 |
| 오늘 카테고리 | `aggression` (공격성, `date.toordinal() % 7 = 1`, ordinal=739733) |
| FastAPI (`localhost:8000`) | ✅ reachable (`/health` 200, 8ms) |
| 인증 | ✅ `x-admin-key` 확인 |
| uvicorn 프로세스 | ✅ **단일 프로세스 확인** — PID 27770 (`0.0.0.0:8000`, 1h49m uptime). 04-23~26의 중복 기동(PID 44317+50052) 해소 |
| 로그 가시성 | ✅ `/private/tmp/backend.log`에 traceback 정상 캡처 (단일화 덕분) |
| A-1 generate-synthetic | ❌ **HTTP 500 Internal Server Error** (53.2s, body `Internal Server Error` 21B) — 04-25(52.6s/21B), 04-26(45.9s/21B)와 동일 결정적 패턴 |
| A-2 tag-candidates | ✅ HTTP 200 `{"processed": 0, "threshold": 70}` (0.22s) — 미태깅 신규 0건 |
| A-3 일일 섹션 기록 | ✅ 본 항목 |
| A-4 Supabase 본선 직접 측정 (psql) | ✅ DATABASE_URL=postgresql+asyncpg 풀러 → `postgres.gxvtgrcqkbdibkyeqyil` 본선 직결 성공. MCP 미연결 우회 |
| 본선 DB 누적 (psql) | ai_coaching=3건 / 후보=2 / 승인=0 / 합성=0 / 실사용자=2 / 평균품질=80. **`coaching_synthetic_log`=0건** (단 한 번도 성공 INSERT 없음) |
| 오늘 생성 UUID 영속성 | 3개 UUID(`3be54458…0007`, `5290de47…2b9a`, `b981f639…2b9b`) — DB에 0건 존재 (commit 단계 롤백으로 OpenAI로 생성된 ai_coaching까지 함께 롤백됨) |
| Fine-tuning 상태 | 준비 부족 (< 50건, 측정 확정 — 0/50) |

**진짜 원인 (드디어 식별)**

backend.log에 정상 캡처된 SQLAlchemy traceback:
```
sqlalchemy.exc.ProgrammingError: <asyncpg.exceptions.DatatypeMismatchError>:
column "coaching_ids" is of type uuid[] but expression is of type jsonb
HINT:  You will need to rewrite or cast the expression.
[SQL: INSERT INTO coaching_synthetic_log (id, run_date, category, generated_count, coaching_ids)
      VALUES ($1::UUID, $2::DATE, $3::VARCHAR, $4::INTEGER, $5::JSONB) RETURNING ...]
[parameters: (UUID('c80cdd6d-…'), date(2026,4,27), 'aggression', 3,
              '["3be54458-…","5290de47-…","b981f639-…"]')]
```

ORM ↔ DB 스키마 드리프트:
- `Backend/app/shared/models.py:830` → `coaching_ids = Column(JSONB, nullable=True)` # UUID 목록
- `supabase/migrations/20260420200000_coaching_training_flywheel.sql:57` → `coaching_ids UUID[]`
- 본선 DB 실측(`information_schema.columns`) → `data_type=ARRAY`, `udt_name=_uuid`

→ 마이그레이션과 DB는 정합, **모델만 JSONB로 잘못 선언**. SQLAlchemy가 list[str]을 JSONB로 직렬화해 바인딩 → asyncpg가 `uuid[]` 컬럼 거부 → 무캐치 예외 → FastAPI 21B "Internal Server Error".

**부수 영향 (롤백 누적)**
- `synthetic.py:181`에서 `db.flush()`로 ai_coaching 3건 단계까지 진행 → `synthetic_log` INSERT가 `db.commit()`(line 193)에서 실패 → 트랜잭션 전체 롤백으로 ai_coaching 3건도 같이 사라짐.
- 04-25, 04-26, 04-27 모두 동일 — 매일 OpenAI 호출 3건 발생하나 영속화 0건. 추정 누적 LLM 호출 낭비 ~9건(코스트만 발생).

**기존 "Blocker 해소" 주장 검증 결과**
1. ✅ uvicorn 단일 프로세스화 — 사실이며, 이 단계가 traceback 가시화의 결정적 기여를 함
2. ❌ `AI_LLM_TIMEOUT_SEC` 30→120 — `.env`에도 PID 27770 process env에도 부재. 코드 default가 변경됐을 수는 있으나 본 실패와 무관 (LLM은 정상 응답, 실패는 INSERT 단계)
3. ❌ MCP project-ref 본선 정렬 — `list_projects` 결과 여전히 `kvknerzsqgmmdmyxlorl`(TailLog) + `hzxsropbcjfywmospobb`(vibe)만 노출, `gxvtgrcqkbdibkyeqyil` 미연결

**다음 액션 (주인님 승인 필요 · 우선순위 명확화)**
1. **ORM 모델 1줄 수정 (최소 침습 권장).** `Backend/app/shared/models.py:830`을
   `coaching_ids = Column(JSONB, nullable=True)` →
   `coaching_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)` 로 변경. import에 `from sqlalchemy.dialects.postgresql import ARRAY` 추가 (UUID는 동일 모듈에서 이미 import 중).
   - 대안 B: 마이그레이션으로 DB 컬럼을 JSONB로 컨버트. 단 migration 정본이 이미 `UUID[]`로 명시돼 있어 모델을 맞추는 쪽이 SSOT 정합성 측면에서 자연스러움.
2. **수정 후 재실행 검증.** `--reload`로 인해 자동 재시작될 가능성 있음. 적용 후 `POST /admin/generate-synthetic` 재호출하여 `{"generated":3,"tagged":3,...}` 응답 확인 + 본선 DB에서 `coaching_synthetic_log` 1건 + `ai_coaching` 3건(is_synthetic=TRUE, training_candidate=TRUE) 확인.
3. **(선택) MCP 본선 정렬.** 일일 STEP A-4 / 일요일 STEP B의 SQL 측정을 MCP로 일원화하려면 `gxvtgrcqkbdibkyeqyil` 프로젝트 추가 연결 필요. 현 상태에서도 본선 측정은 psql 직결 우회로 가능하나, 본 스케줄 태스크의 명세상 SQL은 MCP 경로를 가정.
4. **04-25~04-27 손실 보정 (선택).** 동일 카테고리(`marking`/`barking`/`aggression`)에 대해 1번 fix 후 한 번씩 수동 트리거하면 누락된 9건을 회복 가능. 자동화에 강제하지 않고 권장 사항.

---

## 2026-04-28 합성 생성 결과 (4일째 동일 실패 — 미수정 누적)

| 항목 | 측정값 |
|------|------|
| 카테고리 (Tue, day=2) | `separation_anxiety` |
| 생성 (영속화 기준) | **0건** (목표 3건) |
| 후보 태깅 | 0건 (영속화 0건이므로 자동 태깅 대상 없음) |
| 누적 후보 총계 (본선 psql) | **2건** (전일 동일, 변동 없음) |
| 누적 합성/실사용자 | 0 / 3 (실사용자 +1: 04-27 → 04-28 사이 신규 1건 발생) |
| 평균 품질 점수 | 80 |

**STEP A 실측**

| 단계 | 결과 |
|------|------|
| FastAPI (`localhost:8000`) | ✅ reachable, 단일 uvicorn 프로세스 (PID 42255, 20h+ uptime) |
| 인증 | ✅ `x-admin-key` 정상 |
| A-1 generate-synthetic | ❌ **HTTP 500** (58.1s, body 21B `Internal Server Error`) — 04-25/26/27과 동일 결정적 패턴 4일 연속 |
| A-2 tag-candidates | ✅ HTTP 200 `{"processed":0,"threshold":70}` (0.22s) |
| A-3 일일 섹션 기록 | ✅ 본 항목 |
| A-4 본선 SQL (psql 직결) | ✅ MCP는 여전히 `gxvtgrcqkbdibkyeqyil` 미연결 → psql 우회 사용 |
| 본선 DB 상태 | `coaching_synthetic_log`=0건 (4일째 단 한 건도 영속화 실패), `ai_coaching` 총 3건(전일 동일 패턴) |
| 오늘 손실 UUID | `8d21f9a1…2888`, `56d5514c…8429`, `0b604da7…2b33ad` (백엔드 로그에서 확인, DB 0건) |
| 오늘 시도 횟수 | A-1 valid call 3회 (+ 403 1회) → OpenAI 호출 ≈9건 추가 낭비 |
| Fine-tuning 상태 | 준비 부족 (0/50 승인, 4일 무진전) |

**원인 (전일 식별 — 변동 없음)**

`coaching_synthetic_log.coaching_ids` ORM↔DB 타입 드리프트 (모델 JSONB ↔ DB UUID[]) → asyncpg `DatatypeMismatchError` → 트랜잭션 전체 롤백.
backend.log에서 오늘도 동일 traceback 재확인:
```
column "coaching_ids" is of type uuid[] but expression is of type jsonb
[parameters: (UUID('630021fe-…'), date(2026,4,28), 'separation_anxiety', 3,
              '["8d21f9a1-…","56d5514c-…","0b604da7-…"]')]
```

**누적 손실 추정 (04-25 ~ 04-28, 4일)**
- OpenAI 호출 낭비: ≈12건 이상 (일 3건 × 4일, 오늘 추가 시도 포함 시 ≥15건)
- 영속화 합성 데이터: 0건
- 미생성 카테고리: marking(04-25), barking(04-26), aggression(04-27), **separation_anxiety(04-28)** 4종

**다음 액션 — 전일 권고 그대로 (주인님 승인 대기 중, 4일째)**

전일(04-27) 기록한 1번 권고 — `Backend/app/shared/models.py:830` 1줄 수정 — 이 미적용 상태로 또 하루 동일 실패 반복.
중복 기재 대신 [위 04-27 섹션의 "다음 액션 1번"](#다음-액션-주인님-승인-필요--우선순위-명확화) 참조.
오늘 시점에서 우선순위만 한 번 더 강조: **fix 적용 1건이 4일치 자동화를 일거에 정상화** + 익일부터 일일 +3건 정상 누적 시작.

**STEP B (주간 검수)**
- 오늘 요일: Tue (`date +%u`=2) → 명세에 따라 STEP B 전체 건너뜀.

---

## 2026-04-29 합성 생성 결과 (Wed, day 3 → `destructive`)

| 단계 | 결과 |
|------|------|
| FastAPI (`localhost:8000`) | ✅ reachable, uvicorn PID 30220 (이전과 동일 인스턴스) |
| 인증 | ✅ `x-admin-key` 정상 (초기 1회 누락 → 403, 재시도 성공) |
| A-1 generate-synthetic | ❌ **HTTP 500** (body `Internal Server Error`) — **동일 결정적 실패 5일 연속** (04-25/26/27/28/29) |
| A-2 tag-candidates | ✅ HTTP 200 `{"processed":0,"threshold":70}` |
| A-3 일일 섹션 기록 | ✅ 본 항목 |
| A-4 본선 SQL (psql 직결) | ✅ MCP 등록 프로젝트(`kvkner…`,`hzxsr…`) 와 백엔드 사용 프로젝트(`gxvtgrcq…`) 불일치 → psql 우회 사용 |
| 본선 DB 상태 | `coaching_synthetic_log` 0건 (5일째 단 한 행도 영속화 실패), `ai_coaching is_synthetic=TRUE` 0건 |
| 오늘 손실 UUID | `dcfcfbdd-7c49-4662-b9a0-fb4320378803`, `18d96c7b-3213-4c66-9487-497e0200bf20`, `c3d878b9-f9b1-4421-a18d-7418d2f59ba2` (백엔드 traceback에서 확인, DB rollback) |
| Fine-tuning 상태 | 준비 부족 (0/50 승인, 5일 무진전); `training_candidate=TRUE` 8건은 모두 비-합성 실사용자 코칭 |

**원인 (전일과 변동 없음 — 5일째 동일 traceback)**

`coaching_synthetic_log.coaching_ids` ORM↔DB 타입 드리프트 (모델 JSONB ↔ DB UUID[]) → `asyncpg.exceptions.DatatypeMismatchError` → 트랜잭션 전체 롤백 (ai_coaching 3건 + log 1건 모두 사라짐).

오늘 traceback 마지막 줄:
```
sqlalchemy.exc.ProgrammingError: (asyncpg.ProgrammingError)
column "coaching_ids" is of type uuid[] but expression is of type jsonb
[SQL: INSERT INTO coaching_synthetic_log (id, run_date, category, generated_count, coaching_ids)
      VALUES ($1::UUID, $2::DATE, $3::VARCHAR, $4::INTEGER, $5::JSONB)
      RETURNING coaching_synthetic_log.created_at]
[parameters: (UUID('066bde6c-bddb-4684-8fd6-a8f3db4d4061'), date(2026,4,29),
              'destructive', 3,
              '["dcfcfbdd-…","18d96c7b-…","c3d878b9-…"]')]
```

DB 컬럼 메타 (psql `information_schema.columns`):
```
data_type=ARRAY  udt_name=_uuid    -- 즉 uuid[]
```

**누적 손실 갱신 (04-25 ~ 04-29, 5일)**
- OpenAI 호출 낭비: ≈15건 이상 (일 3건 × 5일)
- 영속화 합성 데이터: 0건 (총 fine-tune 후보 8건은 모두 실사용자 데이터)
- 미생성 카테고리: marking(04-25), barking(04-26), aggression(04-27), separation_anxiety(04-28), **destructive(04-29)** 5종

**다음 액션 — 5일째 동일 권고 (주인님 승인 대기 중)**

[04-27 섹션의 "다음 액션 1번"](#다음-액션-주인님-승인-필요--우선순위-명확화) 참조.
- 본선 1줄 수정: `Backend/app/shared/models.py:830` 의 `coaching_ids` 컬럼 정의 (JSONB → ARRAY(UUID))
- 미적용 상태로 다음 카테고리(`fear`, day 4)도 04-30 동일 실패 예정.
- **본 자동화는 fix 적용 전까지 매일 OpenAI 비용 누수만 누적**. 임시로 일일 자동화를 일시 중지하거나 fix 1줄을 적용해야 함.

**STEP B (주간 검수)**
- 오늘 요일: Wed (`date +%u`=3) → 명세에 따라 STEP B 전체 건너뜀. 일요일(2026-05-03) 실행 예정.

---

## 주간 리포트: 2026-05-27 (W22) [오케스트레이터]

### [커리큘럼 품질] TASK 1 — training-data-maintenance

> 실행: `taillog-weekly-orchestrator` / MONTHLY_RUN=false (5월 첫째 금요일=5/1, 오늘=5/27)

#### altB/altC 커버리지 실측

| 지표 | 측정값 | 목표 | 상태 |
|------|--------|------|------|
| 전체 스텝 수 | 108 | — | — |
| altB 커버리지 | 105/108 (97.2%) | 100% | ⚠️ 3건 누락 |
| altC 커버리지 | 93/108 (86.1%) | 100% | ⚠️ 15건 누락 |
| altB null 스텝 수 | 3 | 0 | ⚠️ |
| altC null 스텝 수 | 15 | 0 | ⚠️ |

> **참고**: 2026-04-22 스냅샷("100% 완료")과 실측 결과 불일치. 파일-문서 드리프트 확인.

**altB 누락 스텝 (3건)**
- `reactivity_management_d3_s1`
- `reactivity_management_d3_s2`
- `reactivity_management_d3_s3`

**altC 누락 스텝 (15건)**
- `separation_anxiety`: d1s1, d1s3, d2s2, d3s3, d4s3, d5s1, d5s2 (7건)
- `reactivity_management`: d1s1, d2s1, d2s2, d3s1, d3s2, d3s3, d4s2, d5s1 (8건)

#### Duration 이탈

| 커리큘럼 | 일차 | 합계 | 상태 |
|---------|------|------|------|
| impulse_control | day 1 | 15min | ⚠️ (목표 20~40min) |

#### 행동-커리큘럼 매핑 중복
- 중복 없음 (각 BehaviorType → 단일 CurriculumId, 복수 행동→동일 커리큘럼은 정상 설계)

#### 조치 필요
1. **altB/altC 보강 초안 생성 완료** → `docs/daily/05-27/training-enrichment-draft.md` (검수 후 curriculum.ts 반영 필요)
2. **impulse_control day 1 duration 15min** → 스텝 추가 또는 duration 조정 검토 (주인님 승인 필요)
3. **2026-04-22 스냅샷 수정 필요** → "100% 완료" 기록이 실제와 불일치. 위 표로 교체 권장.

---

### [AI 코칭 Fine-tuning] TASK 2 — coaching-finetune-review

#### Supabase MCP 접근 현황

| 프로젝트 | ID | 상태 | 접근 결과 |
|---------|-----|------|----------|
| vibe | hzxsropbcjfywmospobb | ACTIVE | ✅ (TailLog 무관) |
| TailLog | kvknerzsqgmmdmyxlorl | INACTIVE | ❌ Connection timeout |
| mungmungfit (신규) | oucgzkbqrzbwxxffmmqt | INACTIVE | ❌ Connection timeout |
| 본선 (FastAPI) | gxvtgrcqkbdibkyeqyil | MCP 미연결 | ❌ 측정 불가 |

> **신규 발견**: `mungmungfit` 프로젝트(oucgzkbqrzbwxxffmmqt)가 2026-05-07 생성됨. 앱 리브랜딩 또는 DB 마이그레이션 가능성. 주인님 확인 필요.

#### 누적 현황 (최근 확인 기준: 2026-05-13)

| 항목 | 수치 |
|------|------|
| 전체 후보 (training_candidate) | 2건 |
| 승인 완료 (training_approved) | 0건 |
| 합성 데이터 | 0건 |
| 실사용자 데이터 | 2건 |
| 평균 품질 점수 | 80 |
| coaching_synthetic_log | 0건 |

#### 이번 주 생성 (2026-04-30 ~ 2026-05-27)

| 항목 | 결과 |
|------|------|
| 합성 생성 | 측정 불가 (DB 접근 차단) |
| 카테고리별 요약 | 측정 불가 |
| 품질 분포 | 측정 불가 |

#### Fine-tuning 상태

- [x] 준비 부족 (< 50건) — 마지막 확인 기준 0/50 승인

#### 주요 미해결 블로커

1. `coaching_ids` ORM↔DB 타입 드리프트 (JSONB → ARRAY(UUID) 1줄 수정 대기 중 — 4월 27일부터 미적용)
2. MCP 본선 DB(`gxvtgrcqkbdibkyeqyil`) 미연결 → 주간 SQL 측정 구조적 불가
3. `mungmungfit` 신규 프로젝트 역할 미확인
4. `coaching_synthetic_log` 단 한 건도 영속화 없음 (4월 이후 합성 생성 0건)

---

*Generated by taillog-weekly-orchestrator — 2026-05-27 10:00 (Asia/Seoul)*

### 2026-05-27 — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | error | Backend at http://localhost:8765 not reachable from automation sandbox |
| telegram-review | sent 0, callbacks 0, comments 0 | Backend not reachable; Telegram getUpdates: 0 new updates |

---

## 주간 리포트: 2026-06-02 (W23) [오케스트레이터]

### TASK 1 — training-data-maintenance

#### 커리큘럼 현황

| 항목 | 수치 |
|------|------|
| 커리큘럼 수 | 7개 (목표: 12~15개) |
| 전체 스텝 수 | 109개 |
| altB null 수 | 3개 (reactivity_management d3 전체) |
| altC null 수 | 15개 (separation_anxiety 7건 + reactivity_management 8건) |
| altB 커버리지 | 97.2% (106/109) ✅ |
| altC 커버리지 | 86.2% (94/109) ✅ |

#### Duration 이탈

| 커리큘럼 | 일차 | 합계 | 상태 |
|---------|------|------|------|
| impulse_control | day 1 | 15min | ⚠️ (목표 20~40min) |

#### 행동-커리큘럼 매핑 중복
- 중복 없음 (각 BehaviorType → 단일 CurriculumId; barking/reactivity→reactivity_management, destructive/resource_guarding→impulse_control 등은 정상 다대일 설계)

#### 조치 필요
1. **altB/altC 보강 초안 생성 완료** → `docs/daily/06-02/training-enrichment-draft.md` (15건, 검수 후 curriculum.ts 반영 필요)
2. **impulse_control day 1 duration 15min** → 5주 연속 미해결. 스텝 추가 또는 duration 상향 검토 필요.

---

### TASK 2 — coaching-finetune-review

#### Supabase MCP 접근 현황

| 프로젝트 | 상태 | 결과 |
|---------|------|------|
| TailLog (kvknerzsqgmmdmyxlorl) | INACTIVE | ❌ 접근 불가 (5주 연속) |
| mungmungfit (oucgzkbqrzbwxxffmmqt) | INACTIVE | ❌ 접근 불가 |

#### 누적 현황 (최근 확인 기준: 2026-05-27 — 이번 주 DB 접근 불가)

| 항목 | 수치 (마지막 측정) |
|------|------|
| 전체 후보 (training_candidate) | 2건 |
| 승인 완료 (training_approved) | 0건 |
| 합성 데이터 | 0건 |
| 실사용자 데이터 | 2건 |
| 평균 품질 점수 | 80 |

#### Fine-tuning 상태
- [x] 준비 부족 (< 50건) — 0/50 승인 (5주 연속 미달)

#### 미해결 블로커 (5주 연속)
1. Supabase MCP 본선 DB(`gxvtgrcqkbdibkyeqyil`) 미연결 — SQL 측정 불가
2. `coaching_ids` ORM↔DB 타입 드리프트 (JSONB → ARRAY(UUID)) 미적용
3. `coaching_synthetic_log` 합성 생성 0건 지속 (백엔드 미가동)
4. `mungmungfit` 신규 프로젝트 역할 미확인

---

*Generated by taillog-weekly-orchestrator — 2026-06-02 09:59 (Asia/Seoul)*

---

### 2026-06-02 — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | generated 3 | separation_anxiety (day ordinal % 7 = 2); DB 확인: coaching_synthetic_log 2026-06-02 01:11 UTC 기록, ai_coaching 3건 추가(00fb5730, 145a4e15, 05c8b0e8); API HTTP timeout(>40s)이었으나 서버측 완료 확인 |
| telegram-review | sent 1건, callbacks 0건, comments 0건 | reactivity_management (82825eb4); 행동군 rotation: separation_anxiety→fear_desensitization(후보없음)→reactivity_management; 새 후보 발송 message_id=6 |

#### 현황 스냅샷 (2026-06-02)
| 항목 | 수치 |
|------|------|
| 전체 후보 (training_candidate=TRUE, is_synthetic=TRUE) | 5건 |
| 오늘 신규 생성 | 3건 (separation_anxiety) |
| 승인 완료 (training_approved) | 0건 |
| 평균 품질 점수 | 70 |
| Telegram 발송 누적 | 2건 |
| 반려 누적 | 1건 (too_generic, wrong_behavior_focus) |

---

### 2026-06-04 — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | error (blocked) | 백엔드 미가동 + 필수 env 미설정. BACKEND_BASE_URL/ADMIN_API_KEY unset, localhost:8765 연결 실패(HTTP 000). 예정 카테고리: fear (day ordinal % 7 = 4). 생성 0건 |
| telegram-review | error (blocked) | TAILLOG_TELEGRAM_BOT_TOKEN/CHAT_ID/CALLBACK_SECRET 및 ADMIN_API_KEY 미설정 → 실행 중단. getUpdates/sendMessage 미수행. 다음 예정 행동군: impulse_control (직전 발송 reactivity_management) |

#### 블로커 (이 실행 환경)
1. FastAPI 백엔드 미가동 — generate-synthetic / training-candidates API 호출 불가
2. ADMIN_API_KEY, BACKEND_BASE_URL 미설정
3. Telegram 3종 시크릿(BOT_TOKEN, CHAT_ID, CALLBACK_SECRET) 미설정
4. 상태 파일(queue/feedback/offset)은 변경 없음 — 외부 쓰기 미수행

*자동 적용 범위: TRAINING-DATA-LOG.md 기록만. DB/Telegram/후보 파일 변경 없음.*

---

### 2026-06-05 — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | skipped (already_run_today) | FastAPI 내부 가드 `coaching_synthetic_log.run_date=CURRENT_DATE`. HTTP 200, 1.25s. 오늘분은 이전 실행에서 생성됨(separation_anxiety 5건 후보 확인). |
| telegram-review | sent 1/1, callbacks 0, comments 0 | behavior_group=separation_anxiety. 후보 id=6b2be0b4, 품질 70, message_id=7, review_id=tlcr_20260605094753_6b2be0b4. |

#### 실행 메모
- BACKEND_BASE_URL: 로컬(localhost:8765) 미가동 → 프로덕션 `EXPO_PUBLIC_BACKEND_URL`(DigitalOcean) 사용. health 200 확인.
- 시크릿: `Backend/.env`에서 ADMIN_API_KEY 및 Telegram 3종 로드.
- getUpdates(offset=819383136) 결과 빈 배열 → 처리할 버튼/코멘트 없음, offset 변경 없음.
- 직전 발송(reactivity_management) 다음 순환에서 impulse_control/house_soiling/jumping/barking 후보 0건 → separation_anxiety 첫 후보 발송.
- 6월 2일 발송분(reactivity_management, 82825eb4)은 여전히 pending.
- 50건 리포트 조건 미충족(누적 terminal=1).
- 자동 적용 범위: queue.jsonl append + Telegram sendMessage + 본 로그. published/curriculum/approved 미변경.

---

## [커리큘럼 품질] 2026-06-05 주간 품질 리포트 (W23) [오케스트레이터 TASK 1]

소스: `src/lib/data/published/v2026-03-02-auto-080532/curriculum.ts` (108 스텝, 7 커리큘럼)

- altB null 수: 3 (reactivity_management d3 s1/s2/s3)
- altC null 수: 15 (separation_anxiety 7 + reactivity_management 8)
- 커버리지: altB 97.2% (105/108), altC 86.1% (93/108)
- duration 이탈: impulse_control d1 = 15분 (목표 20~40분 하회 ⚠️) — 그 외 34개 day 정상
- 커리큘럼 수: 7개 (목표 12~15)
- 중복 매핑: 없음 (BEHAVIOR_TO_CURRICULUM 키 10개 모두 고유, 7개 커리큘럼 전부 참조됨)
- 조치 필요:
  - altC 86.1% → 80% 경고선 위이나 100% 목표 미달. 보강 초안 발행: `docs/daily/06-05/training-enrichment-draft.md` (altB 3 + altC 15) → 주인님 검수 후 수동 반영
  - impulse_control d1 duration 15분: 스텝 추가 또는 duration 상향 검토 권고

### [월간 갭 분석] 2026-06-05 (첫째 주 금요일)
- 미커버 행동: destructive_chewing, jumping_on_people (매핑은 있으나 주제 불일치); aggressive_biting·resource_guarding 부분 커버; excessive_barking 커버됨
- 다음 추가 후보 선정: **destructive_chewing** ("씹어도 되는 것" 클래스, 5일×3스텝 뼈대)
- 초안: `docs/daily/06-05/training-new-curriculum-draft.md` → 주인님 검수 후 신규 파일 추가
- 비고: 우선순위 1위 aggressive_biting은 안전 민감 → 전문가 연계 가드레일 별도 트랙 권고

---
## 주간 리포트: 2026-06-05 (W23) [오케스트레이터 TASK 2]

데이터 소스: Supabase REST (Supabase MCP 부재 → service role REST, read-only SELECT만 수행).

### 누적 현황 (training_candidate = TRUE)
- 전체 후보: 24건
- 승인 완료(training_approved): 0건
- 합성 데이터: 8건 / 실사용자: 16건
- 평균 품질 점수: 75점

### 이번 주 생성 (run_date >= 2026-05-29)
| 카테고리 | 실행 | 생성 건수 | first | last |
|---------|------|---------|-------|------|
| separation_anxiety | 1 | 3 | 2026-06-02 | 2026-06-02 |
| hyperactivity | 1 | 3 | 2026-06-05 | 2026-06-05 |

### 품질 분포 (training_approved = FALSE, n=24)
| 점수대 | 건수 | 비율 |
|-------|------|------|
| 70 | 20 | 83.3% |
| 90 | 1 | 4.2% |
| 100 | 3 | 12.5% |

### 검수 대상 상위 10건 (quality desc)
| id(8) | synthetic | quality | feedback | date | risk |
|-------|-----------|---------|----------|------|------|
| 490b4cda | false | 100 | – | 2026-05-21 | medium |
| f7993682 | false | 100 | – | 2026-05-20 | medium |
| 26788059 | false | 100 | – | 2026-04-28 | high |
| 4f989423 | false | 90 | – | 2026-04-21 | 중간 |
| a004d52b | false | 70 | – | 2026-04-20 | low |
| 82bdb36a | false | 70 | – | 2026-05-04 | low |
| 82825eb4 | true | 70 | – | 2026-05-13 | medium |
| b990099f | true | 70 | – | 2026-05-13 | medium |
| 5feab05c | false | 70 | – | 2026-05-19 | low |
| 6587e42c | false | 70 | 4 | 2026-05-19 | low |

### Fine-tuning 상태
- [x] 준비 부족 (< 50건) — 승인 0/24, 목표 50건까지 50건 부족
- [ ] 준비 완료 (>= 50건)

### 검수 권고 (자동 적용 안 함 — 운영자 수동 승인)
- 품질 100점 실사용자 3건(490b4cda, f7993682, 26788059)이 최우선 승인 후보. 단 26788059는 risk=high, dog_voice에 "Stage3테스트멍" 테스트 데이터 흔적 → 승인 전 점검 필요.
- 4f989423는 risk 값이 한글 "중간"으로 저장됨(영문 enum 'medium' 불일치) → 데이터 정합성 점검 권고.
- 승인은 관리자 API `POST /api/v1/coaching/admin/training-candidates/{id}/review` 로 운영자가 직접 수행.


### 2026-06-10 — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | error (blocked) | BACKEND_BASE_URL=http://localhost:8765 는 운영자 로컬 머신 대상. 자동화 sandbox에서 도달 불가(HTTP 000, localhost/127.0.0.1/host.docker.internal 모두 실패). 필수 env(BACKEND_BASE_URL/ADMIN_API_KEY)는 Backend/.env에 존재하나 FastAPI 미가동. 예정 카테고리: destructive (파괴행동, day ordinal % 7 = 3). 생성 0건 |
| telegram-review | sent 0/1, callbacks 0, comments 0 | Telegram API(api.telegram.org)는 도달 가능(HTTP 302). 그러나 버튼 처리·반려 코멘트 연결·신규 후보 조회는 모두 FastAPI admin endpoint 의존 → 미도달로 처리 불가. 상태 무변경(offset/queue 미수정, getUpdates 미소비). 다음 예정 행동군: fear_desensitization (직전 발송 separation_anxiety, 2026-06-05) |

---

## [2026-06-13] 주간 품질 리포트 (W24) [오케스트레이터 TASK 1]

소스: `src/lib/data/published/v2026-03-02-auto-080532/curriculum.ts` (108 step, 7 curriculum)
스키마 주: 구버전 `altB/altC: null` → 신버전 step `variants.B/C`. null 판정 = `instruction_override === null`.

- altB(B) null 수: 3 (reactivity_management d3 s1·s2·s3)
- altC(C) null 수: 15 (separation_anxiety 7 + reactivity_management 8)
- 커버리지: altB 97.2% (105/108), altC 86.1% (93/108) — 둘 다 경고기준(80%) 이상
- duration 이탈: 1건 — impulse_control d1 = 15분 (목표 20~40분 하회). 그 외 34일 정상.
- 중복 매핑: 없음 (BEHAVIOR_TO_CURRICULUM은 typed Record, 행동→커리큘럼 1:1. 다대일 매핑은 의도된 설계)
- 커리큘럼 수: 7개 (목표 12~15개)
- 조치 필요:
  - 보강 초안 생성됨 → `docs/daily/06-13/training-enrichment-draft.md` (altB 3건 + altC 15건). 주인님 검수 후 curriculum.ts 반영.
  - impulse_control d1 duration 15분: 스텝 추가 또는 시간 상향 검토.
- STEP 3(월간 갭 분석): 미실행 (이번 주는 6월 첫째 주 금요일 아님 — 첫째 주는 06-05)

---

## 주간 리포트: 2026-06-13 (W24) [오케스트레이터 TASK 2]

데이터 소스: Supabase PostgREST 직접 조회 (service role). Supabase MCP 미연결이라 REST로 대체.

### 누적 현황 (ai_coaching WHERE training_candidate=TRUE)
- 전체 후보: 24건
- 승인 완료: 0건
- 합성 데이터: 8건 / 실사용자: 16건
- 평균 품질 점수: 75점

### 이번 주 생성 (run_date >= 2026-06-06)
| 카테고리 | 생성 건수 |
|---------|---------|
| (없음) | 0 |

- 합성 생성 0건. 원인: AI-data-orchestrator(synthetic-gen)가 BACKEND_BASE_URL=localhost 도달 불가로 지속 차단(2026-06-10 로그 참조). 누적 후보 24건 무변동.

### 품질 분포 (training_approved=FALSE, n=24)
| 점수대 | 건수 | 비율 |
|-------|------|------|
| 70 | 20 | 83.3% |
| 90 | 1 | 4.2% |
| 100 | 3 | 12.5% |

### 검수 대상 상위 10건 (quality desc)
| id(8) | synthetic | quality | feedback | date | risk |
|-------|-----------|---------|----------|------|------|
| 490b4cda | false | 100 | – | 2026-05-21 | medium |
| f7993682 | false | 100 | – | 2026-05-20 | medium |
| 26788059 | false | 100 | – | 2026-04-28 | high |
| 4f989423 | false | 90 | – | 2026-04-21 | 중간 |
| a004d52b | false | 70 | – | 2026-04-20 | low |
| 82bdb36a | false | 70 | – | 2026-05-04 | low |
| 82825eb4 | true | 70 | – | 2026-05-13 | medium |
| b990099f | true | 70 | – | 2026-05-13 | medium |
| 5feab05c | false | 70 | – | 2026-05-19 | low |
| 6587e42c | false | 70 | 4 | 2026-05-19 | low |

### Fine-tuning 상태
- [x] 준비 부족 (< 50건) — 승인 0/24, 목표 50건까지 50건 부족
- [ ] 준비 완료 (>= 50건)

### 검수 권고 (자동 적용 안 함 — 운영자 수동 승인)
- 품질 100점 실사용자 후보 3건(490b4cda, f7993682, 26788059)이 최우선 승인 대상. 단 **26788059는 dog_voice에 "Stage3테스트멍" 테스트 데이터 흔적 + risk=high** → 승인 전 제외 검토.
- **4f989423는 risk 값이 한글 "중간"으로 저장**(영문 enum 'medium' 불일치) → 데이터 정합성 점검 권고. (전주 대비 미해결 — 반복 지적)
- 승인 API: `POST /api/v1/coaching/admin/training-candidates/{id}/review` (운영자 직접 수행). 단 현재 FastAPI admin endpoint가 sandbox에서 도달 불가하므로 운영자 로컬에서 실행 필요.
- 근본 차단 해소 권고: synthetic-gen/검수 자동화가 진전되려면 BACKEND_BASE_URL을 sandbox 도달 가능한 호스트로 전환하거나, Supabase 직접 경로로 후보 생성/승인 파이프라인 이전 검토.

---

### 2026-06-15 — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | error | BACKEND_BASE_URL=localhost:8765 sandbox 도달 불가(HTTP 000). 카테고리 day%7=5 → hyperactivity 예정분 미생성. 누적 후보 무변동. |
| telegram-review | sent 0, callbacks 0, comments 0 | (1) backend 도달 불가 → 후보 조회/승인/payload API 호출 불가. (2) **신규: TAILLOG_TELEGRAM_BOT_TOKEN getMe 401 Unauthorized** → getUpdates 수거 불가. offset(819383136) 미전진, queue 미변경(무손실). 미처리 pending 2건(82825eb4, 6b2be0b4) 대기 유지. |

이슈:
- 지속 차단: FastAPI admin endpoint가 sandbox에서 localhost로 도달 불가(2026-06-10 이후 반복).
- **신규 차단: Telegram bot token 401 Unauthorized.** 토큰 폐기/만료 추정 → 운영자가 BotFather에서 토큰 재발급 후 Backend/.env(TAILLOG_TELEGRAM_BOT_TOKEN) 갱신 필요. 토큰 복구 전까지 검수 버튼/코멘트 수거 전면 중단.
- 무손실 보장: 이번 실행은 외부 쓰기/offset 전진/queue 변경 없음.

---

## [2026-07-08] 주간 품질 리포트 (W28) [오케스트레이터 TASK 1]

소스: `src/lib/data/published/v2026-03-02-auto-080532/curriculum.ts` (108 step, 7 curriculum)
스키마 주: 구버전 `altB/altC: null` → 신버전 step `variants.B/C`. null 판정 = `step()` 호출에 altB(7번째)/altC(8번째) 객체 인자 누락(→ variant가 표준 A로 폴백).

- altB(B) null 수: 3 (reactivity_management d3 s1·s2·s3)
- altC(C) null 수: 15 (separation_anxiety 7 + reactivity_management 8)
- 커버리지: altB 97.2% (105/108), altC 86.1% (93/108) — 둘 다 경고기준(80%) 이상
- duration 이탈: 1건 — impulse_control d1 = 15분 (목표 20~40분 하회). 그 외 34일 정상.
- 중복 매핑: 없음 (BEHAVIOR_TO_CURRICULUM은 typed Record, 행동→커리큘럼 1:1. 다대일 매핑은 의도된 설계)
- 커리큘럼 수: 7개 (목표 12~15개)
- 전주(W24) 대비 변동: 없음 (동일 지표). 커리큘럼 데이터 무변경.
- ⚠️ 드리프트(반복 지적): 2026-04-22 초기 스냅샷은 reactivity_management를 altB/altC 15/15로 기록했으나 실제 코드는 altB 12/15·altC 7/15. 스냅샷↔코드 불일치 미해소.
- 조치 필요:
  - 보강 초안 생성됨 → `docs/daily/07-08/training-enrichment-draft.md` (altB 3건 + altC 15건). 주인님 검수 후 curriculum.ts 반영.
  - impulse_control d1 duration 15분: 스텝 추가 또는 시간 상향 검토 (W24부터 미해소).
- STEP 3(월간 갭 분석): 미실행 (7월 첫째 주 금요일은 07-03. 이번 실행 07-08은 해당 없음)

---

## 주간 리포트: 2026-07-08 (W28) [오케스트레이터 TASK 2]

데이터 소스: **조회 불가.** Supabase 호스트(gxvtgrcqkbdibkyeqyil.supabase.co) 샌드박스 DNS 미해소(allowlist 밖, HTTP 000). Supabase MCP도 미연결. 이번 실행은 REST/MCP 어느 경로로도 ai_coaching 조회 불가.

### 누적 현황 (마지막 확인치 이월 — W24, 2026-06-13 기준)
- 전체 후보: 24건 (이월)
- 승인 완료: 0건 (이월)
- 합성 데이터: 8건 / 실사용자: 16건 (이월)
- 평균 품질 점수: 75점 (이월)
- ⚠️ 실측 불가로 실제 값이 변동됐을 수 있음. 위 수치는 마지막 성공 조회(06-13)의 이월값.

### 이번 주 생성
| 카테고리 | 생성 건수 |
|---------|---------|
| (조회 불가) | – |

### Fine-tuning 상태
- [x] 준비 부족 (< 50건) — 마지막 확인 승인 0/24. 목표 50건까지 최소 50건 부족.
- [ ] 준비 완료 (>= 50건)

### 차단/조치
- **지속 차단(W22~ 반복):** synthetic-gen 파이프라인 BACKEND_BASE_URL=localhost 샌드박스 도달 불가. 06-15 이후 Telegram bot token 401도 추가 차단.
- **신규 확인:** 위클리 오케스트레이터 샌드박스에서 Supabase 호스트 DNS 미해소 → 직접 REST 조회도 불가. 운영자 로컬 실행 또는 Supabase 호스트 allowlist 등록/ MCP 연결 필요.
- 무손실 보장: 이번 실행은 외부 쓰기 없음(문서 append만).

---

### 2026-07-08 — taillog-ai-data-orchestrator

| TASK | 결과 | 비고 |
|------|------|------|
| synthetic-gen | error | BACKEND_BASE_URL 미설정 + localhost:8765 sandbox 도달 불가(HTTP 000). ADMIN_API_KEY 미설정. 오늘 예정분(day%7=0 → barking) 미생성. 누적 후보 무변동. |
| telegram-review | sent 0, callbacks 0, comments 0 | 필수 키(TAILLOG_TELEGRAM_BOT_TOKEN/CHAT_ID/CALLBACK_SECRET) 전부 미설정 + backend 도달 불가. getUpdates 수거·후보 조회·발송 전면 불가. offset(819383136) 미전진, queue 미변경(무손실). 미처리 pending 2건(82825eb4, 6b2be0b4) 대기 유지. |

이슈:
- 지속 차단(06-10 이후 반복): 이 스케줄러가 도는 sandbox에서 운영자 로컬 FastAPI(localhost:8765)로 도달 불가하며, ADMIN_API_KEY·Telegram 시크릿 env가 실행 환경에 주입되지 않음.
- 06-15 기록된 Telegram bot token 401 이슈도 미해소 상태로 추정(이번 실행은 토큰 자체가 미설정이라 재검증 불가).
- 복구 조건: (1) 운영자 로컬/서버에서 실행하거나 BACKEND_BASE_URL을 sandbox 도달 가능한 주소로 지정, (2) ADMIN_API_KEY 및 TAILLOG_TELEGRAM_* 시크릿을 실행 환경에 주입, (3) BotFather에서 토큰 재발급 후 갱신.
- 무손실 보장: 이번 실행은 외부 쓰기/offset 전진/queue·DB 변경 없음(TRAINING-DATA-LOG.md append만).

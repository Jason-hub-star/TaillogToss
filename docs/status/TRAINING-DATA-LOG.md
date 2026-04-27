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

## [AI 코칭 Fine-tuning] 현황 요약 (마지막 업데이트: 2026-04-26, 측정 불가 누적 4일째)

| 항목 | 수치 |
|------|------|
| 전체 후보 (training_candidate) | 측정 불가 (MCP 프로젝트 SSOT 드리프트) |
| 승인 완료 (training_approved) | 측정 불가 |
| 합성 데이터 | 측정 불가 |
| 실사용자 데이터 | 측정 불가 |
| Fine-tuning 상태 | 준비 부족 추정 (< 50건) |
| Blocker | (1) `generate-synthetic` 4일째 500 회귀 (2) MCP 연결이 본선 DB(`gxvtgrcqkbdibkyeqyil`)가 아닌 `TailLog`(`kvknerzsqgmmdmyxlorl`)를 가리킴 |

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



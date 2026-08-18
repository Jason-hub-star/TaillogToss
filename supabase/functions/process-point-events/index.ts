/**
 * process-point-events — point_events 큐 drainer
 *
 * 흐름:
 *   1. point_events WHERE processed=false ORDER BY created_at LIMIT N
 *   2. 월 예산 가드레일 확인 (MONTHLY_POINT_BUDGET_KRW, 기본 50,000)
 *      - 누적 ≥ 한도: 더 처리하지 않고 skipped_budget 기록
 *      - 누적 ≥ 80%: 텔레그램 경고 (호출 후 알림은 별도 자동화에서)
 *   3. 각 이벤트에 대해 grant-toss-points 호출
 *   4. point_transactions INSERT (status='granted'|'failed')
 *   5. point_events.processed=true, processed_at=now()
 *
 * 호출:
 *   - 자동화 `point-events-drainer.prompt.md` 매 10분
 *   - 또는 Vercel Cron /api/cron/point-events-drainer
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';

export interface ProcessPointEventsRequest {
  /** 한 번에 처리할 최대 큐 건수 (기본 100) */
  batchSize?: number;
}

export interface ProcessPointEventsResponse {
  picked: number;
  granted: number;
  failed: number;
  skippedBudget: number;
  monthlyTotalKrw: number;
  budgetLimitKrw: number;
}

interface PointEventRow {
  id: string;
  user_id: string;
  event_type: string;
  source_id: string | null;
  points: number;
  reason_code: string;
}

interface GrantTossPointsClient {
  grantPoints(req: {
    userId: string;
    points: number;
    reasonCode: string;
    idempotencyKey: string;
  }): Promise<{
    ok: boolean;
    transactionId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
}

interface SupabaseClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: boolean): {
        order(col: string, opts: { ascending: boolean }): {
          limit(n: number): Promise<{ data: PointEventRow[] | null; error: { message: string } | null }>;
        };
      };
    };
    update(values: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
    insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
  rpc(fn: string, args?: Record<string, unknown>): Promise<{
    data: number | boolean | null;
    error: { message: string } | null;
  }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BATCH_SIZE = 100;
const MAX_POINTS_PER_EVENT = 5000;
const ALLOWED_POINT_EVENTS = new Map<string, Set<string>>([
  ['referral_granted', new Set(['referral_reward'])],
  ['first_coaching_created', new Set(['first_coaching_bonus'])],
  ['signup_completed', new Set(['signup_bonus'])],
]);

function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function resolveBatchSize(value: number | undefined): number {
  if (!Number.isInteger(value)) return 100;
  return Math.min(Math.max(value, 1), MAX_BATCH_SIZE);
}

function isValidPointEvent(ev: PointEventRow): boolean {
  const allowedReasonCodes = ALLOWED_POINT_EVENTS.get(ev.event_type);
  return (
    isUuid(ev.id) &&
    isUuid(ev.user_id) &&
    isUuid(ev.source_id) &&
    typeof ev.points === 'number' &&
    Number.isInteger(ev.points) &&
    ev.points > 0 &&
    ev.points <= MAX_POINTS_PER_EVENT &&
    Boolean(allowedReasonCodes?.has(ev.reason_code))
  );
}

export function createProcessPointEventsHandler(deps: {
  supabase: SupabaseClient;
  grantClient: GrantTossPointsClient;
  budgetLimitKrw?: number;
}) {
  const budgetLimitKrw = deps.budgetLimitKrw ?? 50000;

  return async (
    request: ProcessPointEventsRequest,
    context: EdgeContext
  ): Promise<EdgeResult<ProcessPointEventsResponse>> => {
    if (context.role !== 'service_role') {
      return fail('AUTH_FORBIDDEN', 'Only service_role can drain point events', 403);
    }

    const batchSize = resolveBatchSize(request.batchSize);

    // 1. 현재 월 누적 지급액 조회
    const monthlyResult = await deps.supabase.rpc('monthly_point_grants_total_krw');
    if (monthlyResult.error) {
      return fail('DB_ERROR', `monthly total query failed: ${monthlyResult.error.message}`, 502);
    }
    const monthlyTotalKrw = monthlyResult.data ?? 0;

    // 2. 큐 폴링
    const queueResult = await deps.supabase
      .from('point_events')
      .select('id,user_id,event_type,source_id,points,reason_code')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(batchSize);
    if (queueResult.error) {
      return fail('DB_ERROR', queueResult.error.message, 502);
    }
    const events = queueResult.data ?? [];

    let granted = 0;
    let failed = 0;
    let skippedBudget = 0;
    let runningTotal = monthlyTotalKrw;

    for (const ev of events) {
      if (!isValidPointEvent(ev)) {
        await deps.supabase.from('point_transactions').insert({
          point_event_id: isUuid(ev.id) ? ev.id : null,
          user_id: isUuid(ev.user_id) ? ev.user_id : null,
          points: typeof ev.points === 'number' ? ev.points : 0,
          toss_error_code: 'INVALID_POINT_EVENT',
          status: 'failed',
        });
        if (isUuid(ev.id)) {
          await deps.supabase
            .from('point_events')
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq('id', ev.id);
        }
        failed++;
        continue;
      }

      // 3-a. 원자적 claim (SEC-2) — 지급 "이전"에 processed=true 로 선점한다.
      // 이미 처리됐거나 claim 실패면 건너뛰어 중복지급(at-least-once)을 막는다.
      const claim = await deps.supabase.rpc('claim_point_event', { p_event_id: ev.id });
      if (claim.error) {
        // claim 자체 실패 — 이번 실행은 건너뛰고 다음 드레이너가 재시도(processed 미변경).
        continue;
      }
      if (claim.data !== true) {
        // 다른 실행이 이미 처리 완료 — 건너뜀.
        continue;
      }

      // 3-b. 예산 가드레일 — 한도 초과 시 무지급(이미 claim 으로 processed=true).
      if (runningTotal + ev.points > budgetLimitKrw) {
        await deps.supabase.from('point_transactions').insert({
          point_event_id: ev.id,
          user_id: ev.user_id,
          points: ev.points,
          status: 'skipped_budget',
        });
        skippedBudget++;
        continue;
      }

      // 3-c. 토스 S2S 호출 — claim 성공분만(유일 처리자 보장).
      const idempotencyKey = `point-event-${ev.id}`;
      try {
        const grantResult = await deps.grantClient.grantPoints({
          userId: ev.user_id,
          points: ev.points,
          reasonCode: ev.reason_code,
          idempotencyKey,
        });

        if (grantResult.ok) {
          await deps.supabase.from('point_transactions').insert({
            point_event_id: ev.id,
            user_id: ev.user_id,
            points: ev.points,
            toss_transaction_id: grantResult.transactionId ?? null,
            status: 'granted',
          });
          runningTotal += ev.points;
          granted++;
        } else {
          await deps.supabase.from('point_transactions').insert({
            point_event_id: ev.id,
            user_id: ev.user_id,
            points: ev.points,
            toss_error_code: grantResult.errorCode ?? null,
            status: 'failed',
          });
          failed++;
        }
      } catch (err) {
        await deps.supabase.from('point_transactions').insert({
          point_event_id: ev.id,
          user_id: ev.user_id,
          points: ev.points,
          toss_error_code: 'EXCEPTION',
          status: 'failed',
        });
        failed++;
        console.error('point-events-drainer grant failed', {
          eventId: ev.id,
          errorType: err instanceof Error ? err.name : typeof err,
        });
      }
      // 처리 완료 마킹은 3-a claim 단계에서 이미 수행됨.
    }

    return ok({
      picked: events.length,
      granted,
      failed,
      skippedBudget,
      monthlyTotalKrw: runningTotal,
      budgetLimitKrw,
    });
  };
}

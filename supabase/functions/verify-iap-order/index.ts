/**
 * verify-iap-order — Toss IAP 주문을 검증하고 멱등/서킷브레이커를 적용한다.
 * Parity: IAP-001
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import {
  createMTLSClient,
  type MTLSClient,
  type TossOrderVerification,
} from '../_shared/mTLSClient.ts';
import {
  iapCircuitBreaker,
  retryOnServerError,
  type InMemoryCircuitBreaker,
} from '../_shared/circuitBreaker.ts';
import {
  edgeIdempotencyStore,
  type BeginIdempotencyResult,
  type InMemoryIdempotencyStore,
} from '../_shared/idempotency.ts';

export interface VerifyIapOrderRequest {
  orderId: string;
  productId: string;
  transactionId: string;
  idempotencyKey: string;
  userId?: string;
}

export interface VerifyIapOrderResponse {
  id: string;
  user_id: string;
  product_id: string;
  idempotency_key: string;
  toss_status:
    | 'PURCHASED'
    | 'PAYMENT_COMPLETED'
    | 'FAILED'
    | 'REFUNDED'
    | 'ORDER_IN_PROGRESS'
    | 'NOT_FOUND';
  grant_status: 'pending' | 'granted' | 'grant_failed' | 'refund_requested' | 'refunded';
  amount: number;
  toss_order_id: string;
  error_code: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

interface VerifyIapDeps {
  mTLSClient: MTLSClient;
  breaker: InMemoryCircuitBreaker;
  idempotency: InMemoryIdempotencyStore;
  now: () => Date;
}

function defaultDeps(): VerifyIapDeps {
  return {
    mTLSClient: createMTLSClient('mock'),
    breaker: iapCircuitBreaker,
    idempotency: edgeIdempotencyStore,
    now: () => new Date(),
  };
}

function mapGrantStatus(
  status: TossOrderVerification['tossStatus']
): VerifyIapOrderResponse['grant_status'] {
  if (status === 'PAYMENT_COMPLETED') return 'granted';
  if (status === 'REFUNDED') return 'refunded';
  if (status === 'FAILED' || status === 'NOT_FOUND') return 'grant_failed';
  return 'pending';
}

function resolveIdempotentResponse(
  begin: BeginIdempotencyResult<VerifyIapOrderResponse>
): EdgeResult<VerifyIapOrderResponse> | null {
  if (begin.kind === 'new') return null;

  const record = begin.record;
  if (record.status === 'completed' && record.response) {
    return ok(record.response);
  }

  return fail('IDEMPOTENCY_IN_PROGRESS', 'Request is already being processed', 409, {
    retryable: true,
  });
}

export function createVerifyIapOrderHandler(overrides?: Partial<VerifyIapDeps>) {
  const deps = { ...defaultDeps(), ...(overrides ?? {}) };

  return async (
    request: VerifyIapOrderRequest,
    context: EdgeContext
  ): Promise<EdgeResult<VerifyIapOrderResponse>> => {
    void context;

    if (!request.orderId || !request.productId || !request.transactionId || !request.idempotencyKey) {
      return fail('VALIDATION_ERROR', 'orderId/productId/transactionId/idempotencyKey are required', 400);
    }

    const begin = deps.idempotency.begin<VerifyIapOrderResponse>('verify-iap-order', request.idempotencyKey);
    const replay = resolveIdempotentResponse(begin);
    if (replay) return replay;

    const now = deps.now().toISOString();
    try {
      const verification = await deps.breaker.execute('verify-iap-order', async () =>
        retryOnServerError(
          () =>
            deps.mTLSClient.verifyIapOrder({
              orderId: request.orderId,
              productId: request.productId,
              transactionId: request.transactionId,
            }),
          { maxRetries: 2, baseDelayMs: 150 }
        )
      );

      const response: VerifyIapOrderResponse = {
        id: `ord_${request.orderId}`,
        user_id: request.userId ?? 'unknown-user',
        product_id: request.productId,
        idempotency_key: request.idempotencyKey,
        toss_status: verification.tossStatus,
        grant_status: mapGrantStatus(verification.tossStatus),
        amount: verification.amount,
        toss_order_id: verification.tossOrderId,
        error_code: verification.errorCode ?? null,
        retry_count: 0,
        created_at: now,
        updated_at: now,
      };

      deps.idempotency.complete('verify-iap-order', request.idempotencyKey, response);
      return ok(response);
    } catch (error) {
      deps.idempotency.fail('verify-iap-order', request.idempotencyKey);
      const retryAfterMs =
        typeof error === 'object' && error !== null && 'retryAfterMs' in error
          ? Number((error as { retryAfterMs: unknown }).retryAfterMs)
          : 0;

      const status =
        typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status: unknown }).status)
          : 502;

      return fail('IAP_VERIFY_FAILED', 'Failed to verify IAP order', status, {
        retryable: status >= 500,
        details: retryAfterMs > 0 ? { retryAfterSeconds: Math.ceil(retryAfterMs / 1000) } : undefined,
      });
    }
  };
}

export const handleVerifyIapOrder = createVerifyIapOrderHandler();

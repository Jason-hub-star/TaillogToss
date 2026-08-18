/**
 * grant-toss-points — 3-step key 흐름으로 포인트를 지급하고 에러코드를 분기한다.
 * Parity: IAP-001
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import {
  createMTLSClient,
  type MTLSClient,
} from '../_shared/mTLSClient.ts';
import {
  edgeIdempotencyStore,
  type BeginIdempotencyResult,
  type InMemoryIdempotencyStore,
} from '../_shared/idempotency.ts';
import {
  pointsCircuitBreaker,
  retryOnServerError,
  type InMemoryCircuitBreaker,
} from '../_shared/circuitBreaker.ts';
import { resolveMtlsMode } from '../_shared/mtlsMode.ts';

export interface GrantTossPointsRequest {
  userId: string;
  points: number;
  reasonCode: string;
  idempotencyKey: string;
}

export interface GrantTossPointsResponse {
  status: 'granted' | 'failed';
  transaction_id: string;
  error_code: '4100' | '4109' | '4110' | '4112' | '4113' | null;
}

interface GrantPointsDeps {
  mTLSClient: MTLSClient;
  idempotency: InMemoryIdempotencyStore;
  breaker: InMemoryCircuitBreaker;
  usedGrantKeys: Set<string>;
}

const globalUsedGrantKeys = new Set<string>();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POINT_EVENT_IDEMPOTENCY_PATTERN = /^point-event-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_REASON_CODES = new Set([
  'referral_reward',
  'first_coaching_bonus',
  'signup_bonus',
]);

function defaultDeps(overrides?: Partial<GrantPointsDeps>): GrantPointsDeps {
  return {
    mTLSClient: overrides?.mTLSClient ?? createMTLSClient(resolveMtlsMode()),
    idempotency: edgeIdempotencyStore,
    breaker: pointsCircuitBreaker,
    usedGrantKeys: globalUsedGrantKeys,
  };
}

function isServiceRole(role: EdgeContext['role']): boolean {
  return role === 'service_role';
}

function resolveIdempotentResponse(
  begin: BeginIdempotencyResult<GrantTossPointsResponse>
): EdgeResult<GrantTossPointsResponse> | null {
  if (begin.kind === 'new') return null;

  if (begin.kind === 'conflict') {
    return fail('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency key is already bound to another point grant request', 409);
  }

  const record = begin.record;
  if (record.status === 'completed' && record.response) {
    return ok(record.response);
  }

  return fail('IDEMPOTENCY_IN_PROGRESS', 'Request is already being processed', 409, {
    retryable: true,
  });
}

function mapTossCode(code: string | undefined): string {
  if (code === '4100' || code === '4109' || code === '4110' || code === '4112' || code === '4113') {
    return code;
  }
  return '4112';
}

function isValidGrantRequest(request: GrantTossPointsRequest): boolean {
  return (
    UUID_PATTERN.test(request.userId) &&
    POINT_EVENT_IDEMPOTENCY_PATTERN.test(request.idempotencyKey) &&
    ALLOWED_REASON_CODES.has(request.reasonCode) &&
    Number.isInteger(request.points) &&
    request.points > 0 &&
    request.points <= 5000
  );
}

function buildGrantRequestFingerprint(request: GrantTossPointsRequest): string {
  return JSON.stringify({
    userId: request.userId,
    points: request.points,
    reasonCode: request.reasonCode,
    idempotencyKey: request.idempotencyKey,
  });
}

export function createGrantTossPointsHandler(overrides?: Partial<GrantPointsDeps>) {
  const deps = { ...defaultDeps(overrides), ...(overrides ?? {}) };

  return async (
    request: GrantTossPointsRequest,
    context: EdgeContext
  ): Promise<EdgeResult<GrantTossPointsResponse>> => {
    if (!isServiceRole(context.role)) {
      return fail('AUTH_FORBIDDEN', 'Only service_role can grant toss points', 403);
    }

    if (!isValidGrantRequest(request)) {
      return fail(
        'VALIDATION_ERROR',
        'userId must be UUID; reasonCode/idempotencyKey must come from approved point_events; points must be > 0 and <= 5000 (toss 4114 한도)',
        400
      );
    }

    const begin = deps.idempotency.begin<GrantTossPointsResponse>(
      'grant-toss-points',
      request.idempotencyKey,
      buildGrantRequestFingerprint(request)
    );
    const replay = resolveIdempotentResponse(begin);
    if (replay) return replay;

    try {
      const response = await deps.breaker.execute('grant-toss-points', async () =>
        retryOnServerError(async () => {
          const key = await deps.mTLSClient.getPointsGrantKey();

          if (deps.usedGrantKeys.has(key.grantKey)) {
            const reuseError = new Error('Grant key already used') as Error & { status: number; code: string };
            reuseError.status = 409;
            reuseError.code = '4109';
            throw reuseError;
          }

          deps.usedGrantKeys.add(key.grantKey);

          const execution = await deps.mTLSClient.executePointsGrant({
            grantKey: key.grantKey,
            userId: request.userId,
            points: request.points,
            reasonCode: request.reasonCode,
          });

          const result = await deps.mTLSClient.getPointsGrantResult(execution.executionId);
          if (result.status === 'FAILED') {
            const tossError = new Error('Toss points grant failed') as Error & {
              status: number;
              code: string;
            };
            tossError.status = 502;
            tossError.code = mapTossCode(result.errorCode);
            throw tossError;
          }

          const successResponse: GrantTossPointsResponse = {
            status: 'granted',
            transaction_id: result.transactionId,
            error_code: null,
          };

          return successResponse;
        })
      );

      deps.idempotency.complete('grant-toss-points', request.idempotencyKey, response);
      return ok(response);
    } catch (error) {
      deps.idempotency.fail('grant-toss-points', request.idempotencyKey);

      const tossCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? mapTossCode(String((error as { code: unknown }).code))
          : '4112';

      return fail(`TOSS_${tossCode}`, 'Failed to grant toss points', 502, {
        retryable: true,
        details: { tossErrorCode: tossCode },
      });
    }
  };
}

let defaultHandler: ReturnType<typeof createGrantTossPointsHandler> | null = null;

export const handleGrantTossPoints: ReturnType<typeof createGrantTossPointsHandler> = (request, context) => {
  defaultHandler ??= createGrantTossPointsHandler();
  return defaultHandler(request, context);
};

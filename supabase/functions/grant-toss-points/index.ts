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

function defaultDeps(): GrantPointsDeps {
  return {
    mTLSClient: createMTLSClient('mock'),
    idempotency: edgeIdempotencyStore,
    breaker: pointsCircuitBreaker,
    usedGrantKeys: globalUsedGrantKeys,
  };
}

function isAdminRole(role: EdgeContext['role']): boolean {
  return role === 'trainer' || role === 'org_owner' || role === 'org_staff' || role === 'service_role';
}

function resolveIdempotentResponse(
  begin: BeginIdempotencyResult<GrantTossPointsResponse>
): EdgeResult<GrantTossPointsResponse> | null {
  if (begin.kind === 'new') return null;

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

export function createGrantTossPointsHandler(overrides?: Partial<GrantPointsDeps>) {
  const deps = { ...defaultDeps(), ...(overrides ?? {}) };

  return async (
    request: GrantTossPointsRequest,
    context: EdgeContext
  ): Promise<EdgeResult<GrantTossPointsResponse>> => {
    if (!isAdminRole(context.role)) {
      return fail('AUTH_FORBIDDEN', 'Only staff roles can grant toss points', 403);
    }

    if (!request.userId || !request.reasonCode || !request.idempotencyKey || request.points <= 0) {
      return fail('VALIDATION_ERROR', 'userId/points/reasonCode/idempotencyKey are required', 400);
    }

    const begin = deps.idempotency.begin<GrantTossPointsResponse>(
      'grant-toss-points',
      request.idempotencyKey
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

export const handleGrantTossPoints = createGrantTossPointsHandler();

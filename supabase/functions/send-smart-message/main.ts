/**
 * send-smart-message main — Deno serve 엔트리포인트.
 * Parity: MSG-001
 */

import { fail } from '../_shared/contracts.ts';
import {
  buildEdgeContext,
  methodNotAllowed,
  parseRequestJson,
  toJsonResponse,
} from '../_shared/httpAdapter.ts';
import { handleSendSmartMessage, type SendSmartMessageRequest } from './index.ts';

const edgeRuntime = (globalThis as { Deno?: { serve: (handler: (request: Request) => Promise<Response> | Response) => void } }).Deno;
if (!edgeRuntime?.serve) {
  throw new Error('Deno runtime is required for send-smart-message main entrypoint');
}

edgeRuntime.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return methodNotAllowed(request.method);
  }

  const body = await parseRequestJson<SendSmartMessageRequest>(request);
  if (!body) {
    return toJsonResponse(fail('VALIDATION_ERROR', 'Invalid JSON body', 400));
  }

  const context = buildEdgeContext(request);
  const result = await handleSendSmartMessage(body, context);
  return toJsonResponse(result);
});

/**
 * Idempotency Store — 동일 키 재요청 시 최초 결과를 재사용한다.
 * Parity: IAP-001, MSG-001
 */

export type RequestStatus = 'processing' | 'completed' | 'failed';

export interface IdempotencyRecord<T> {
  idempotencyKey: string;
  functionName: string;
  requestFingerprint?: string;
  status: RequestStatus;
  response?: T;
  createdAt: string;
  updatedAt: string;
}

export type BeginIdempotencyResult<T> =
  | { kind: 'new' }
  | { kind: 'conflict'; record: IdempotencyRecord<T> }
  | { kind: 'existing'; record: IdempotencyRecord<T> };

export class InMemoryIdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord<unknown>>();

  private buildCompositeKey(functionName: string, idempotencyKey: string): string {
    return `${functionName}:${idempotencyKey}`;
  }

  begin<T>(
    functionName: string,
    idempotencyKey: string,
    requestFingerprint?: string
  ): BeginIdempotencyResult<T> {
    const key = this.buildCompositeKey(functionName, idempotencyKey);
    const existing = this.records.get(key);

    if (existing) {
      if (
        existing.requestFingerprint &&
        requestFingerprint &&
        existing.requestFingerprint !== requestFingerprint
      ) {
        return { kind: 'conflict', record: existing as IdempotencyRecord<T> };
      }
      return { kind: 'existing', record: existing as IdempotencyRecord<T> };
    }

    const now = new Date().toISOString();
    this.records.set(key, {
      idempotencyKey,
      functionName,
      requestFingerprint,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    });

    return { kind: 'new' };
  }

  complete<T>(functionName: string, idempotencyKey: string, response: T): IdempotencyRecord<T> {
    const key = this.buildCompositeKey(functionName, idempotencyKey);
    const existing = this.records.get(key);
    const now = new Date().toISOString();

    const nextRecord: IdempotencyRecord<T> = {
      idempotencyKey,
      functionName,
      requestFingerprint: existing?.requestFingerprint,
      status: 'completed',
      response,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.records.set(key, nextRecord);
    return nextRecord;
  }

  fail(functionName: string, idempotencyKey: string): void {
    const key = this.buildCompositeKey(functionName, idempotencyKey);
    const existing = this.records.get(key);
    if (!existing) return;

    this.records.set(key, {
      ...existing,
      status: 'failed',
      updatedAt: new Date().toISOString(),
    });
  }
}

export const edgeIdempotencyStore = new InMemoryIdempotencyStore();

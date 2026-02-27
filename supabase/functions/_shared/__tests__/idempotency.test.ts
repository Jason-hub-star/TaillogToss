import { InMemoryIdempotencyStore } from '../idempotency.ts';

describe('InMemoryIdempotencyStore', () => {
  test('returns existing completed response for duplicate key', () => {
    const store = new InMemoryIdempotencyStore();

    const firstBegin = store.begin('verify-iap-order', 'idem-1');
    expect(firstBegin.kind).toBe('new');

    store.complete('verify-iap-order', 'idem-1', { status: 'ok' });

    const secondBegin = store.begin<{ status: string }>('verify-iap-order', 'idem-1');
    expect(secondBegin.kind).toBe('existing');
    if (secondBegin.kind === 'existing') {
      expect(secondBegin.record.status).toBe('completed');
      expect(secondBegin.record.response).toEqual({ status: 'ok' });
    }
  });
});

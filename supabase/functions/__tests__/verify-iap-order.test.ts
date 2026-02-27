import { createVerifyIapOrderHandler } from '../verify-iap-order/index.ts';

describe('verify-iap-order handler', () => {
  test('retries transient 5xx and succeeds', async () => {
    const handler = createVerifyIapOrderHandler();

    const result = await handler(
      {
        orderId: 'order-retry-500',
        productId: 'pro_monthly',
        transactionId: 'tx-1',
        idempotencyKey: 'idem-verify-1',
        userId: 'user-1',
      },
      { clientKey: 'client-a' }
    );

    expect(result.ok).toBe(true);
    expect(result.data?.toss_status).toBe('PAYMENT_COMPLETED');
  });

  test('returns same completed response for duplicate idempotency key', async () => {
    const handler = createVerifyIapOrderHandler();

    const request = {
      orderId: 'order-2',
      productId: 'pro_monthly',
      transactionId: 'tx-2',
      idempotencyKey: 'idem-verify-2',
      userId: 'user-1',
    };

    const first = await handler(request, { clientKey: 'client-a' });
    const second = await handler(request, { clientKey: 'client-a' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.data).toEqual(first.data);
  });
});

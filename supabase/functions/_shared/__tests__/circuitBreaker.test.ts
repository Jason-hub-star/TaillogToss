import {
  InMemoryCircuitBreaker,
  retryOnServerError,
} from '../circuitBreaker.ts';

describe('circuitBreaker', () => {
  test('opens after configured failure threshold', async () => {
    const breaker = new InMemoryCircuitBreaker({ failureThreshold: 2, openForMs: 1000 });

    await expect(
      breaker.execute('iap', async () => {
        const error = new Error('upstream') as Error & { status: number };
        error.status = 503;
        throw error;
      }, 0)
    ).rejects.toThrow();

    await expect(
      breaker.execute('iap', async () => {
        const error = new Error('upstream') as Error & { status: number };
        error.status = 503;
        throw error;
      }, 10)
    ).rejects.toThrow();

    await expect(breaker.execute('iap', async () => 'ok', 20)).rejects.toMatchObject({
      code: 'CIRCUIT_OPEN',
    });
  });

  test('retries only for 5xx errors', async () => {
    let attempts = 0;

    const value = await retryOnServerError(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          const error = new Error('temporary') as Error & { status: number };
          error.status = 503;
          throw error;
        }
        return 'ok';
      },
      { maxRetries: 2, baseDelayMs: 1 }
    );

    expect(value).toBe('ok');
    expect(attempts).toBe(2);
  });
});

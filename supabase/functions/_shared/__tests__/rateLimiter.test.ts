import { InMemoryRateLimiter } from '../rateLimiter.ts';

describe('InMemoryRateLimiter', () => {
  test('blocks when max request count is exceeded within the same window', () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 2 });

    expect(limiter.consume('client-a', 0).allowed).toBe(true);
    expect(limiter.consume('client-a', 100).allowed).toBe(true);

    const blocked = limiter.consume('client-a', 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('resets after window is elapsed', () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 1 });
    expect(limiter.consume('client-a', 0).allowed).toBe(true);
    expect(limiter.consume('client-a', 100).allowed).toBe(false);
    expect(limiter.consume('client-a', 1001).allowed).toBe(true);
  });
});

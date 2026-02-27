import { evaluateCooldown } from '../cooldownPolicy.ts';

describe('cooldownPolicy', () => {
  test('blocks during quiet hours in KST', () => {
    const utcTime = new Date('2026-02-26T14:30:00.000Z').getTime(); // KST 23:30
    const decision = evaluateCooldown([], 'u1', utcTime);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('QUIET_HOURS');
  });

  test('blocks when sent too recently', () => {
    const now = new Date('2026-02-26T03:00:00.000Z').getTime(); // KST 12:00
    const decision = evaluateCooldown([{ userId: 'u1', sentAt: now - 60_000 }], 'u1', now);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('MIN_INTERVAL');
  });

  test('blocks after daily limit', () => {
    const now = new Date('2026-02-26T03:00:00.000Z').getTime(); // KST 12:00
    const history = [
      { userId: 'u1', sentAt: now - 60 * 60 * 1000 },
      { userId: 'u1', sentAt: now - 2 * 60 * 60 * 1000 },
      { userId: 'u1', sentAt: now - 3 * 60 * 60 * 1000 },
    ];
    const decision = evaluateCooldown(history, 'u1', now);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('DAILY_LIMIT');
  });
});

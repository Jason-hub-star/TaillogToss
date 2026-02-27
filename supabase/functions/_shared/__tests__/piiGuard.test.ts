import { isPiiKey, redactPII } from '../piiGuard.ts';

describe('piiGuard', () => {
  test('detects canonical and snake_case keys', () => {
    expect(isPiiKey('email')).toBe(true);
    expect(isPiiKey('access_token')).toBe(true);
    expect(isPiiKey('random')).toBe(false);
  });

  test('redacts nested pii values', () => {
    const payload = {
      profile: {
        email: 'user@example.com',
        name: 'Dog Parent',
      },
      accessToken: 'secret-token',
      nested: [{ refresh_token: 'secret-refresh' }],
    };

    const sanitized = redactPII(payload);

    expect(sanitized.profile.email).toBe('[REDACTED]');
    expect(sanitized.profile.name).toBe('[REDACTED]');
    expect(sanitized.accessToken).toBe('[REDACTED]');
    expect(sanitized.nested[0]?.refresh_token).toBe('[REDACTED]');
  });
});

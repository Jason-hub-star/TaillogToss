import { isPiiKey, redactPII, redactText, safeLogPayload } from '../piiGuard.ts';

describe('piiGuard', () => {
  test('detects canonical and snake_case keys', () => {
    expect(isPiiKey('email')).toBe(true);
    expect(isPiiKey('access_token')).toBe(true);
    expect(isPiiKey('apikey')).toBe(true);
    expect(isPiiKey('service_role_key')).toBe(true);
    expect(isPiiKey('supabase_service_role_key')).toBe(true);
    expect(isPiiKey('id_token')).toBe(true);
    expect(isPiiKey('parent_phone')).toBe(true);
    expect(isPiiKey('toss_user_key')).toBe(true);
    expect(isPiiKey('auth_code')).toBe(true);
    expect(isPiiKey('authorizationCode')).toBe(true);
    expect(isPiiKey('random')).toBe(false);
  });

  test('redacts nested pii values', () => {
    const payload = {
      profile: {
        email: 'user@example.com',
        name: 'Dog Parent',
      },
      accessToken: 'secret-token',
      id_token: 'secret-id-token',
      jwt: 'secret-jwt',
      service_role_key: 'secret-service-role',
      supabaseServiceRoleKey: 'secret-supabase-service-role',
      userKey: 'toss-user-key',
      parentPhone: '010-1234-5678',
      authorizationCode: 'one-time-code',
      nested: [{ refresh_token: 'secret-refresh' }],
    };

    const sanitized = redactPII(payload);

    expect(sanitized.profile.email).toBe('[REDACTED]');
    expect(sanitized.profile.name).toBe('[REDACTED]');
    expect(sanitized.accessToken).toBe('[REDACTED]');
    expect(sanitized.id_token).toBe('[REDACTED]');
    expect(sanitized.jwt).toBe('[REDACTED]');
    expect(sanitized.service_role_key).toBe('[REDACTED]');
    expect(sanitized.supabaseServiceRoleKey).toBe('[REDACTED]');
    expect(sanitized.userKey).toBe('[REDACTED]');
    expect(sanitized.parentPhone).toBe('[REDACTED]');
    expect(sanitized.authorizationCode).toBe('[REDACTED]');
    expect(sanitized.nested[0]?.refresh_token).toBe('[REDACTED]');
  });

  test('redacts pii embedded in unstructured log strings', () => {
    const message = [
      'Authorization: Bearer eyJhbGciOiJ.fake.signature',
      'authorizationCode=secret-code',
      'authorization_code=secret-underscore-code',
      'access_token=secret-token',
      'accessToken=secret-camel-access',
      'id_token=secret-id-token',
      'idToken=secret-camel-id',
      'jwt=secret-jwt',
      'service_role_key=secret-service-role',
      'serviceRoleKey=secret-camel-service-role',
      'supabaseServiceRoleKey=secret-camel-supabase-service-role',
      'apikey=secret-api-key',
      'apiKey=secret-camel-api-key',
      'tossUserKey=secret-camel-toss-user-key',
      'contact parent@example.com',
      'phone 010-1234-5678',
    ].join(' ');

    const sanitized = redactText(message);

    expect(sanitized).not.toContain('eyJhbGciOiJ.fake.signature');
    expect(sanitized).not.toContain('secret-code');
    expect(sanitized).not.toContain('secret-underscore-code');
    expect(sanitized).not.toContain('secret-token');
    expect(sanitized).not.toContain('secret-camel-access');
    expect(sanitized).not.toContain('secret-id-token');
    expect(sanitized).not.toContain('secret-camel-id');
    expect(sanitized).not.toContain('secret-jwt');
    expect(sanitized).not.toContain('secret-service-role');
    expect(sanitized).not.toContain('secret-camel-service-role');
    expect(sanitized).not.toContain('secret-camel-supabase-service-role');
    expect(sanitized).not.toContain('secret-api-key');
    expect(sanitized).not.toContain('secret-camel-api-key');
    expect(sanitized).not.toContain('secret-camel-toss-user-key');
    expect(sanitized).not.toContain('parent@example.com');
    expect(sanitized).not.toContain('010-1234-5678');
    expect(sanitized).toContain('[REDACTED]');
  });

  test('safeLogPayload redacts pii strings even when keys are not sensitive', () => {
    const payload = safeLogPayload({
      errorMessage: 'upstream failed access_token=secret-token for parent@example.com',
      nested: { detail: 'Bearer eyJhbGciOiJ.fake.signature service_role_key=secret-service-role' },
    });

    expect(JSON.stringify(payload)).not.toContain('secret-token');
    expect(JSON.stringify(payload)).not.toContain('secret-service-role');
    expect(JSON.stringify(payload)).not.toContain('parent@example.com');
    expect(JSON.stringify(payload)).not.toContain('eyJhbGciOiJ.fake.signature');
  });
});

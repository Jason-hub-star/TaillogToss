/**
 * logRedaction.test.ts — frontend API log PII guard
 * Parity: AUTH-001
 */

import { redactLogText, redactLogValue, redactSerializedBodyForLog } from '../logRedaction';

describe('frontend API log redaction', () => {
  it('masks auth tokens, Toss userKey, and PII inside structured payloads', () => {
    const redacted = redactLogValue({
      authorizationCode: 'one-time-code',
      access_token: 'secret-access',
      refreshToken: 'secret-refresh',
      id_token: 'secret-id-token',
      service_role_key: 'secret-service-role',
      supabaseServiceRoleKey: 'secret-supabase-service-role',
      profile: {
        toss_user_key: 'toss-user-key',
        email: 'parent@example.com',
        phone_number: '010-1234-5678',
      },
      safe: 'visible',
    });

    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain('one-time-code');
    expect(serialized).not.toContain('secret-access');
    expect(serialized).not.toContain('secret-refresh');
    expect(serialized).not.toContain('secret-id-token');
    expect(serialized).not.toContain('secret-service-role');
    expect(serialized).not.toContain('secret-supabase-service-role');
    expect(serialized).not.toContain('toss-user-key');
    expect(serialized).not.toContain('parent@example.com');
    expect(serialized).not.toContain('010-1234-5678');
    expect(redacted.safe).toBe('visible');
  });

  it('masks sensitive values inside unstructured strings', () => {
    const text = [
      'Authorization: Bearer eyJhbGciOiJ.fake.signature',
      'auth_code=secret-code',
      'authorization_code=secret-underscore-code',
      'access_token=secret-access',
      'accessToken=secret-camel-access',
      'id_token=secret-id',
      'idToken=secret-camel-id',
      'toss_user_key=toss-user-key',
      'tossUserKey=secret-camel-toss-user-key',
      'service_role_key=secret-service-role',
      'serviceRoleKey=secret-camel-service-role',
      'supabaseServiceRoleKey=secret-camel-supabase-service-role',
      'apikey=secret-api-key',
      'apiKey=secret-camel-api-key',
      'contact parent@example.com 01012345678',
    ].join(' ');

    const redacted = redactLogText(text);

    expect(redacted).not.toContain('eyJhbGciOiJ.fake.signature');
    expect(redacted).not.toContain('secret-code');
    expect(redacted).not.toContain('secret-underscore-code');
    expect(redacted).not.toContain('secret-access');
    expect(redacted).not.toContain('secret-camel-access');
    expect(redacted).not.toContain('secret-id');
    expect(redacted).not.toContain('secret-camel-id');
    expect(redacted).not.toContain('toss-user-key');
    expect(redacted).not.toContain('secret-camel-toss-user-key');
    expect(redacted).not.toContain('secret-service-role');
    expect(redacted).not.toContain('secret-camel-service-role');
    expect(redacted).not.toContain('secret-camel-supabase-service-role');
    expect(redacted).not.toContain('secret-api-key');
    expect(redacted).not.toContain('secret-camel-api-key');
    expect(redacted).not.toContain('parent@example.com');
    expect(redacted).not.toContain('01012345678');
    expect(redacted).toContain('[REDACTED]');
  });

  it('redacts serialized request bodies before dev logging', () => {
    const redacted = redactSerializedBodyForLog(JSON.stringify({
      authorizationCode: 'code-from-toss',
      nested: { email: 'parent@example.com' },
      memo: 'visible',
    }));

    expect(redacted).not.toContain('code-from-toss');
    expect(redacted).not.toContain('parent@example.com');
    expect(redacted).toContain('"memo":"visible"');
  });
});

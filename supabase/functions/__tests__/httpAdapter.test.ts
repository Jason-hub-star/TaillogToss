import { buildEdgeContext } from '../_shared/httpAdapter.ts';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createJwt(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = 'signature';
  return `${header}.${body}.${signature}`;
}

describe('httpAdapter.buildEdgeContext', () => {
  test('ignores untrusted x-user-role header', () => {
    const token = createJwt({ role: 'anon' });
    const request = new Request('https://example.com/functions/v1/send-smart-message', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-user-role': 'trainer',
      },
    });

    const context = buildEdgeContext(request);
    expect(context.role).toBeUndefined();
  });

  test('parses app user role from JWT claims', () => {
    const token = createJwt({ role: 'authenticated', app_metadata: { user_role: 'trainer' } });
    const request = new Request('https://example.com/functions/v1/send-smart-message', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const context = buildEdgeContext(request);
    expect(context.role).toBe('trainer');
  });

  test('does not let role headers override lower-privilege JWT claims', () => {
    const token = createJwt({
      role: 'authenticated',
      sub: 'user-1',
      app_metadata: { user_role: 'user' },
    });
    const request = new Request('https://example.com/functions/v1/grant-toss-points', {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-user-role': 'service_role',
      },
    });

    const context = buildEdgeContext(request);
    expect(context.role).toBe('user');
    expect(context.userId).toBe('user-1');
  });

  test('does not trust user_metadata role claims for Edge authorization', () => {
    const token = createJwt({
      role: 'authenticated',
      user_metadata: { role: 'trainer', user_role: 'org_owner' },
    });
    const request = new Request('https://example.com/functions/v1/grant-toss-points', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const context = buildEdgeContext(request);
    expect(context.role).toBeUndefined();
  });

  test('accepts service_role from JWT claims', () => {
    const token = createJwt({ role: 'service_role' });
    const request = new Request('https://example.com/functions/v1/grant-toss-points', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const context = buildEdgeContext(request);
    expect(context.role).toBe('service_role');
  });
});

import { handleAssignB2BRole } from '../assign-b2b-role/index.ts';

function jsonRequest(body: unknown, token = 'valid-user-jwt'): Request {
  return new Request('https://example.supabase.co/functions/v1/assign-b2b-role', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function spoofedJsonRequest(body: unknown, token = 'valid-user-jwt'): Request {
  return new Request('https://example.supabase.co/functions/v1/assign-b2b-role', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-user-role': 'service_role',
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

describe('assign-b2b-role auth boundary', () => {
  test('rejects forged or invalid JWT before updating roles', async () => {
    const fetchFn = jest.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;

    const response = await handleAssignB2BRole(
      jsonRequest({ role: 'trainer' }, 'forged.jwt.signature'),
      {
        getEnv: (key) => ({
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        })[key],
        fetchFn,
      },
    );

    const payload = await readJson(response);
    expect(response.status).toBe(401);
    expect((payload.error as { code?: string }).code).toBe('UNAUTHORIZED');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String(fetchFn.mock.calls[0][0])).toContain('/auth/v1/user');
  });

  test('rejects roles outside the self-service allowlist', async () => {
    const fetchFn = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
      }
      return new Response('{}', { status: 500 });
    }) as unknown as typeof fetch;

    const response = await handleAssignB2BRole(
      jsonRequest({ role: 'service_role' }),
      {
        getEnv: (key) => ({
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        })[key],
        fetchFn,
      },
    );

    const payload = await readJson(response);
    expect(response.status).toBe(400);
    expect((payload.error as { code?: string }).code).toBe('INVALID_ROLE');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test('updates only the internally verified user even when body userId and role header are spoofed', async () => {
    const fetchFn = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: 'verified-user' }), { status: 200 });
      }
      if (url.includes('/auth/v1/admin/users/verified-user')) {
        expect(init?.body).toBe(JSON.stringify({ user_metadata: { role: 'trainer' } }));
        return new Response('{}', { status: 200 });
      }
      if (url.includes('/rest/v1/users?id=eq.verified-user')) {
        expect(init?.body).toBe(JSON.stringify({ role: 'trainer' }));
        return new Response('{}', { status: 200 });
      }
      throw new Error(`unexpected request: ${url}`);
    }) as unknown as typeof fetch;

    const response = await handleAssignB2BRole(
      spoofedJsonRequest({ userId: 'victim-user', role: 'trainer' }),
      {
        getEnv: (key) => ({
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        })[key],
        fetchFn,
      },
    );

    const payload = await readJson(response);
    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ userId: 'verified-user', role: 'trainer' });
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/auth/v1/admin/users/verified-user'),
      expect.any(Object),
    );
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/users?id=eq.verified-user'),
      expect.any(Object),
    );
    expect(fetchFn).not.toHaveBeenCalledWith(
      expect.stringContaining('victim-user'),
      expect.any(Object),
    );
  });
});

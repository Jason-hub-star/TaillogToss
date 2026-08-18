import { handleTossDisconnect, type TossDisconnectDeps } from '../toss-disconnect/index.ts';

function basicAuth(id = 'callback-id', pw = 'callback-pw'): string {
  return `Basic ${btoa(`${id}:${pw}`)}`;
}

function makeDeps(fetchFn = jest.fn(async () => new Response(null, { status: 200 }))): TossDisconnectDeps {
  return {
    getEnv: (key) => ({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      TOSS_CALLBACK_AUTH_ID: 'callback-id',
      TOSS_CALLBACK_AUTH_PW: 'callback-pw',
    })[key],
    fetchFn: fetchFn as unknown as typeof fetch,
  };
}

function request(init: RequestInit = {}): Request {
  return new Request('https://example.supabase.co/functions/v1/toss-disconnect', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    body: JSON.stringify({ userKey: 123456789, referrer: 'UNLINK' }),
    ...init,
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

describe('toss-disconnect callback auth boundary', () => {
  test('rejects missing Basic Auth before any service-role request', async () => {
    const fetchFn = jest.fn(async () => new Response(null, { status: 200 }));

    const response = await handleTossDisconnect(
      request({ headers: { 'Content-Type': 'application/json' } }),
      makeDeps(fetchFn),
    );

    const payload = await readJson(response);
    expect(response.status).toBe(401);
    expect((payload.error as { code?: string }).code).toBe('UNAUTHORIZED');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('rejects invalid Basic Auth before touching Supabase', async () => {
    const fetchFn = jest.fn(async () => new Response(null, { status: 200 }));

    const response = await handleTossDisconnect(
      request({ headers: { Authorization: basicAuth('callback-id', 'wrong-pw') } }),
      makeDeps(fetchFn),
    );

    const payload = await readJson(response);
    expect(response.status).toBe(401);
    expect((payload.error as { code?: string }).code).toBe('UNAUTHORIZED');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('requires callback credentials to be configured', async () => {
    const fetchFn = jest.fn(async () => new Response(null, { status: 200 }));

    const response = await handleTossDisconnect(
      request(),
      {
        getEnv: (key) => ({
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        })[key],
        fetchFn: fetchFn as unknown as typeof fetch,
      },
    );

    expect(response.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('uses hashed idempotency keys and never writes the raw userKey to disconnect logs', async () => {
    const fetchFn = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/rest/v1/noti_history?select=id')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes('/rest/v1/users?toss_user_key=eq.123456789')) {
        return new Response(null, { status: 200 });
      }
      if (url.includes('/rest/v1/noti_history')) {
        expect(init?.body).toContain('disconnect_uk_');
        expect(init?.body).not.toContain('123456789');
        return new Response(null, { status: 200 });
      }
      throw new Error(`unexpected request: ${url}`);
    });

    const response = await handleTossDisconnect(request(), makeDeps(fetchFn));
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ processed: true, referrer: 'UNLINK' });
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/users?toss_user_key=eq.123456789'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  test('does not expose upstream Supabase errors in the HTTP response', async () => {
    const fetchFn = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/noti_history?select=id')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes('/rest/v1/users?toss_user_key=eq.123456789')) {
        return new Response('raw userKey=123456789 service-role-key upstream failure', { status: 500 });
      }
      if (url.includes('/rest/v1/noti_history')) {
        return new Response(null, { status: 200 });
      }
      throw new Error(`unexpected request: ${url}`);
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const response = await handleTossDisconnect(request(), makeDeps(fetchFn));
      const payload = await readJson(response);
      const serialized = JSON.stringify(payload);

      expect(response.status).toBe(500);
      expect((payload.error as { code?: string }).code).toBe('INTERNAL');
      expect(serialized).toContain('Disconnect processing failed');
      expect(serialized).not.toContain('123456789');
      expect(serialized).not.toContain('service-role-key');
      expect(serialized).not.toContain('upstream failure');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

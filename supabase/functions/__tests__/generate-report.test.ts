import { createGenerateReportHandler } from '../generate-report/index.ts';
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
  return `${header}.${body}.signature`;
}

function mockReportEnv(key: string): string | undefined {
  if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
  if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key';
  if (key === 'TOSS_RUNTIME_MODE') return 'DEV_LOCAL';
  if (key === 'REPORT_AI_MODE') return 'mock';
  return undefined;
}

describe('generate-report handler', () => {
  test('rejects unauthenticated requests before parameter validation', async () => {
    const handler = createGenerateReportHandler();

    const result = await handler(
      {
        report_id: '',
        dog_id: '',
        report_date: '',
      },
      { clientKey: 'client-a' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('AUTH_FORBIDDEN');
  });

  test('rejects non-admin roles', async () => {
    const handler = createGenerateReportHandler();

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'user' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('AUTH_FORBIDDEN');
  });

  test('ignores x-user-role header spoofing and still requires report membership', async () => {
    const token = createJwt({ role: 'authenticated', sub: 'user-1' });
    const request = new Request('https://example.com/functions/v1/generate-report', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-user-role': 'trainer',
      },
    });
    const context = buildEdgeContext(request);
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: 'org-1', created_by_trainer_id: 'trainer-1' },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/rest/v1/org_members?select=role,status')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([{ id: 'report-1', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock as unknown as typeof fetch,
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      context
    );

    expect(context.role).toBeUndefined();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('user_id=eq.user-1');
  });

  test('updates report for report trainer role with matching ownership', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: null, created_by_trainer_id: 'trainer-1' },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([{ id: 'report-1', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      now: () => new Date('2026-02-28T12:00:00.000Z'),
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'trainer', userId: 'trainer-1' }
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: 'report-1', generation_status: 'generated' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('rejects mismatched report and dog ids before AI generation or update', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-owner', created_by_org_id: null, created_by_trainer_id: 'trainer-1' },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`unexpected request: ${url}`);
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-attacker',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'trainer', userId: 'trainer-1' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('AUTH_FORBIDDEN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('service_role still rejects mismatched report and dog ids before update', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-owner', created_by_org_id: 'org-1', created_by_trainer_id: null },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`unexpected request: ${url}`);
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-attacker',
        report_date: '2026-02-28',
      },
      { clientKey: 'server-worker', role: 'service_role', userId: 'server-worker' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('AUTH_FORBIDDEN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('rejects staff role without report ownership or active membership', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: 'org-1', created_by_trainer_id: 'other-trainer' },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/rest/v1/org_members?select=role,status')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([{ id: 'report-1', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'trainer', userId: 'trainer-1' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('requires org membership even when an org report also has matching trainer id', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: 'org-1', created_by_trainer_id: 'trainer-1' },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/rest/v1/org_members?select=role,status')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`unexpected request: ${url}`);
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'trainer', userId: 'trainer-1' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('AUTH_FORBIDDEN');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String((fetchMock as jest.Mock).mock.calls[1][0])).toContain('org_id=eq.org-1');
    expect(String((fetchMock as jest.Mock).mock.calls[1][0])).toContain('user_id=eq.trainer-1');
  });

  test('allows active org membership when JWT role is user', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: 'org-1', created_by_trainer_id: null },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/rest/v1/org_members?select=role,status')) {
        return new Response(JSON.stringify([
          { role: 'owner', status: 'active' },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify([{ id: 'report-1', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      now: () => new Date('2026-02-28T12:00:00.000Z'),
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'user', userId: 'user-1' }
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('rejects non-standard admin org membership role', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: 'org-1', created_by_trainer_id: null },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/rest/v1/org_members?select=role,status')) {
        return new Response(JSON.stringify([
          { role: 'admin', status: 'active' },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`unexpected request: ${url}`);
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'user', userId: 'user-1' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error?.code).toBe('AUTH_FORBIDDEN');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('rejects inactive org membership when JWT role is user', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: 'org-1', created_by_trainer_id: null },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/rest/v1/org_members?select=role,status')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([{ id: 'report-1', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      getEnv: mockReportEnv,
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'user', userId: 'user-1' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('fails closed to real AI mode outside DEV_LOCAL even when REPORT_AI_MODE=mock', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-1', created_by_org_id: null, created_by_trainer_id: 'trainer-1' },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify([{ id: 'report-1', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      getEnv: (key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key';
        if (key === 'APP_ENV') return 'production';
        if (key === 'REPORT_AI_MODE') return 'mock';
        return undefined;
      },
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'trainer', userId: 'trainer-1' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error?.code).toBe('CONFIG_MISSING');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('uses OpenAI path when REPORT_AI_MODE=real', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/chat/completions')) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    behavior_summary: '행동 요약',
                    condition_notes: '컨디션 메모',
                    ai_coaching_oneliner: '코칭 한줄',
                  }),
                },
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/rest/v1/daily_reports?select=dog_id,created_by_org_id')) {
        return new Response(JSON.stringify([
          { dog_id: 'dog-2', created_by_org_id: null, created_by_trainer_id: 'trainer-1' },
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify([{ id: 'report-2', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      now: () => new Date('2026-02-28T12:30:00.000Z'),
      getEnv: (key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key';
        if (key === 'REPORT_AI_MODE') return 'real';
        if (key === 'OPENAI_API_KEY') return 'openai-key';
        if (key === 'OPENAI_MODEL') return 'gpt-4o-mini';
        return undefined;
      },
    });

    const result = await handler(
      {
        report_id: 'report-2',
        dog_id: 'dog-2',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'trainer', userId: 'trainer-1' }
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/v1/chat/completions');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/rest/v1/daily_reports?id=eq.report-2');
  });
});

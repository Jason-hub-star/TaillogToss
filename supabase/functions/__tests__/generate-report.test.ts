import { createGenerateReportHandler } from '../generate-report/index.ts';

describe('generate-report handler', () => {
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

  test('updates report for staff role', async () => {
    const fetchMock = jest.fn(async () => {
      return new Response(JSON.stringify([{ id: 'report-1', generation_status: 'generated' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const handler = createGenerateReportHandler({
      fetchImpl: fetchMock,
      now: () => new Date('2026-02-28T12:00:00.000Z'),
      getEnv: (key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key';
        return undefined;
      },
    });

    const result = await handler(
      {
        report_id: 'report-1',
        dog_id: 'dog-1',
        report_date: '2026-02-28',
      },
      { clientKey: 'client-a', role: 'trainer' }
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: 'report-1', generation_status: 'generated' });
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
      { clientKey: 'client-a', role: 'trainer' }
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/chat/completions');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/rest/v1/daily_reports?id=eq.report-2');
  });
});

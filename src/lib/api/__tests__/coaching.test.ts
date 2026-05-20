/**
 * coaching.test.ts — coaching API 생성/조회/액션 토글/에러 핸들링 테스트
 * Parity: AI-001
 */

const mockRequestBackend = jest.fn();
const mockWithBackendFallback = jest.fn();

jest.mock('lib/api/backend', () => ({
  requestBackend: (...args: unknown[]) => mockRequestBackend(...args),
  withBackendFallback: (...args: unknown[]) => mockWithBackendFallback(...args),
}));

const mockSingle = jest.fn();
const mockLimit = jest.fn(() => ({ single: mockSingle }));
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockUpdate = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ select: mockSelect, update: mockUpdate }));

jest.mock('lib/api/supabase', () => ({
  supabase: { from: (name: string) => mockFrom(name) },
}));

import {
  generateCoaching,
  getCoachingGenerationJob,
  parseCoachingError,
  startCoachingGeneration,
  toggleActionItem,
  getDailyUsage,
  getCoachings,
  getLatestCoaching,
  submitCoachingFeedback,
} from '../coaching';

beforeEach(() => {
  jest.clearAllMocks();
  mockWithBackendFallback.mockImplementation(
    async (runBackend: () => Promise<unknown>) => runBackend(),
  );
});

// ── async generation jobs ──

describe('coaching generation jobs', () => {
  it('생성 job을 시작한다', async () => {
    mockRequestBackend.mockResolvedValue({ job_id: 'job-1', status: 'pending' });

    const result = await startCoachingGeneration('dog-1', 'DAILY', '오늘 산책 중 줄 당김 발생');

    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/coaching/generation-jobs',
      {
        method: 'POST',
        body: {
          dog_id: 'dog-1',
          report_type: 'DAILY',
          user_context: '오늘 산책 중 줄 당김 발생',
        },
      },
    );
    expect(result.job_id).toBe('job-1');
  });

  it('생성 job 상태를 조회한다', async () => {
    mockRequestBackend.mockResolvedValue({ job_id: 'job-1', status: 'completed' });

    const result = await getCoachingGenerationJob('job-1');

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/coaching/generation-jobs/job-1');
    expect(result.status).toBe('completed');
  });
});

// ── generateCoaching ──

describe('generateCoaching', () => {
  it('백엔드에 POST 요청을 보내고 코칭 결과를 반환한다', async () => {
    const mockResult = {
      id: 'coaching-1',
      dog_id: 'dog-1',
      report_type: 'DAILY',
      blocks: { insight: { trend: 'stable' } },
      created_at: '2026-03-04T00:00:00Z',
    };
    mockRequestBackend.mockResolvedValue(mockResult);

    const result = await generateCoaching('dog-1', 'DAILY');

    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/coaching/generate',
      {
        method: 'POST',
        body: { dog_id: 'dog-1', report_type: 'DAILY' },
      },
    );
    expect(result.id).toBe('coaching-1');
    expect(result.blocks.insight.trend).toBe('stable');
  });

  it('report_type 미지정 시 DAILY가 기본값이다', async () => {
    mockRequestBackend.mockResolvedValue({ id: 'c-2' });

    await generateCoaching('dog-1');

    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/coaching/generate',
      expect.objectContaining({
        body: { dog_id: 'dog-1', report_type: 'DAILY' },
      }),
    );
  });

  it('userContext 전달 시 body에 user_context 포함된다', async () => {
    mockRequestBackend.mockResolvedValue({ id: 'c-3' });

    await generateCoaching('dog-1', 'DAILY', '오늘 산책 중 줄 당김 발생');

    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/coaching/generate',
      expect.objectContaining({
        body: {
          dog_id: 'dog-1',
          report_type: 'DAILY',
          user_context: '오늘 산책 중 줄 당김 발생',
        },
      }),
    );
  });

  it('userContext 빈 문자열 시 body에 user_context 미포함', async () => {
    mockRequestBackend.mockResolvedValue({ id: 'c-4' });

    await generateCoaching('dog-1', 'DAILY', '   ');

    const call = mockRequestBackend.mock.calls[0]!;
    const body = (call[1] as { body: Record<string, unknown> }).body;
    expect(body.user_context).toBeUndefined();
  });

  it('백엔드 에러 시 예외를 전파한다', async () => {
    mockRequestBackend.mockRejectedValue({ status: 429, details: { remaining: 0 } });

    await expect(generateCoaching('dog-1')).rejects.toEqual(
      expect.objectContaining({ status: 429 }),
    );
  });
});

// ── parseCoachingError ──

describe('parseCoachingError', () => {
  it('429 에러를 파싱하여 remaining과 retryAfterSec를 반환한다', () => {
    const error = {
      status: 429,
      details: { remaining: 0, retry_after_sec: 3600 },
    };

    const parsed = parseCoachingError(error);

    expect(parsed.status).toBe(429);
    expect(parsed.remaining).toBe(0);
    expect(parsed.retryAfterSec).toBe(3600);
    expect(parsed.message).toBe('일일 코칭 한도에 도달했어요');
  });

  it('503 에러를 AI 서비스 문제 메시지로 변환한다', () => {
    const parsed = parseCoachingError({ status: 503 });

    expect(parsed.status).toBe(503);
    expect(parsed.message).toBe('AI 서비스에 일시적 문제가 있어요');
  });

  it('기타 에러를 일반 실패 메시지로 변환한다', () => {
    const parsed = parseCoachingError({ status: 500 });

    expect(parsed.status).toBe(500);
    expect(parsed.message).toBe('코칭 생성에 실패했어요');
  });

  it('status 없는 에러는 500으로 처리한다', () => {
    const parsed = parseCoachingError({});

    expect(parsed.status).toBe(500);
  });

  it('429에서 remaining 없고 daily_limit 있으면 daily_limit으로 폴백한다', () => {
    const error = {
      status: 429,
      details: { daily_limit: 1, daily_used: 1, retry_after_sec: 82800 },
    };

    const parsed = parseCoachingError(error);

    expect(parsed.status).toBe(429);
    expect(parsed.remaining).toBe(1);
    expect(parsed.retryAfterSec).toBe(82800);
    expect(parsed.message).toBe('일일 코칭 한도에 도달했어요');
  });

  it('429에서 remaining도 daily_limit도 없으면 0 반환', () => {
    const parsed = parseCoachingError({ status: 429, details: {} });

    expect(parsed.remaining).toBe(0);
  });
});

// ── toggleActionItem ──

describe('toggleActionItem', () => {
  it('PATCH 요청으로 액션 아이템 완료 상태를 토글한다', async () => {
    const mockTracker = {
      id: 'tracker-1',
      coaching_id: 'coaching-1',
      action_item_id: 'ap1',
      is_completed: true,
      completed_at: '2026-03-04T00:00:00Z',
    };
    mockRequestBackend.mockResolvedValue(mockTracker);

    const result = await toggleActionItem('coaching-1', 'ap1', true);

    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/coaching/coaching-1/actions/ap1',
      {
        method: 'PATCH',
        body: { is_completed: true },
      },
    );
    expect(result.is_completed).toBe(true);
  });

  it('완료 해제도 정상 동작한다', async () => {
    mockRequestBackend.mockResolvedValue({
      id: 'tracker-1',
      is_completed: false,
      completed_at: null,
    });

    const result = await toggleActionItem('coaching-1', 'ap2', false);

    expect(result.is_completed).toBe(false);
    expect(result.completed_at).toBeNull();
  });
});

// ── getDailyUsage ──

describe('getDailyUsage', () => {
  it('일일 사용량을 조회한다', async () => {
    mockRequestBackend.mockResolvedValue({ used: 2, limit: 3 });

    const result = await getDailyUsage();

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/coaching/usage/daily');
    expect(result.used).toBe(2);
    expect(result.limit).toBe(3);
  });
});

// ── getCoachings (withBackendFallback) ──

describe('getCoachings', () => {
  it('backend 우선으로 코칭 목록을 조회한다', async () => {
    const mockList = [{ id: 'c-1' }, { id: 'c-2' }];
    mockRequestBackend.mockResolvedValue(mockList);

    const result = await getCoachings('dog-1');

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('c-1');
  });

  it('backend 실패 시 Supabase fallback으로 전환한다', async () => {
    mockWithBackendFallback.mockImplementation(
      async (_runBackend: () => Promise<unknown>, runFallback: () => Promise<unknown>) => {
        return runFallback();
      },
    );

    mockEq.mockReturnValue({
      order: jest.fn().mockReturnValue({
        data: [{ id: 'c-fb-1', dog_id: 'dog-1' }],
        error: null,
      }),
    });

    const result = await getCoachings('dog-1');

    expect(mockFrom).toHaveBeenCalledWith('ai_coaching');
    expect(result).toHaveLength(1);
  });
});

// ── getLatestCoaching (withBackendFallback) ──

describe('getLatestCoaching', () => {
  it('최신 코칭을 반환한다', async () => {
    const mockCoaching = { id: 'c-latest', blocks: { insight: { trend: 'improving' } } };
    mockRequestBackend.mockResolvedValue(mockCoaching);

    const result = await getLatestCoaching('dog-1');

    expect(result?.id).toBe('c-latest');
  });

  it('코칭이 없으면 null을 반환한다', async () => {
    mockRequestBackend.mockResolvedValue(null);

    const result = await getLatestCoaching('dog-1');

    expect(result).toBeNull();
  });
});

// ── submitCoachingFeedback ──

describe('submitCoachingFeedback', () => {
  it('피드백 점수를 PATCH 요청으로 전송한다', async () => {
    mockRequestBackend.mockResolvedValue(undefined);

    await submitCoachingFeedback('coaching-1', 5);

    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/coaching/coaching-1/feedback',
      {
        method: 'PATCH',
        body: { score: 5 },
      },
    );
  });
});

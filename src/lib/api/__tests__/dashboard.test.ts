/**
 * dashboard.test.ts — dashboard API backend-first 매핑 테스트
 * Parity: APP-001
 */

const mockRequestBackend = jest.fn();
const mockWithBackendFallback = jest.fn();

jest.mock('lib/api/backend', () => ({
  requestBackend: (...args: unknown[]) => mockRequestBackend(...args),
  withBackendFallback: (...args: unknown[]) => mockWithBackendFallback(...args),
}));

jest.mock('lib/api/dog', () => ({
  getDog: jest.fn(),
}));

jest.mock('lib/api/log', () => ({
  getLogs: jest.fn(),
}));

import { getDashboard } from '../dashboard';

beforeEach(() => {
  jest.clearAllMocks();
  mockWithBackendFallback.mockImplementation(async (runBackend: () => Promise<unknown>, _runFallback: () => Promise<unknown>) => {
    return runBackend();
  });
});

describe('getDashboard', () => {
  it('backend 응답을 DashboardData로 매핑한다', async () => {
    mockRequestBackend.mockResolvedValue({
      dog_profile: {
        id: 'dog-1',
        name: '콩이',
        breed: 'poodle',
        age_months: 24,
        weight_kg: 4.2,
        profile_image_url: null,
      },
      stats: {
        total_logs: 12,
        current_streak: 3,
        last_logged_at: '2026-02-28T00:00:00Z',
      },
      recent_logs: [
        {
          id: 'log-1',
          is_quick_log: true,
          quick_category: 'barking',
          behavior: null,
          intensity: 7,
          occurred_at: '2026-02-28T01:00:00Z',
          antecedent: '벨소리',
          consequence: '간식',
        },
      ],
      issues: ['분리불안'],
      env_triggers: ['벨소리'],
    });

    const data = await getDashboard('dog-1');
    expect(data.dogProfile.name).toBe('콩이');
    expect(data.stats.current_streak).toBe(3);
    expect(data.recentLogs).toHaveLength(1);
    expect(data.recentLogs[0]).toEqual(
      expect.objectContaining({
        dog_id: 'dog-1',
        quick_category: 'barking',
        intensity: 7,
      }),
    );
  });
});


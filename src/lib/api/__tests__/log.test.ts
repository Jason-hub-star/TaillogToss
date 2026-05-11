/**
 * log.test.ts — log API limit propagation tests
 * Parity: LOG-001
 */
const mockRequestBackend = jest.fn();
const mockWithBackendFallback = jest.fn();
const mockLimit = jest.fn();
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ select: mockSelect }));

jest.mock('lib/api/backend', () => ({
  requestBackend: (path: string, options?: unknown) =>
    options === undefined ? mockRequestBackend(path) : mockRequestBackend(path, options),
  withBackendFallback: (runBackend: () => Promise<unknown>, runFallback: () => Promise<unknown>) =>
    mockWithBackendFallback(runBackend, runFallback),
}));

jest.mock('lib/api/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

import { getLogs } from '../log';

describe('log API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestBackend.mockResolvedValue([]);
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  it('adds limit to backend log list requests', async () => {
    mockWithBackendFallback.mockImplementation(async (runBackend: () => Promise<unknown>) => runBackend());

    await getLogs('dog-1', 20);

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/logs/dog-1?limit=20');
  });

  it('applies the same limit to Supabase fallback', async () => {
    mockWithBackendFallback.mockImplementation(
      async (_runBackend: () => Promise<unknown>, runFallback: () => Promise<unknown>) => runFallback(),
    );

    await getLogs('dog-1', 200);

    expect(mockFrom).toHaveBeenCalledWith('behavior_logs');
    expect(mockEq).toHaveBeenCalledWith('dog_id', 'dog-1');
    expect(mockLimit).toHaveBeenCalledWith(200);
  });
});

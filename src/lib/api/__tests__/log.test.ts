/**
 * log.test.ts — log API limit propagation tests
 * Parity: LOG-001
 */
const mockRequestBackend = jest.fn();

jest.mock('lib/api/backend', () => ({
  requestBackend: (path: string, options?: unknown) =>
    options === undefined ? mockRequestBackend(path) : mockRequestBackend(path, options),
}));

import { getLogs } from '../log';

describe('log API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestBackend.mockResolvedValue([]);
  });

  it('adds limit to backend log list requests', async () => {
    await getLogs('dog-1', 20);

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/logs/dog-1?limit=20');
  });

  it('does not fall back to direct behavior_logs reads with caller-provided dogId', async () => {
    await getLogs('dog-1', 200);

    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/logs/dog-1?limit=200');
  });
});

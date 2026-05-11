/**
 * training.test.ts — training API backend-first 매핑/요청 테스트
 * Parity: UI-001
 */

const mockFrom = jest.fn();
const mockRequestBackend = jest.fn();
const mockWithBackendFallback = jest.fn();

jest.mock('lib/api/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock('lib/api/backend', () => ({
  requestBackend: (...args: unknown[]) => mockRequestBackend(...args),
  withBackendFallback: (...args: unknown[]) => mockWithBackendFallback(...args),
}));

import { completeStep, getStepFeedback, getTrainingProgress } from '../training';

beforeEach(() => {
  jest.clearAllMocks();
  mockWithBackendFallback.mockImplementation(async (runBackend: () => Promise<unknown>, _runFallback: () => Promise<unknown>) => {
    return runBackend();
  });
});

describe('getTrainingProgress', () => {
  it('backend rows를 TrainingProgress로 요약한다', async () => {
    mockRequestBackend.mockResolvedValue([
      {
        id: 'row-1',
        user_id: 'u-1',
        dog_id: 'dog-1',
        curriculum_id: 'basic_obedience',
        stage_id: 'day_1',
        step_number: 1,
        status: 'COMPLETED',
        current_variant: 'A',
        memo: null,
        created_at: '2026-02-28T00:00:01Z',
      },
      {
        id: 'row-2',
        user_id: 'u-1',
        dog_id: 'dog-1',
        curriculum_id: 'basic_obedience',
        stage_id: 'day_1',
        step_number: 2,
        status: 'COMPLETED',
        current_variant: 'B',
        memo: null,
        created_at: '2026-02-28T00:00:02Z',
      },
    ]);

    const rows = await getTrainingProgress('dog-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.curriculum_id).toBe('basic_obedience');
    expect(rows[0]?.current_variant).toBe('B');
    expect(rows[0]?.status).toBe('in_progress');
    expect(rows[0]?.completed_steps).toEqual(
      expect.arrayContaining(['basic_obedience_d1_s1', 'basic_obedience_d1_s2']),
    );
  });

  it('progress와 feedback 동시 조회는 같은 backend rows 요청을 공유한다', async () => {
    let resolveRows!: (rows: unknown[]) => void;
    mockRequestBackend.mockReturnValue(
      new Promise((resolve) => {
        resolveRows = resolve;
      }),
    );

    const progressPromise = getTrainingProgress('dog-1');
    const feedbackPromise = getStepFeedback('dog-1');

    await Promise.resolve();
    expect(mockRequestBackend).toHaveBeenCalledTimes(1);
    expect(mockRequestBackend).toHaveBeenCalledWith('/api/v1/training/dog-1');

    resolveRows([
      {
        id: 'row-1',
        user_id: 'u-1',
        dog_id: 'dog-1',
        curriculum_id: 'basic_obedience',
        stage_id: 'day_1',
        step_number: 1,
        status: 'COMPLETED',
        current_variant: 'A',
        memo: '잘 따라왔어요',
        reaction: 'enjoyed',
        created_at: '2026-02-28T00:00:01Z',
      },
    ]);

    const [progress, feedback] = await Promise.all([progressPromise, feedbackPromise]);
    expect(progress).toHaveLength(1);
    expect(feedback).toEqual([
      expect.objectContaining({
        curriculum_id: 'basic_obedience',
        reaction: 'enjoyed',
        memo: '잘 따라왔어요',
      }),
    ]);
  });
});

describe('completeStep', () => {
  it('stepId를 backend upsert payload로 변환한다', async () => {
    mockRequestBackend.mockResolvedValue({});

    await completeStep('progress-1', 'basic_obedience_d2_s3', [], 'dog-1');

    expect(mockRequestBackend).toHaveBeenCalledWith(
      '/api/v1/training/status',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          dog_id: 'dog-1',
          curriculum_id: 'basic_obedience',
          stage_id: 'day_2',
          step_number: 3,
          status: 'COMPLETED',
        }),
      }),
    );
  });
});

/**
 * 스마트 집계 + 훈련 효과 + 공유 텍스트 테스트 — 12개
 * F. SmartBar (1-4), G. WeeklyBar/MonthlyBar (5-7),
 * H. computeTrainingEffects (8-10), I. buildAnalysisShareText (11-12)
 * Parity: UI-001
 */
import { logsToSmartBar, logsToWeeklyBar, logsToMonthlyBar } from '../transformers';
import { computeTrainingEffects, buildAnalysisShareText } from '../filters';
import type { BehaviorLog } from 'types/log';
import type { TrainingProgress } from 'types/training';

/** 테스트용 BehaviorLog 팩토리 */
function makeLog(overrides: Partial<BehaviorLog> = {}): BehaviorLog {
  return {
    id: 'test-id',
    dog_id: 'dog-1',
    is_quick_log: true,
    quick_category: 'barking',
    daily_activity: null,
    type_id: null,
    antecedent: null,
    behavior: null,
    consequence: null,
    intensity: 5 as BehaviorLog['intensity'],
    duration_minutes: null,
    location: null,
    memo: null,
    occurred_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function makeProgress(overrides: Partial<TrainingProgress> = {}): TrainingProgress {
  return {
    id: 'prog-1',
    dog_id: 'dog-1',
    curriculum_id: 'reactivity_management',
    current_day: 3,
    current_variant: 'A',
    status: 'in_progress',
    completed_steps: [],
    memo: null,
    started_at: daysAgo(14),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// F. SmartBar 분기 로직 (시나리오 1-4)
// ──────────────────────────────────────────────
describe('F. SmartBar 스마트 분기', () => {
  test('1. days=7 → daily, labels=7', () => {
    const result = logsToSmartBar([], 7);
    expect(result.unit).toBe('daily');
    expect(result.data.labels.length).toBe(7);
  });

  test('2. days=30 → daily, labels=30', () => {
    const result = logsToSmartBar([], 30);
    expect(result.unit).toBe('daily');
    expect(result.data.labels.length).toBe(30);
  });

  test('3. days=60 → weekly, bars ≤ 9', () => {
    const logs = Array.from({ length: 20 }, (_, i) => makeLog({ occurred_at: daysAgo(i * 3) }));
    const result = logsToSmartBar(logs, 60);
    expect(result.unit).toBe('weekly');
    expect(result.data.labels.length).toBeLessThanOrEqual(9);
  });

  test('4. days=99999 → monthly, bars ≤ 36', () => {
    const logs = Array.from({ length: 10 }, (_, i) => makeLog({ occurred_at: daysAgo(i * 30) }));
    const result = logsToSmartBar(logs, 99999);
    expect(result.unit).toBe('monthly');
    expect(result.data.labels.length).toBeLessThanOrEqual(36);
  });
});

// ──────────────────────────────────────────────
// G. WeeklyBar/MonthlyBar 상세 (시나리오 5-7)
// ──────────────────────────────────────────────
describe('G. WeeklyBar/MonthlyBar 상세', () => {
  test('5. logsToWeeklyBar 7일 버킷 정확성', () => {
    // 3주치 (days=21) → 3 weeks
    const logs = [
      makeLog({ occurred_at: daysAgo(1) }),
      makeLog({ occurred_at: daysAgo(1) }),
      makeLog({ occurred_at: daysAgo(8) }),
      makeLog({ occurred_at: daysAgo(15) }),
    ];
    const result = logsToWeeklyBar(logs, 21);
    const total = result.datasets[0]!.data.reduce((a, b) => a + b, 0);
    expect(total).toBe(4);
    expect(result.datasets[0]!.label).toBe('주간 기록');
  });

  test('6. logsToMonthlyBar 빈 입력 → 유효한 BarChartData', () => {
    const result = logsToMonthlyBar([]);
    expect(result.labels.length).toBe(1);
    expect(result.datasets[0]!.data[0]).toBe(0);
  });

  test('7. logsToMonthlyBar 6개월 데이터 → 6개 바', () => {
    const logs: BehaviorLog[] = [];
    for (let m = 0; m < 6; m++) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      d.setDate(15);
      logs.push(makeLog({ occurred_at: d.toISOString() }));
    }
    const result = logsToMonthlyBar(logs);
    expect(result.labels.length).toBe(6);
    const total = result.datasets[0]!.data.reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
  });
});

// ──────────────────────────────────────────────
// H. computeTrainingEffects (시나리오 8-10)
// ──────────────────────────────────────────────
describe('H. computeTrainingEffects', () => {
  test('8. 훈련 없음 → 빈 배열', () => {
    const logs = [makeLog()];
    const result = computeTrainingEffects(logs, []);
    expect(result).toEqual([]);
  });

  test('9. 14일 전 시작, before 5건 after 2건 → -60%', () => {
    const progress = makeProgress({
      curriculum_id: 'reactivity_management',
      started_at: daysAgo(14),
    });

    const logs = [
      // before (15~28일 전 = 훈련시작 전 14일 윈도우)
      ...Array(5).fill(null).map((_, i) => makeLog({
        quick_category: 'barking',
        occurred_at: daysAgo(14 + i + 1),
      })),
      // after (0~13일 = 훈련시작 후 14일 윈도우)
      ...Array(2).fill(null).map((_, i) => makeLog({
        quick_category: 'barking',
        occurred_at: daysAgo(i + 1),
      })),
    ];

    const result = computeTrainingEffects(logs, [progress]);
    expect(result.length).toBe(1);
    expect(result[0]!.changePercent).toBe(-60);
    expect(result[0]!.beforeCount).toBe(5);
    expect(result[0]!.afterCount).toBe(2);
  });

  test('10. beforeCount < 2 → 스킵', () => {
    const progress = makeProgress({
      curriculum_id: 'reactivity_management',
      started_at: daysAgo(14),
    });

    const logs = [
      // before 1건만 (최소 2건 미충족)
      makeLog({ quick_category: 'barking', occurred_at: daysAgo(20) }),
      // after 3건
      ...Array(3).fill(null).map((_, i) => makeLog({
        quick_category: 'barking',
        occurred_at: daysAgo(i + 1),
      })),
    ];

    const result = computeTrainingEffects(logs, [progress]);
    expect(result.length).toBe(0);
  });
});

// ──────────────────────────────────────────────
// I. buildAnalysisShareText (시나리오 11-12)
// ──────────────────────────────────────────────
describe('I. buildAnalysisShareText', () => {
  test('11. 정상 출력 — 필수 문자열 포함', () => {
    const text = buildAnalysisShareText({
      dogName: '메이',
      periodLabel: '전체',
      totalLogs: 40,
      topBehavior: { label: '짖음/울음', count: 14 },
      trainingEffect: {
        curriculumTitle: '반응성 관리 훈련',
        behaviorLabel: '짖음/울음',
        beforeCount: 10,
        afterCount: 6,
        changePercent: -40,
      },
    });

    expect(text).toContain('메이');
    expect(text).toContain('전체');
    expect(text).toContain('40건');
    expect(text).toContain('짖음/울음 (14회)');
    expect(text).toContain('40% 감소');
    expect(text).toContain('꼬리일기');
  });

  test('12. 빈 데이터 → 크래시 없음', () => {
    const text = buildAnalysisShareText({
      dogName: '댕댕이',
      periodLabel: '주간',
      totalLogs: 0,
      topBehavior: null,
      trainingEffect: null,
    });

    expect(text).toContain('댕댕이');
    expect(text).toContain('0건');
    expect(text).not.toContain('가장 많은 행동');
    expect(text).not.toContain('훈련 효과');
  });
});

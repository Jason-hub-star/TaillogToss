/**
 * 데이터 변환 유틸 — BehaviorLog[] → 차트 데이터 변환
 * Parity: UI-001
 */
import type { BehaviorLog } from 'types/log';
import type { RadarChartData, HeatmapData, BarChartData } from 'types/chart';

/** 행동 유형별 빈도 → Radar 차트 (5축) */
export function logsToRadar(logs: BehaviorLog[]): RadarChartData {
  const categories = ['barking', 'anxiety', 'aggression', 'destructive', 'other_behavior'] as const;
  const labels: [string, string, string, string, string] = ['짖음', '불안', '공격성', '파괴', '기타'];

  const counts = categories.map(
    (cat) => logs.filter((l) => l.quick_category === cat).length
  );
  const max = Math.max(...counts, 1);
  const normalized = counts.map((c) => Math.round((c / max) * 100)) as [number, number, number, number, number];

  return {
    labels,
    datasets: [{ label: '행동 빈도', data: normalized }],
  };
}

/** 기록 → 요일 x 시간 Heatmap */
export function logsToHeatmap(logs: BehaviorLog[]): HeatmapData {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
  const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  for (const log of logs) {
    const d = new Date(log.occurred_at);
    const dayIndex = (d.getDay() + 6) % 7; // 월=0
    const hour = d.getHours();
    matrix[dayIndex]![hour]! += 1;
  }

  const maxValue = Math.max(...matrix.flat(), 1);
  return { matrix, day_labels: dayLabels, hour_labels: hourLabels, min_value: 0, max_value: maxValue };
}

/** 기록 → 일별 빈도 Bar 차트 */
export function logsToDailyBar(logs: BehaviorLog[], days: number = 7): BarChartData {
  const now = new Date();
  const labels: string[] = [];
  const counts: number[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    labels.push(dateStr);

    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    const count = logs.filter((l) => {
      const t = new Date(l.occurred_at).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    counts.push(count);
  }

  return {
    labels,
    datasets: [{ label: '일별 기록', data: counts }],
  };
}

// ── Smart Bar Aggregation ────────────────────────────────

export type AggregationUnit = 'daily' | 'weekly' | 'monthly';

export interface SmartBarResult {
  data: BarChartData;
  unit: AggregationUnit;
}

/** 스마트 분기: ≤30일 daily, ≤90일 weekly, >90일 monthly */
export function logsToSmartBar(logs: BehaviorLog[], days: number): SmartBarResult {
  if (days <= 30) {
    return { data: logsToDailyBar(logs, days), unit: 'daily' };
  }
  if (days <= 90) {
    return { data: logsToWeeklyBar(logs, days), unit: 'weekly' };
  }
  return { data: logsToMonthlyBar(logs), unit: 'monthly' };
}

/** 주간 집계: 7일 단위 버킷, 라벨 "MM/DD~", 최대 ~13바 */
export function logsToWeeklyBar(logs: BehaviorLog[], days: number): BarChartData {
  const now = new Date();
  const weekCount = Math.ceil(days / 7);
  const labels: string[] = [];
  const counts: number[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}~`;
    labels.push(label);

    const startTime = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
    const endTime = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate()).getTime() + 86400000;
    const count = logs.filter((l) => {
      const t = new Date(l.occurred_at).getTime();
      return t >= startTime && t < endTime;
    }).length;
    counts.push(count);
  }

  return {
    labels,
    datasets: [{ label: '주간 기록', data: counts }],
  };
}

/** 월별 집계: 로그 범위 기반 월 버킷, 라벨 "YY.MM", 최대 36바 */
export function logsToMonthlyBar(logs: BehaviorLog[]): BarChartData {
  if (logs.length === 0) {
    const now = new Date();
    const label = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}`;
    return { labels: [label], datasets: [{ label: '월별 기록', data: [0] }] };
  }

  const timestamps = logs.map((l) => new Date(l.occurred_at).getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  const startYear = minDate.getFullYear();
  const startMonth = minDate.getMonth();
  const endYear = maxDate.getFullYear();
  const endMonth = maxDate.getMonth();

  const labels: string[] = [];
  const counts: number[] = [];

  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const label = `${String(y).slice(2)}.${String(m + 1).padStart(2, '0')}`;
    labels.push(label);

    const monthStart = new Date(y, m, 1).getTime();
    const monthEnd = new Date(y, m + 1, 1).getTime();
    const count = logs.filter((l) => {
      const t = new Date(l.occurred_at).getTime();
      return t >= monthStart && t < monthEnd;
    }).length;
    counts.push(count);

    m++;
    if (m > 11) { m = 0; y++; }
  }

  return {
    labels,
    datasets: [{ label: '월별 기록', data: counts }],
  };
}

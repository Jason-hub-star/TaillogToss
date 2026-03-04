/**
 * 분석 필터 유틸 — 기간 필터 + 카테고리 집계 + 훈련 효과 + 공유 텍스트
 * analysis.tsx에서 추출
 * Parity: UI-001, LOG-001
 */
import type { BehaviorLog, QuickLogCategory } from 'types/log';
import type { TrainingProgress, CurriculumId } from 'types/training';

/** 카테고리 한국어 라벨 맵 */
export const CATEGORY_LABELS: Record<string, string> = {
  barking: '짖음/울음',
  biting: '마운팅',
  jumping: '과잉흥분',
  pulling: '배변문제',
  destructive: '파괴행동',
  anxiety: '분리불안',
  aggression: '공격성',
  other_behavior: '공포/회피',
};

/** 기간 필터링 — days 이내 로그만 반환 */
export function filterByPeriod(logs: BehaviorLog[], days: number): BehaviorLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffTime = cutoff.getTime();
  return logs.filter((l) => new Date(l.occurred_at).getTime() >= cutoffTime);
}

/** 카테고리별 빈도 집계 — 내림차순 정렬 */
export function countByCategory(logs: BehaviorLog[]): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const key = log.quick_category ?? log.type_id ?? 'other';
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([key, count]) => ({ label: CATEGORY_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Training Effect ──────────────────────────────────────

/** QuickLogCategory → CurriculumId 매핑 (behaviorToCurriculum.ts 기반) */
const CATEGORY_TO_CURRICULUM: Partial<Record<QuickLogCategory, CurriculumId>> = {
  barking: 'reactivity_management',
  anxiety: 'fear_desensitization',
  aggression: 'socialization',
  destructive: 'impulse_control',
  jumping: 'basic_obedience',
  pulling: 'leash_manners',
};

/** CurriculumId → 대응하는 QuickLogCategory[] 역매핑 */
const CURRICULUM_TO_CATEGORIES: Partial<Record<CurriculumId, QuickLogCategory[]>> = {};
for (const [cat, cur] of Object.entries(CATEGORY_TO_CURRICULUM)) {
  if (!CURRICULUM_TO_CATEGORIES[cur]) CURRICULUM_TO_CATEGORIES[cur] = [];
  CURRICULUM_TO_CATEGORIES[cur]!.push(cat as QuickLogCategory);
}

/** 커리큘럼 한국어 타이틀 */
const CURRICULUM_TITLES: Record<CurriculumId, string> = {
  basic_obedience: '기본 복종 훈련',
  leash_manners: '산책 매너 훈련',
  separation_anxiety: '분리불안 관리',
  reactivity_management: '반응성 관리 훈련',
  impulse_control: '충동 조절 훈련',
  socialization: '사회화 훈련',
  fear_desensitization: '공포 둔감화 훈련',
};

export interface TrainingEffect {
  curriculumTitle: string;
  behaviorLabel: string;
  beforeCount: number;
  afterCount: number;
  changePercent: number; // 음수 = 감소 (개선)
}

/** 훈련 시작 전/후 행동 로그 비교 → 훈련 효과 계산 */
export function computeTrainingEffects(
  logs: BehaviorLog[],
  trainingProgress: TrainingProgress[],
): TrainingEffect[] {
  const effects: TrainingEffect[] = [];

  for (const progress of trainingProgress) {
    if (progress.status === 'not_started') continue;

    const categories = CURRICULUM_TO_CATEGORIES[progress.curriculum_id];
    if (!categories || categories.length === 0) continue;

    const startTime = new Date(progress.started_at).getTime();
    const now = Date.now();
    const elapsedDays = Math.floor((now - startTime) / 86400000);
    const windowDays = Math.min(elapsedDays, 14);
    if (windowDays < 1) continue;

    const windowMs = windowDays * 86400000;

    // before: 훈련 시작 전 windowDays 동안의 로그
    const beforeStart = startTime - windowMs;
    const beforeLogs = logs.filter((l) => {
      const t = new Date(l.occurred_at).getTime();
      return t >= beforeStart && t < startTime && categories.includes(l.quick_category as QuickLogCategory);
    });

    // after: 훈련 시작 후 windowDays 동안의 로그
    const afterEnd = startTime + windowMs;
    const afterLogs = logs.filter((l) => {
      const t = new Date(l.occurred_at).getTime();
      return t >= startTime && t < afterEnd && categories.includes(l.quick_category as QuickLogCategory);
    });

    // 최소 표본: beforeCount ≥ 2
    if (beforeLogs.length < 2) continue;

    const changePercent = beforeLogs.length === 0
      ? 0
      : Math.round(((afterLogs.length - beforeLogs.length) / beforeLogs.length) * 100);

    const behaviorLabels = categories.map((c) => CATEGORY_LABELS[c] ?? c).join('/');

    effects.push({
      curriculumTitle: CURRICULUM_TITLES[progress.curriculum_id] ?? progress.curriculum_id,
      behaviorLabel: behaviorLabels,
      beforeCount: beforeLogs.length,
      afterCount: afterLogs.length,
      changePercent,
    });
  }

  return effects;
}

// ── Share Text Builder ───────────────────────────────────

export function buildAnalysisShareText(params: {
  dogName: string;
  periodLabel: string;
  totalLogs: number;
  topBehavior: { label: string; count: number } | null;
  trainingEffect: TrainingEffect | null;
}): string {
  const lines = [
    `[꼬리일기] ${params.dogName} 행동 분석 리포트`,
    `기간: ${params.periodLabel}`,
    `총 기록: ${params.totalLogs}건`,
  ];

  if (params.topBehavior) {
    lines.push(`가장 많은 행동: ${params.topBehavior.label} (${params.topBehavior.count}회)`);
  }

  if (params.trainingEffect) {
    const { behaviorLabel, changePercent } = params.trainingEffect;
    const direction = changePercent <= 0 ? '감소' : '증가';
    lines.push(`훈련 효과: ${behaviorLabel} ${Math.abs(changePercent)}% ${direction}`);
  }

  lines.push('');
  lines.push('꼬리일기에서 우리 강아지 행동을 분석해보세요');

  return lines.join('\n');
}

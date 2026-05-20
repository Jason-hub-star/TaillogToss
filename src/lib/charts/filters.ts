/**
 * 분석 필터 유틸 — 기간 필터 + 카테고리 집계 + 훈련 효과 + 공유 텍스트
 * analysis.tsx에서 추출
 * Parity: UI-001, LOG-001
 */
import type { BehaviorLog, QuickLogCategory } from 'types/log';
import type { DogEnv } from 'types/dog';
import type { TrainingProgress, CurriculumId } from 'types/training';
import { getOccurrenceCount } from 'lib/logOccurrence';

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
  walk: '산책',
  meal: '식사',
  training: '훈련',
  play: '놀이',
  rest: '휴식',
  grooming: '미용',
  other: '기타',
};

/** 기간 필터링 — days 이내 로그만 반환 */
export function filterByPeriod(logs: BehaviorLog[], days: number): BehaviorLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffTime = cutoff.getTime();
  return logs.filter((l) => new Date(l.occurred_at).getTime() >= cutoffTime);
}

/** 카테고리별 빈도 집계 — 내림차순 정렬 */
export function countByCategory(logs: BehaviorLog[]): { key: string; label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const key = log.quick_category ?? log.daily_activity ?? log.type_id ?? 'other';
    counts[key] = (counts[key] ?? 0) + getOccurrenceCount(log);
  }

  return Object.entries(counts)
    .map(([key, count]) => ({ key, label: CATEGORY_LABELS[key] ?? (key === 'manual' ? '직접 기록' : '기타'), count }))
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

const LIVING_TYPE_LABELS: Record<string, string> = {
  apartment: '아파트',
  house: '주택',
  villa: '빌라',
  other: '기타',
};

const TRIGGER_LABELS: Record<string, string> = {
  other_dogs: '다른 개',
  strangers: '낯선 사람',
  loud_noises: '큰 소리',
  children: '어린이',
  cars: '자동차',
  bicycles: '자전거',
  cats: '고양이',
  thunderstorm: '천둥·번개',
  fireworks: '불꽃놀이',
  visitors: '방문객',
  alone: '혼자 있을 때',
  leash: '리드줄',
  vacuum: '청소기',
  doorbell: '초인종',
  other: '기타',
};

const HEALTH_LABELS: Record<string, string> = {
  anxiety: '불안',
  arthritis: '관절염',
  diabetes: '당뇨',
  epilepsy: '간질',
  heart_disease: '심장병',
  kidney_disease: '신장병',
  allergy: '알레르기',
  obesity: '비만',
  skin_condition: '피부질환',
  dental_disease: '치주질환',
  other: '기타',
};

function localizeList(items: string[], labelMap: Record<string, string>): string[] {
  return items.map((v) => labelMap[v] ?? v);
}

export function buildAnalysisShareText(params: {
  dogName: string;
  periodLabel: string;
  totalLogs: number;
  topBehaviors: { label: string; count: number }[];
  trainingEffects: TrainingEffect[];
  peakHour: string | null;
  dogEnv: DogEnv | null;
}): string {
  const lines: string[] = [];

  lines.push(`${params.dogName} 행동 분석 · ${params.periodLabel}`);
  lines.push(`총 ${params.totalLogs}회 기록됐어요`);

  if (params.topBehaviors.length > 0) {
    lines.push('');
    lines.push('[주요 행동]');
    params.topBehaviors.slice(0, 3).forEach((b, i) => {
      lines.push(`${i + 1}. ${b.label} ${b.count}회`);
    });
  }

  const env = params.dogEnv;
  if (env) {
    lines.push('');
    lines.push('[생활 환경]');
    const hh = env.household_info;
    const envParts: string[] = [];
    if (hh.members_count) envParts.push(`${hh.members_count}인 가족`);
    if (hh.has_children) envParts.push('어린이 있음');
    if (hh.has_other_pets) envParts.push('다른 반려동물 있음');
    if (hh.living_type) envParts.push(LIVING_TYPE_LABELS[hh.living_type] ?? hh.living_type);
    if (envParts.length > 0) lines.push(envParts.join(' · '));

    const act = env.activity_meta;
    if (act) {
      const actParts: string[] = [];
      if (act.daily_walk_minutes) actParts.push(`하루 산책 ${act.daily_walk_minutes}분`);
      const levelLabel = act.exercise_level === 'low' ? '낮음' : act.exercise_level === 'high' ? '높음' : '보통';
      actParts.push(`운동량 ${levelLabel}`);
      lines.push(actParts.join(' · '));
    }

    if (env.triggers.length > 0) {
      const triggerLabels = localizeList(env.triggers.slice(0, 3), TRIGGER_LABELS);
      lines.push(`주요 트리거: ${triggerLabels.join(', ')}`);
    }

    lines.push('');
    lines.push('[건강]');
    const hm = env.health_meta;
    const healthParts: string[] = [];
    if (hm.chronic_issues.length > 0) {
      const issues = localizeList(hm.chronic_issues, HEALTH_LABELS);
      healthParts.push(`만성질환: ${issues.join(', ')}`);
    }
    if (hm.medications.length > 0) healthParts.push(`복용약: ${hm.medications.join(', ')}`);
    if (hm.vet_notes) healthParts.push(`수의사 메모: ${hm.vet_notes}`);
    lines.push(healthParts.length > 0 ? healthParts.join('\n') : '특이사항 없음');
  }

  if (params.trainingEffects.length > 0) {
    lines.push('');
    lines.push('[훈련 현황]');
    params.trainingEffects.slice(0, 3).forEach((e) => {
      const dir = e.changePercent <= 0 ? '↓' : '↑';
      lines.push(`${e.curriculumTitle} · ${e.behaviorLabel} ${dir}${Math.abs(e.changePercent)}%`);
    });
  }

  if (params.peakHour) {
    lines.push('');
    lines.push('[피크 시간]');
    lines.push(params.peakHour);
  }

  lines.push('');
  lines.push('테일로그에서 더 자세히 확인해보세요');

  return lines.join('\n');
}

/** 코칭 결과 공유 텍스트 빌더 */
export function buildCoachingShareText(params: {
  dogName: string;
  trend: string;
  reportType: string;
  keyPatterns: string[];
  completedCount: number;
  totalCount: number;
}): string {
  const TREND_LABELS: Record<string, string> = {
    improving: '개선 중',
    stable: '유지 중',
    worsening: '주의 필요',
  };
  const REPORT_LABELS: Record<string, string> = {
    DAILY: '일간',
    WEEKLY: '주간',
    INSIGHT: '인사이트',
  };

  const trendLabel = TREND_LABELS[params.trend] ?? params.trend;
  const reportLabel = REPORT_LABELS[params.reportType] ?? params.reportType;
  const patterns = params.keyPatterns.slice(0, 2).join(', ');

  const lines = [
    `🐾 ${params.dogName}의 AI 행동 진단 결과`,
    '',
    `📊 행동 트렌드: ${trendLabel} (${reportLabel} 코칭)`,
  ];

  if (patterns) {
    lines.push(`🔍 주요 패턴: ${patterns}`);
  }

  if (params.totalCount > 0) {
    lines.push(`✅ 실행 계획: ${params.completedCount}/${params.totalCount} 완료`);
  }

  lines.push('');
  lines.push('테일로그에서 AI 코칭을 받아보세요');

  return lines.join('\n');
}

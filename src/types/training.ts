/**
 * 훈련 아카데미 도메인 타입 — 커리큘럼 7종, Plan Variant A/B/C
 * Parity: UI-001
 */

/** 커리큘럼 ID (7종) */
export type CurriculumId =
  | 'basic_obedience'
  | 'leash_manners'
  | 'separation_anxiety'
  | 'reactivity_management'
  | 'impulse_control'
  | 'socialization'
  | 'fear_desensitization';

/** 커리큘럼 접근 상태 */
export type CurriculumAccess = 'free' | 'pro' | 'locked';

/** 커리큘럼 진행 상태 */
export type CurriculumStatus = 'not_started' | 'in_progress' | 'completed';

/** Plan Variant — 난이도/방법 분기 */
export type PlanVariant = 'A' | 'B' | 'C';

/** 커리큘럼 (정적 데이터) */
export interface Curriculum {
  id: CurriculumId;
  title: string;
  description: string;
  access: CurriculumAccess;
  total_days: number; // 5~6일
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  recommended_for: string[]; // BehaviorType 매핑
  days: TrainingDay[];
}

/** 훈련 Day */
export interface TrainingDay {
  day_number: number; // 1~6
  title: string;
  description: string;
  steps: TrainingStep[];
  variant_notes: Record<PlanVariant, string>;
}

/** 훈련 Step (체크리스트 항목) */
export interface TrainingStep {
  id: string;
  order: number;
  instruction: string;
  duration_minutes: number;
  tips: string[];
  variants: Record<PlanVariant, StepVariant>;
}

/** Plan Variant별 Step 조정 */
export interface StepVariant {
  instruction_override: string | null;
  duration_override: number | null;
  difficulty_note: string;
}

/** 강아지 반응 (훈련 후) */
export type DogReaction = 'enjoyed' | 'neutral' | 'sensitive';

/** 반응 옵션 메타 (UI 표시용) */
export interface ReactionOption {
  value: DogReaction;
  emoji: string;
  label: string;
  effect: string;
  color: string;
}

export const REACTION_OPTIONS: ReactionOption[] = [
  {
    value: 'enjoyed',
    emoji: '\u{1F606}',
    label: '재밌어했어요',
    effect: '다음 훈련 난이도가 한 단계 올라가요',
    color: 'successGreen',
  },
  {
    value: 'neutral',
    emoji: '\u{1F610}',
    label: '평소와 같아요',
    effect: '현재 난이도를 유지하며 반복 훈련해요',
    color: 'warningAmber',
  },
  {
    value: 'sensitive',
    emoji: '\u{1F623}',
    label: '여전히 예민해요',
    effect: '다음 훈련이 더 부드럽게 조정돼요',
    color: 'errorRed',
  },
];

/** 커리큘럼 레벨 인사이트 (computed, Phase 5용 준비) */
export interface CurriculumInsight {
  curriculum_id: CurriculumId;
  total_attempted: number;
  total_completed: number;
  reaction_distribution: Record<DogReaction, number>;
}

/** 커리큘럼 쇼케이스 메타데이터 */
export interface CurriculumShowcase {
  id: CurriculumId;
  tagline: string;
  target_behaviors: string[];
  preview_steps: string[];
  image_url: string | null;
}

/** 사용자의 훈련 진행 상태 */
export interface TrainingProgress {
  id: string;
  dog_id: string;
  curriculum_id: CurriculumId;
  current_day: number;
  current_variant: PlanVariant;
  status: CurriculumStatus;
  completed_steps: string[]; // step IDs
  memo: string | null;
  started_at: string;
  updated_at: string;
}

/** 스텝별 피드백 (user_training_status.reaction) */
export interface StepFeedback {
  step_id: string;
  curriculum_id: CurriculumId;
  day: number;
  step_number: number;
  reaction: DogReaction;
  memo: string | null;
}

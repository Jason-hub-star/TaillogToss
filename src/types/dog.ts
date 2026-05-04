/**
 * 반려견 도메인 타입 — DogCoach dog.py 마이그레이션 + 7단계 설문
 * Parity: APP-001
 */

/** 반려견 성별 */
export type DogSex = 'MALE' | 'FEMALE' | 'MALE_NEUTERED' | 'FEMALE_NEUTERED';

/** 반려견 기본 정보 */
export interface Dog {
  id: string; // UUID
  user_id: string; // FK → users.id
  name: string;
  breed: string;
  birth_date: string | null; // ISO date
  sex: DogSex;
  weight_kg?: number; // NUMERIC(5,2) — 체중(kg), 프로필 완전성용
  profile_image_url: string | null;
  /** B2B 센터 등록 시 수집 (선택) */
  vet_name?: string | null;
  animal_reg_no?: string | null;
  parent_address?: string | null;
  created_at: string;
  updated_at: string;
}

/** 온보딩 설문 step3 행동 문제 목록 — dog_env.chronic_issues JSONB 구조 */
export interface ChronicIssues {
  top_issues: string[];
  other_text?: string | null;
}

/** 반려견 환경/맥락 (DogEnv — JSONB 필드 분리) */
export interface DogEnv {
  id: string;
  dog_id: string; // FK → dogs.id
  household_info: HouseholdInfo;
  health_meta: HealthMeta;
  triggers: string[];
  past_attempts: string[];
  temperament: string | null;
  activity_meta: ActivityMeta;
  chronic_issues?: ChronicIssues | null; // 설문 step3 행동 문제 (DB 영구 저장)
  rewards_meta?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface HouseholdInfo {
  members_count: number;
  has_children: boolean;
  has_other_pets: boolean;
  living_type: 'apartment' | 'house' | 'villa' | 'other';
}

export interface HealthMeta {
  chronic_issues: string[];
  medications: string[];
  vet_notes: string | null;
}

export interface ActivityMeta {
  daily_walk_minutes: number;
  exercise_level: 'low' | 'medium' | 'high';
  favorite_activities: string[];
}

// ──────────────────────────────────────
// 온보딩 설문 (Survey 2.0 - 4단계 확장)
// ──────────────────────────────────────

/** 설문 전체 데이터 */
export interface SurveyData {
  step1_basic: SurveyStep1;
  step2_environment: SurveyStep2;
  step3_behavior: SurveyStep3;
  step4_triggers: SurveyStep4;
  step5_history: SurveyStep5;
  step6_goals: SurveyStep6;
  step7_preferences: SurveyStep7; // Step 3 Deep Dive (기질/보상)
  step8_health_context: SurveyStep8; // Step 4 (건강/환경 스트레스)
}

/** Step 1: 기본 정보 (이름, 품종, 나이, 성별, 사진) */
export interface SurveyStep1 {
  name: string;
  breed: string;
  age_months: number;
  sex: DogSex;
  profile_image_url?: string; // S3/Supabase Storage URL
}

/** Step 2: 생활 환경 */
export interface SurveyStep2 {
  household: HouseholdInfo;
  daily_alone_hours: number;
}

/** Step 3: 주요 행동 문제 (최대 3개 선택) */
export interface SurveyStep3 {
  primary_behaviors: BehaviorType[];
  severity: Record<BehaviorType, 1 | 2 | 3 | 4 | 5>;
  other_behavior_desc?: string; // 주관식 고민 설명
}

/** Step 4: 트리거/상황 */
export interface SurveyStep4 {
  triggers: string[];
  worst_time: 'morning' | 'afternoon' | 'evening' | 'night' | 'random';
  custom_trigger?: string; // 직접 입력한 상황
}

/** Step 5: 과거 시도 */
export interface SurveyStep5 {
  past_attempts: string[];
  professional_help: boolean;
}

/** Step 6: 목표 설정 */
export interface SurveyStep6 {
  goals: string[];
  priority_behavior: BehaviorType;
}

/** Step 7: AI Deep Dive (기질 및 보상 데이터) */
export interface SurveyStep7 {
  energy_score: number; // 1-5
  social_score: number; // 1-5
  mastered_commands: string[]; // sit, stay 등
  rewards: {
    treats: number; // 간식 선호도 1-5
    play: number; // 놀이 선호도 1-5
    praise: number; // 칭찬 선호도 1-5
  };
  notification_consent: boolean;
}

/** Step 8: 건강 및 세부 환경 스트레스 (신규) */
export interface SurveyStep8 {
  health: {
    has_pain: boolean; // 관절 등 통증 여부
    has_allergy: boolean; // 알러지 여부
    is_overweight: boolean; // 과체중 여부
    notes: string; // 기타 건강 특이사항
  };
  environment_stress: {
    noise_sensitivity: number; // 소음 예민도 1-5
    visitor_frequency: 'rare' | 'sometimes' | 'frequent'; // 방문객 빈도
    walk_environment: 'quiet' | 'normal' | 'busy'; // 산책로 혼잡도
  };
}

/** 행동 유형 분류 */
export type BehaviorType =
  | 'aggression'
  | 'anxiety'
  | 'barking'
  | 'destructive'
  | 'reactivity'
  | 'separation'
  | 'resource_guarding'
  | 'leash_pulling'
  | 'jumping'
  | 'other';

/** 설문 결과 분석 */
export interface SurveyResult {
  behavior_type_badge: BehaviorType;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number; // 0-100
  summary: string;
  recommended_curriculum_id: string | null;
}

// ──────────────────────────────────────
// Progressive Profiling (Stage 1/2/3)
// ──────────────────────────────────────

/** Stage 1 — 최초 진입 필수 */
export interface SurveyStage1Request {
  name: string;
  breed?: string;
  birth_date?: string | null; // ISO date 'YYYY-MM-DD'
  sex?: DogSex | null;
  weight_kg?: number | null;
  profile_image_url?: string | null;
}

/** Stage 2 — 행동/환경 */
export interface SurveyStage2Request {
  household_info: {
    members_count?: number;
    has_children: boolean;
    has_other_pets: boolean;
    living_type?: 'apartment' | 'house' | 'villa' | 'other';
  };
  chronic_issues: { top_issues: string[]; other_text?: string };
  triggers: { ids: string[]; other_text?: string };
  antecedents: { ids: string[] };
  past_attempts: { ids: string[]; other_text?: string };
  activity_meta?: { walk_frequency?: string; walk_duration_minutes?: number };
  rewards_meta?: { ids: string[] };
}

/** Stage 3 — 기질/건강 */
export interface SurveyStage3Request {
  temperament: {
    sensitivity_score?: number;
    energy_level?: number;
    env_reaction?: string;
    person_reaction?: string;
    dog_reaction?: string;
    focus_level?: string;
    attach_level?: string;
  };
  health_meta: { chronic_issues: string[]; medications: string[]; vet_notes?: string };
  activity_meta: { daily_walk_minutes: number; exercise_level?: string };
  rewards_meta: { ids: string[] };
}

/** 설문 완성도 응답 */
export interface SurveyStatus {
  dog_id: string;
  completion_stage: 1 | 2 | 3;
  completion_percentage: 25 | 60 | 100;
  locked_features: string[];
  stage1_completed_at: string | null;
  stage2_completed_at: string | null;
  stage3_completed_at: string | null;
}

/** Dog 생성 응답 (Stage 1 반환) */
export interface DogCreateResponse {
  id: string;
  name: string;
  breed: string | null;
  created_at: string;
}

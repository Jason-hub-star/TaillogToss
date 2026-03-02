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
  created_at: string;
  updated_at: string;
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
// 설문 7단계 (Survey)
// ──────────────────────────────────────

/** 설문 전체 데이터 */
export interface SurveyData {
  step1_basic: SurveyStep1;
  step2_environment: SurveyStep2;
  step3_behavior: SurveyStep3;
  step4_triggers: SurveyStep4;
  step5_history: SurveyStep5;
  step6_goals: SurveyStep6;
  step7_preferences: SurveyStep7;
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
}

/** Step 4: 트리거/상황 */
export interface SurveyStep4 {
  triggers: string[];
  worst_time: 'morning' | 'afternoon' | 'evening' | 'night' | 'random';
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

/** Step 7: AI 코칭 선호도 */
export interface SurveyStep7 {
  ai_tone: 'empathetic' | 'solution';
  ai_perspective: 'coach' | 'dog';
  notification_consent: boolean;
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

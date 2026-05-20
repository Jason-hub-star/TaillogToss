/**
 * AI 코칭 도메인 타입 — 6블록 구조, DogCoach coaching.py 확장
 * Parity: AI-001
 */

/** 코칭 리포트 유형 */
export type ReportType = 'DAILY' | 'WEEKLY' | 'INSIGHT';

/** AI 코칭 결과 — 6블록 구조 */
export interface CoachingResult {
  id: string; // UUID
  dog_id: string; // FK → dogs.id
  report_type: ReportType;

  /** 6블록 (무료 3 + PRO 3) */
  blocks: CoachingBlocks;

  feedback_score: 1 | 2 | 3 | 4 | 5 | null;
  ai_tokens_used: number;
  created_at: string;
  /** 행동 분석 메타데이터 (AI 생성 시만 포함) */
  analytics_metadata?: {
    log_count: number;
    analysis_days: number;
    top_behavior: string | null;
  } | null;
}

export type CoachingGenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface CoachingGenerationJob {
  job_id: string;
  status: CoachingGenerationStatus;
  dog_id: string;
  report_type: ReportType;
  coaching_id: string | null;
  coaching: CoachingResult | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
}

/** 코칭 6블록 구조 */
export interface CoachingBlocks {
  /** Block 1 (무료): 행동 분석 인사이트 */
  insight: InsightBlock;
  /** Block 2 (무료): 실행 계획 */
  action_plan: ActionPlanBlock;
  /** Block 3 (무료): 강아지 시점 메시지 */
  dog_voice: DogVoiceBlock;
  /** Block 4 (PRO): 7일 맞춤 플랜 */
  next_7_days: Next7DaysBlock;
  /** Block 5 (PRO): 위험 신호 분석 */
  risk_signals: RiskSignalsBlock;
  /** Block 6 (PRO): 전문가 상담 질문 추천 */
  consultation_questions: ConsultationQuestionsBlock;
}

/** Block 1: 행동 분석 인사이트 */
export interface InsightBlock {
  title: string;
  summary: string;
  key_patterns: string[];
  trend: 'improving' | 'stable' | 'worsening';
}

/** Block 2: 실행 계획 */
export interface ActionPlanBlock {
  title: string;
  items: ActionItem[];
}

export interface ActionItem {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  is_completed: boolean;
  technique?: string;
  psychological_principle?: string;
  tools?: string[];
  environment_setup?: string;
  steps?: string[];
  success_criteria?: string;
  stop_criteria?: string;
  plan_b?: string;
  plan_c?: string;
  evidence_from_intake?: string;
  reference_curriculum_ids?: string[];
}

/** Block 3: 강아지 시점 메시지 (SpeechBubble) */
export interface DogVoiceBlock {
  message: string;
  emotion: 'happy' | 'anxious' | 'confused' | 'hopeful' | 'tired';
}

/** Block 4: 7일 맞춤 플랜 (PRO) */
export interface Next7DaysBlock {
  days: DayPlan[];
}

export interface DayPlan {
  day_number: number; // 1-7
  focus: string;
  tasks: string[];
  session_duration_minutes?: number;
  environment?: string;
  tools?: string[];
  progression_rule?: string;
  reference_curriculum_ids?: string[];
}

/** Block 5: 위험 신호 분석 (PRO) */
export interface RiskSignalsBlock {
  signals: RiskSignal[];
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskSignal {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

/** Block 6: 전문가 상담 질문 추천 (PRO) */
export interface ConsultationQuestionsBlock {
  questions: string[];
  recommended_specialist: 'behaviorist' | 'trainer' | 'vet' | null;
}

/** 코칭 액션 추적 */
export interface ActionTracker {
  id: string;
  coaching_id: string; // FK → coaching_results.id
  action_item_id: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

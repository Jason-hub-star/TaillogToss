/**
 * B2B 확장 도메인 타입 — SCHEMA-B2B.md 기반 10 인터페이스 + enum 타입
 * Parity: B2B-001
 */

// ──────────────────────────────────────
// Enum / Union Types
// ──────────────────────────────────────

/** 조직 유형 (4종) */
export type OrgType = 'daycare' | 'hotel' | 'training_center' | 'hospital';

/** 조직 상태 */
export type OrgStatus = 'active' | 'suspended' | 'trial';

/** 조직 멤버 역할 (4종) */
export type OrgMemberRole = 'owner' | 'manager' | 'staff' | 'viewer';

/** 조직 멤버 상태 */
export type OrgMemberStatus = 'pending' | 'active' | 'deactivated';

/** 조직 소속 강아지 상태 */
export type OrgDogStatus = 'active' | 'discharged' | 'temporary';

/** 담당 배정 역할 */
export type DogAssignmentRole = 'primary' | 'assistant';

/** 담당 배정 상태 */
export type DogAssignmentStatus = 'active' | 'ended';

/** 리포트 템플릿 유형 */
export type ReportTemplateType =
  | 'hotel'
  | 'daycare_general'
  | 'training_focus'
  | 'problem_behavior';

/** 리포트 생성 상태 */
export type ReportStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'failed'
  | 'sent';

/** 보호자 인터랙션 유형 */
export type InteractionType = 'like' | 'question' | 'comment' | 'goal_request';

/** B2B 구독 플랜 (6종) */
export type OrgPlanType =
  | 'center_basic'
  | 'center_pro'
  | 'center_enterprise'
  | 'trainer_10'
  | 'trainer_30'
  | 'trainer_50';

/** B2B 구독 상태 */
export type OrgSubscriptionStatus =
  | 'active'
  | 'trial'
  | 'expired'
  | 'cancelled'
  | 'suspended'
  | 'refunded';

// ──────────────────────────────────────
// 1. organizations — 센터 마스터
// ──────────────────────────────────────

/** 조직 */
export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  owner_user_id: string; // FK → users.id
  logo_url: string | null;
  business_number: string | null; // 사업자등록번호 (UNIQUE)
  phone: string | null;
  address: string | null;
  max_dogs: number; // default 30
  max_staff: number; // default 5
  settings: Record<string, unknown>;
  status: OrgStatus;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────
// 2. org_members — 조직 멤버
// ──────────────────────────────────────

/** 조직 멤버 */
export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  invited_at: string;
  accepted_at: string | null;
}

// ──────────────────────────────────────
// 3. org_dogs — 조직 관리 강아지
// ──────────────────────────────────────

/** 조직 소속 반려견 */
export interface OrgDog {
  id: string;
  org_id: string;
  dog_id: string;
  parent_user_id: string | null;
  parent_name: string | null;
  /** 보호자 전화번호 뒷 4자리 (명문, 인증 전용) */
  parent_phone_last4: string | null;
  group_tag: string; // default 'default'
  enrolled_at: string;
  discharged_at: string | null;
  status: OrgDogStatus;
}

// ──────────────────────────────────────
// 4. dog_assignments — 담당자 배정
// ──────────────────────────────────────

/** 담당자 배정 (센터 직원 + 개인 훈련사 공통) */
export interface DogAssignment {
  id: string;
  dog_id: string;
  org_id: string | null; // NULL이면 개인 훈련사 워크스페이스
  trainer_user_id: string;
  role: DogAssignmentRole;
  assigned_at: string;
  ended_at: string | null;
  status: DogAssignmentStatus;
}

// ──────────────────────────────────────
// 5. daily_reports — 자동 리포트
// ──────────────────────────────────────

/** 일일 리포트 */
export interface DailyReport {
  id: string;
  dog_id: string;
  report_date: string; // ISO date (YYYY-MM-DD)
  template_type: ReportTemplateType;
  // 생성 주체: split FK (XOR — 정확히 하나만 non-null)
  created_by_org_id: string | null;
  created_by_trainer_id: string | null;
  // AI 콘텐츠
  behavior_summary: string | null;
  condition_notes: string | null;
  ai_coaching_oneliner: string | null;
  seven_day_comparison: Record<string, unknown> | null;
  highlight_photo_urls: string[];
  // 상태
  generation_status: ReportStatus;
  ai_model: string | null;
  ai_cost_usd: number | null;
  generated_at: string | null;
  scheduled_send_at: string | null;
  sent_at: string | null;
  // 보호자 접근
  share_token: string | null;
  toss_share_url: string | null;
  expires_at: string | null;
  created_at: string;
}

export type PublicDailyReport = Pick<
  DailyReport,
  | 'id'
  | 'dog_id'
  | 'report_date'
  | 'template_type'
  | 'behavior_summary'
  | 'condition_notes'
  | 'ai_coaching_oneliner'
  | 'seven_day_comparison'
  | 'highlight_photo_urls'
  | 'generation_status'
  | 'sent_at'
  | 'expires_at'
  | 'created_at'
>;

// ──────────────────────────────────────
// 6. parent_interactions — 보호자 리액션/질문
// ──────────────────────────────────────

/** 보호자 인터랙션 */
export interface ParentInteraction {
  id: string;
  report_id: string;
  parent_user_id: string | null;
  parent_identifier: string | null; // 비토스 보호자 식별자
  interaction_type: InteractionType;
  content: string | null;
  linked_log_id: string | null;
  staff_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  read_by_staff: boolean;
  created_at: string;
}

// ──────────────────────────────────────
// 7. org_analytics_daily — 운영 통계 집계
// ──────────────────────────────────────

/** 조직 일일 통계 */
export interface OrgAnalyticsDaily {
  id: string;
  org_id: string;
  analytics_date: string; // ISO date
  group_tag: string | null;
  total_dogs: number;
  avg_activity_score: number;
  aggression_incident_count: number;
  total_behavior_logs: number;
  report_open_rate: number; // 0~1
  reaction_rate: number; // 0~1
  question_count: number;
  record_completion_rate: number; // 0~1
  created_at: string;
}

// ──────────────────────────────────────
// 8. org_subscriptions — B2B 구독 (토스 IAP)
// ──────────────────────────────────────

/** B2B 구독 */
export interface OrgSubscription {
  id: string;
  org_id: string | null; // XOR with trainer_user_id
  trainer_user_id: string | null; // XOR with org_id
  plan_type: OrgPlanType;
  toss_order_id: string | null;
  price_krw: number;
  max_dogs: number;
  max_staff: number; // default 1
  billing_cycle: string; // default 'monthly'
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  suspend_reason: string | null;
  retry_count: number;
  status: OrgSubscriptionStatus;
  created_at: string;
}

// ──────────────────────────────────────
// 9. ai_cost_usage_org — 조직/훈련사별 AI 비용
// ──────────────────────────────────────

/** 조직/훈련사 AI 비용 사용량 */
export interface AiCostUsageOrg {
  id: string;
  org_id: string | null; // XOR with trainer_user_id
  trainer_user_id: string | null; // XOR with org_id
  usage_date: string; // ISO date
  report_generation_calls: number;
  report_generation_cost_usd: number;
  coaching_calls: number;
  coaching_cost_usd: number;
  budget_limit_usd: number | null;
}

// ──────────────────────────────────────
// 10. org_dogs_pii — 보호자 PII 격리 저장소
// ──────────────────────────────────────

/** 보호자 PII (암호화, RPC 전용 접근) */
export interface OrgDogPii {
  org_dog_id: string; // PK, FK → org_dogs.id
  parent_phone_enc: string | null; // BYTEA (base64 encoded in app)
  parent_email_enc: string | null; // BYTEA (base64 encoded in app)
  encryption_key_version: number;
  updated_at: string;
}

// ──────────────────────────────────────
// B2B IAP 상품 정의
// ──────────────────────────────────────

import type { IAPProduct } from './subscription';

/** B2B IAP 상품 카탈로그 (가격 기준일: 2026-02-26) */
export const B2B_IAP_PRODUCTS: Record<OrgPlanType, IAPProduct> = {
  center_basic: {
    product_id: 'center_basic',
    name: '센터 Basic',
    price: 29000,
    type: 'non_consumable',
    description: '최대 30마리 + 직원 5명 + 일일 리포트',
  },
  center_pro: {
    product_id: 'center_pro',
    name: '센터 Pro',
    price: 59000,
    type: 'non_consumable',
    description: '최대 60마리 + 직원 10명 + AI 리포트 + 통계',
  },
  center_enterprise: {
    product_id: 'center_enterprise',
    name: '센터 Enterprise',
    price: 99000,
    type: 'non_consumable',
    description: '최대 100마리+ + 직원 20명 + 전체 기능',
  },
  trainer_10: {
    product_id: 'trainer_10',
    name: '훈련사 Lite',
    price: 9900,
    type: 'non_consumable',
    description: '최대 10마리 + 일일 리포트',
  },
  trainer_30: {
    product_id: 'trainer_30',
    name: '훈련사 Standard',
    price: 19900,
    type: 'non_consumable',
    description: '최대 30마리 + AI 리포트 + 통계',
  },
  trainer_50: {
    product_id: 'trainer_50',
    name: '훈련사 Pro',
    price: 39900,
    type: 'non_consumable',
    description: '최대 50마리 + 전체 기능',
  },
} as const;

/** B2B 플랜별 한도 */
export const B2B_PLAN_LIMITS: Record<OrgPlanType, { maxDogs: number; maxStaff: number }> = {
  center_basic: { maxDogs: 30, maxStaff: 5 },
  center_pro: { maxDogs: 60, maxStaff: 10 },
  center_enterprise: { maxDogs: 100, maxStaff: 20 },
  trainer_10: { maxDogs: 10, maxStaff: 1 },
  trainer_30: { maxDogs: 30, maxStaff: 1 },
  trainer_50: { maxDogs: 50, maxStaff: 1 },
} as const;

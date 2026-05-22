/**
 * 구독/결제 도메인 타입 — Toss IAP, DogCoach payment.py 마이그레이션
 * Parity: IAP-001
 * 가격 기준일: 2026-05-19
 */

/** 플랜 유형 (B2C) */
export type PlanType = 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY';

/** B2C + B2B 통합 플랜 유형 */
export type AllPlanType = PlanType | import('./b2b').OrgPlanType;

/** IAP 상품 유형 */
export type ProductType = 'non_consumable' | 'consumable';

/** Toss IAP 상품 정의 */
export interface IAPProduct {
  product_id: string;
  name: string;
  price: number; // KRW, 사용자 결제 판매가 = 콘솔 공급가 × 1.1
  type: ProductType;
  description: string;
  console_supply_price?: number; // Toss IAP 콘솔 입력가
  list_price?: number; // 앱 내 기준가/정가 표시용
  promotion_label?: string;
  unit_count?: number;
}

/**
 * IAP 상품 카탈로그
 * 가격 기준일: 2026-05-19 (프로모션 콘솔가 반영)
 * 판매가 = 공급가 × 1.1 (VAT 10%)
 *
 * 다음 가격 변경 시 이 객체만 바꾸면 구독 화면/업그레이드 시트가 함께 갱신된다.
 */
export const IAP_PRODUCTS: Record<string, IAPProduct> = {
  PRO_MONTHLY: {
    product_id: 'ait.0000020829.09e69bf9.90a91624b0.7443236299',
    name: '테일로그 PRO',
    price: 7920,          // 콘솔 공급가 7,200 × 1.1
    type: 'non_consumable',
    console_supply_price: 7200,
    list_price: 10000,
    promotion_label: '런칭 특가',
    description: 'AI 코칭 하루 10회 + 상담지 기반 정밀 코칭 + 전체 커리큘럼',
  },
  AI_TOKEN_10: {
    product_id: 'ait.0000020829.b0b00d71.17c5290dc1.7444362301',
    name: 'AI 코칭 토큰 10회',
    price: 2750,          // 콘솔 공급가 2,500 × 1.1
    type: 'consumable',
    console_supply_price: 2500,
    list_price: 4000,
    promotion_label: '런칭가',
    unit_count: 10,
    description: 'AI 행동 분석 코칭 10회 이용권',
  },
  AI_TOKEN_30: {
    product_id: 'ait.0000020829.32dc32cf.49e67a4cfa.7443541064',
    name: 'AI 코칭 토큰 30회',
    price: 6600,          // 콘솔 공급가 6,000 × 1.1
    type: 'consumable',
    console_supply_price: 6000,
    list_price: 10000,
    promotion_label: '추천 특가',
    unit_count: 30,
    description: 'AI 행동 분석 코칭 30회 이용권 (회당 220원)',
  },
} as const;

export function formatKRW(value: number): string {
  return `₩${value.toLocaleString()}`;
}

export function getDiscountPercent(product: Pick<IAPProduct, 'price' | 'list_price'>): number | null {
  if (!product.list_price || product.list_price <= product.price) return null;
  return Math.round((1 - product.price / product.list_price) * 100);
}

export function getUnitPrice(product: Pick<IAPProduct, 'price' | 'unit_count'>): number | null {
  if (!product.unit_count || product.unit_count <= 0) return null;
  return Math.floor(product.price / product.unit_count);
}

/** 멀티독 제한 */
export const DOG_LIMITS = {
  FREE: 1,
  PRO: 5,
} as const;

/** 구독 정보 */
export type EffectiveProSource = 'paid_subscription' | 'pro_day_pass' | null;

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: PlanType;
  is_active: boolean;
  ai_tokens_remaining: number;
  ai_tokens_total: number;
  next_billing_date: string | null; // ISO date
  created_at: string;
  updated_at: string;
  effective_is_pro: boolean;
  effective_pro_source: EffectiveProSource;
  effective_pro_expires_at: string | null;
}

// ──────────────────────────────────────
// Toss Order (2축 상태 패턴)
// ──────────────────────────────────────

/** Toss 주문 상태 (6종) */
export type TossOrderStatus =
  | 'PURCHASED'
  | 'PAYMENT_COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'ORDER_IN_PROGRESS'
  | 'NOT_FOUND';

/** 내부 지급 상태 (5종) */
export type GrantStatus =
  | 'pending'
  | 'granted'
  | 'grant_failed'
  | 'refund_requested'
  | 'refunded';

/** Toss 주문 레코드 */
export interface TossOrder {
  id: string;
  user_id: string;
  product_id: string;
  idempotency_key: string; // UNIQUE
  toss_status: TossOrderStatus;
  grant_status: GrantStatus;
  amount: number; // KRW
  toss_order_id: string | null;
  error_code: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

/** IAP 구매 요청 DTO */
export interface PurchaseRequest {
  productId?: string;
  product_id: string;
  orderId?: string;
  order_id?: string;
  transactionId?: string;
  transaction_id?: string;
  idempotencyKey?: string;
  idempotency_key: string;
}

/** IAP 구매 결과 DTO */
export interface PurchaseResult {
  order: TossOrder;
  subscription: Subscription;
}

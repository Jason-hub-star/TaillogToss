/**
 * 도메인별 Query 정책 — 즉시표시 캐시 + 불필요한 refetch 감소
 * Parity: APP-001
 */

export const STALE_TIME_LONG = 10 * 60 * 1000; // 10분: 설정/저변동 읽기 데이터
export const STALE_TIME_DEFAULT = 5 * 60 * 1000; // 5분: 강아지/코칭/분석
export const STALE_TIME_SHORT = 1 * 60 * 1000; // 1분: 로그/대시보드
export const STALE_TIME_ACTIVE = 30 * 1000; // 30초: 훈련 진행 중

export const GC_TIME_LONG = 60 * 60 * 1000; // 1시간
export const GC_TIME_DEFAULT = 30 * 60 * 1000; // 30분
export const GC_TIME_SHORT = 10 * 60 * 1000; // 10분

export const PERSIST_MAX_AGE = 12 * 60 * 60 * 1000; // 12시간
export const QUERY_CACHE_OWNER_KEY = 'taillog:query-cache-owner';

export const LOG_LIMIT_DASHBOARD = 20;
export const LOG_LIMIT_ANALYSIS = 200;
export const LOG_LIMIT_DEFAULT = 100;
export const LOG_LIMIT_DAILY = LOG_LIMIT_ANALYSIS;
export const LOG_LIMIT_ORG = 50;
export const LOG_LIMIT_ORG_BACKEND_MULTIPLIER = 2;

export const APP_BACKGROUND_REFETCH_THRESHOLD_MS = 5_000;
export const POST_PAINT_BOOTSTRAP_DELAY_MS = 250;

export const queryPolicy = {
  active: { staleTime: STALE_TIME_ACTIVE, gcTime: GC_TIME_SHORT },
  short: { staleTime: STALE_TIME_SHORT, gcTime: GC_TIME_SHORT },
  default: { staleTime: STALE_TIME_DEFAULT, gcTime: GC_TIME_DEFAULT },
  long: { staleTime: STALE_TIME_LONG, gcTime: GC_TIME_LONG },
} as const;

/**
 * 도메인별 staleTime 차등화 — 불필요한 refetch 감소
 * Parity: APP-001
 */

export const STALE_TIME_LONG    = 10 * 60 * 1000; // 10분: 구독, 설정
export const STALE_TIME_DEFAULT =  5 * 60 * 1000; // 5분: 강아지, 코칭 (기존 유지)
export const STALE_TIME_SHORT   =  1 * 60 * 1000; // 1분: 로그, 대시보드
export const STALE_TIME_ACTIVE  =      30 * 1000;  // 30초: 훈련 진행 중

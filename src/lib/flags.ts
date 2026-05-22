/**
 * Feature Flags — 단계적 롤아웃과 즉시 rollback을 위한 토글.
 *
 * 사용: `import { FEATURE_FLAGS } from 'lib/flags'`
 * 토글 변경 후 핫리로드만으로 적용 가능 (서버 재배포 불필요).
 *
 * 추가 시 주의: flag가 비활성일 때 v2 fallback 경로가 유지되어야 함.
 */

export const FEATURE_FLAGS = {
  /** Phase 1~8 통합 활성화.
   *  - BE: /generate-focused 엔드포인트 라우팅
   *  - FE: ScoreBand v3 + 코칭↔Academy 동기화 + LockedBlock 미리보기 + 7일 Swipeable
   *  문제 발생 시 false로 즉시 rollback. v2 fallback은 코드 경로상 자동 유지됨. */
  AI_RECOMMENDATION_V3: true,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFlagEnabled(key: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[key] === true;
}

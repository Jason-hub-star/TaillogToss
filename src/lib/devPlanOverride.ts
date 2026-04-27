/**
 * devPlanOverride — __DEV__ 전용 플랜 오버라이드 플래그
 * DevMenu에서 토글, useIsPro에서 체크.
 * 프로덕션 빌드에서는 참조 자체가 tree-shaking 제거됨.
 */

let _override: 'FREE' | 'PRO_MONTHLY' | null = null;

export function getDevPlanOverride(): 'FREE' | 'PRO_MONTHLY' | null {
  return __DEV__ ? _override : null;
}

export function setDevPlanOverride(plan: 'FREE' | 'PRO_MONTHLY' | null): void {
  _override = plan;
}

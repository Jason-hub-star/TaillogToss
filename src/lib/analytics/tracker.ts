export interface EventPayloadMap {
  onboarding_complete: undefined;
  behavior_log_created: { mode: 'quick' | 'detailed' };
  ai_coach_requested: undefined;
  ai_coach_completed: { source: 'ai' | 'rule' };
  iap_purchase_success: { product_type: string };
  training_step_completed: { curriculum_id: string; step: string };
  share_reward_sent: undefined;
  ad_requested: { placement: string };
  ad_loaded: { placement: string };
  ad_rewarded: { placement: string };
  ad_error: { placement: string };
  ad_no_fill: { placement: string; reason: string };
}

export type EventName = keyof EventPayloadMap;

function track<K extends EventName>(event: K, payload: EventPayloadMap[K]): void {
  console.log('[tracker]', event, payload ?? {});
}

export const tracker = {
  track,
  onboardingComplete: () => track('onboarding_complete', undefined),
  behaviorLogCreated: (mode: 'quick' | 'detailed') =>
    track('behavior_log_created', { mode }),
  aiCoachRequested: () => track('ai_coach_requested', undefined),
  aiCoachCompleted: (source: 'ai' | 'rule') =>
    track('ai_coach_completed', { source }),
  iapPurchaseSuccess: (productType: string) =>
    track('iap_purchase_success', { product_type: productType }),
  trainingStepCompleted: (curriculumId: string, step: string) =>
    track('training_step_completed', { curriculum_id: curriculumId, step }),
  shareRewardSent: () => track('share_reward_sent', undefined),
  adRequested: (placement: string) => track('ad_requested', { placement }),
  adLoaded: (placement: string) => track('ad_loaded', { placement }),
  adRewarded: (placement: string) => track('ad_rewarded', { placement }),
  adError: (placement: string) => track('ad_error', { placement }),
  adNoFill: (placement: string, reason: string) =>
    track('ad_no_fill', { placement, reason }),
};

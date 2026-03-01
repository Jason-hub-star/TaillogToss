import type { BehaviorType } from 'types/dog';

export const REASON_TEMPLATES: Record<BehaviorType, string> = {
  separation: '분리불안 행동에 맞춤 추천',
  anxiety: '불안/공포 반응 개선에 맞춤 추천',
  barking: '짖음/반응성 개선에 맞춤 추천',
  destructive: '파괴 행동 교정에 맞춤 추천',
  reactivity: '흥분/반응성 조절에 맞춤 추천',
  aggression: '공격성 관리에 맞춤 추천',
  resource_guarding: '자원 보호 행동 교정에 맞춤 추천',
  leash_pulling: '산책 매너 개선에 맞춤 추천',
  jumping: '기본 예절 훈련에 맞춤 추천',
  other: '우리 아이 맞춤 훈련 추천',
};

/**
 * B2B Ops 프리셋 데이터 — 6카테고리 x 3~5옵션 (키보드 입력 최소화)
 * Parity: B2B-001
 */

export interface PresetOption {
  id: string;
  label: string;
  category: PresetCategory;
  defaultIntensity: number;
  defaultMemo: string;
}

export type PresetCategory = 'walk' | 'play' | 'condition' | 'alert' | 'meal' | 'social';

export const PRESET_CATEGORIES: { key: PresetCategory; label: string; icon: string }[] = [
  { key: 'walk', label: '산책', icon: '\uD83D\uDEB6' },
  { key: 'play', label: '놀이', icon: '\uD83C\uDFBE' },
  { key: 'condition', label: '컨디션', icon: '\uD83D\uDCA4' },
  { key: 'alert', label: '이상징후', icon: '\u26A0\uFE0F' },
  { key: 'meal', label: '식사', icon: '\uD83C\uDF5A' },
  { key: 'social', label: '사회성', icon: '\uD83D\uDC3E' },
];

export const PRESET_OPTIONS: PresetOption[] = [
  // 산책
  { id: 'walk_normal', label: '정상 산책', category: 'walk', defaultIntensity: 3, defaultMemo: '정상 산책 완료' },
  { id: 'walk_pulling', label: '리드 당김', category: 'walk', defaultIntensity: 5, defaultMemo: '산책 중 리드 당김 발생' },
  { id: 'walk_reactive', label: '반응성(짖음)', category: 'walk', defaultIntensity: 7, defaultMemo: '산책 중 타견/사람 반응' },
  { id: 'walk_refuse', label: '산책 거부', category: 'walk', defaultIntensity: 4, defaultMemo: '산책 거부/주저함' },
  // 놀이
  { id: 'play_normal', label: '정상 놀이', category: 'play', defaultIntensity: 3, defaultMemo: '놀이 시간 정상' },
  { id: 'play_overexcited', label: '과잉흥분', category: 'play', defaultIntensity: 6, defaultMemo: '놀이 중 과잉흥분' },
  { id: 'play_resource', label: '자원 지킴', category: 'play', defaultIntensity: 7, defaultMemo: '장난감 지킴 행동' },
  // 컨디션
  { id: 'cond_good', label: '컨디션 좋음', category: 'condition', defaultIntensity: 1, defaultMemo: '컨디션 양호' },
  { id: 'cond_tired', label: '피곤/무기력', category: 'condition', defaultIntensity: 4, defaultMemo: '평소보다 무기력' },
  { id: 'cond_anxious', label: '불안 징후', category: 'condition', defaultIntensity: 6, defaultMemo: '불안 행동 관찰' },
  { id: 'cond_excited', label: '활발/에너지', category: 'condition', defaultIntensity: 2, defaultMemo: '활발한 상태' },
  // 이상징후
  { id: 'alert_vomit', label: '구토', category: 'alert', defaultIntensity: 8, defaultMemo: '구토 발생 — 보호자 연락 필요' },
  { id: 'alert_diarrhea', label: '설사', category: 'alert', defaultIntensity: 7, defaultMemo: '설사 증상 — 보호자 연락 필요' },
  { id: 'alert_limp', label: '절뚝거림', category: 'alert', defaultIntensity: 8, defaultMemo: '다리 절뚝거림 — 수의사 확인 필요' },
  { id: 'alert_aggression', label: '공격 행동', category: 'alert', defaultIntensity: 9, defaultMemo: '공격 행동 발생 — 격리 조치' },
  { id: 'alert_noeat', label: '식욕부진', category: 'alert', defaultIntensity: 6, defaultMemo: '식사 거부/잔량 많음' },
  // 식사
  { id: 'meal_full', label: '완식', category: 'meal', defaultIntensity: 1, defaultMemo: '식사 완료' },
  { id: 'meal_half', label: '반식', category: 'meal', defaultIntensity: 3, defaultMemo: '식사 절반 섭취' },
  { id: 'meal_refuse', label: '거부', category: 'meal', defaultIntensity: 5, defaultMemo: '식사 거부' },
  // 사회성
  { id: 'social_good', label: '타견 우호', category: 'social', defaultIntensity: 2, defaultMemo: '타견과 우호적 교류' },
  { id: 'social_avoid', label: '타견 회피', category: 'social', defaultIntensity: 4, defaultMemo: '타견 회피 행동' },
  { id: 'social_reactive', label: '타견 반응', category: 'social', defaultIntensity: 7, defaultMemo: '타견에 짖음/으르렁' },
  { id: 'social_human', label: '사람 우호', category: 'social', defaultIntensity: 2, defaultMemo: '낯선 사람에게 우호적' },
];

/** 카테고리별 프리셋 필터 */
export function getPresetsByCategory(category: PresetCategory): PresetOption[] {
  return PRESET_OPTIONS.filter((p) => p.category === category);
}

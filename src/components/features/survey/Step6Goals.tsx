/**
 * Step 6: 목표 설정 (원하는 목표 + 우선 해결 행동)
 * Parity: AUTH-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep6, BehaviorType } from 'types/dog';

const GOAL_OPTIONS = [
  { key: 'calm_walk', label: '평화로운 산책' },
  { key: 'guest_manners', label: '손님 맞이' },
  { key: 'alone_time', label: '혼자 있기' },
  { key: 'less_barking', label: '짖음 줄이기' },
  { key: 'socialization', label: '사회화' },
  { key: 'basic_obedience', label: '기본 복종' },
  { key: 'fear_reduction', label: '공포 감소' },
  { key: 'bond_building', label: '유대 강화' },
];

const BEHAVIOR_LABELS: Record<BehaviorType, string> = {
  barking: '짖음/울음',
  aggression: '공격성',
  anxiety: '분리불안',
  destructive: '파괴행동',
  reactivity: '과잉반응',
  leash_pulling: '리드줄 당김',
  jumping: '점핑',
  resource_guarding: '자원 지키기',
  separation: '배변 문제',
  other: '기타',
};

interface Props {
  value?: SurveyStep6;
  onChange: (v: SurveyStep6) => void;
  availableBehaviors: BehaviorType[];
}

export function Step6Goals({ value, onChange, availableBehaviors }: Props) {
  const current: SurveyStep6 = value ?? {
    goals: [],
    priority_behavior: availableBehaviors[0] ?? 'barking',
  };

  const handleGoalSelect = (key: string) => {
    const exists = current.goals.includes(key);
    const next = exists
      ? current.goals.filter((g) => g !== key)
      : [...current.goals, key];
    onChange({ ...current, goals: next });
  };

  const priorityOptions = availableBehaviors.map((b) => ({
    key: b,
    label: BEHAVIOR_LABELS[b],
  }));

  return (
    <View>
      <Text style={styles.title}>어떤 변화를 원하시나요?</Text>
      <Text style={styles.subtitle}>해당하는 목표를 모두 선택해주세요</Text>

      <ChipGroup
        items={GOAL_OPTIONS}
        selectedKeys={current.goals}
        onSelect={handleGoalSelect}
        multiSelect
      />

      {availableBehaviors.length > 0 && (
        <View style={styles.prioritySection}>
          <Text style={styles.label}>가장 먼저 해결하고 싶은 행동</Text>
          <ChipGroup
            items={priorityOptions}
            selectedKeys={[current.priority_behavior]}
            onSelect={(key) =>
              onChange({ ...current, priority_behavior: key as BehaviorType })
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', color: '#202632', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8B95A1', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333D4B', marginBottom: 12 },
  prioritySection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E8EB' },
});

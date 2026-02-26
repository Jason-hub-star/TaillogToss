/**
 * Step 3: 주요 행동 문제 (최대 3개 선택 + 심각도)
 * Parity: AUTH-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep3, BehaviorType } from 'types/dog';

const BEHAVIOR_OPTIONS: { key: BehaviorType; label: string }[] = [
  { key: 'barking', label: '짖음/울음' },
  { key: 'aggression', label: '공격성' },
  { key: 'anxiety', label: '분리불안' },
  { key: 'destructive', label: '파괴행동' },
  { key: 'reactivity', label: '과잉반응' },
  { key: 'leash_pulling', label: '리드줄 당김' },
  { key: 'jumping', label: '점핑' },
  { key: 'resource_guarding', label: '자원 지키기' },
  { key: 'separation', label: '배변 문제' },
  { key: 'other', label: '기타' },
];

interface Props {
  value?: SurveyStep3;
  onChange: (v: SurveyStep3) => void;
}

export function Step3Behavior({ value, onChange }: Props) {
  const current: SurveyStep3 = value ?? { primary_behaviors: [], severity: {} as SurveyStep3['severity'] };

  const handleSelect = (key: string) => {
    const behavior = key as BehaviorType;
    const exists = current.primary_behaviors.includes(behavior);

    let next: BehaviorType[];
    if (exists) {
      next = current.primary_behaviors.filter((b) => b !== behavior);
    } else if (current.primary_behaviors.length < 3) {
      next = [...current.primary_behaviors, behavior];
    } else {
      return; // 최대 3개
    }

    const severity = { ...current.severity };
    if (!exists) {
      severity[behavior] = 3; // 기본 심각도
    }
    onChange({ primary_behaviors: next, severity });
  };

  return (
    <View>
      <Text style={styles.title}>가장 고민되는 행동을 선택해주세요</Text>
      <Text style={styles.subtitle}>최대 3개까지 선택 가능</Text>

      <ChipGroup
        items={BEHAVIOR_OPTIONS}
        selectedKeys={current.primary_behaviors}
        onSelect={handleSelect}
        multiSelect
      />

      {current.primary_behaviors.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.label}>선택된 행동: {current.primary_behaviors.length}개</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', color: '#202632', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8B95A1', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333D4B', marginTop: 16 },
  selectedSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E8EB' },
});

/**
 * Step 5: 과거 시도 이력
 * Parity: AUTH-001
 */
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep5 } from 'types/dog';

const ATTEMPT_OPTIONS = [
  { key: 'youtube', label: '유튜브 교육' },
  { key: 'book', label: '서적 참고' },
  { key: 'trainer', label: '훈련사 상담' },
  { key: 'class', label: '그룹 교육' },
  { key: 'app', label: '앱/서비스' },
  { key: 'none', label: '시도한 적 없음' },
];

interface Props {
  value?: SurveyStep5;
  onChange: (v: SurveyStep5) => void;
}

export function Step5History({ value, onChange }: Props) {
  const current: SurveyStep5 = value ?? { past_attempts: [], professional_help: false };

  const handleSelect = (key: string) => {
    if (key === 'none') {
      onChange({ ...current, past_attempts: ['none'] });
      return;
    }
    const filtered = current.past_attempts.filter((a) => a !== 'none');
    const exists = filtered.includes(key);
    const next = exists ? filtered.filter((a) => a !== key) : [...filtered, key];
    onChange({ ...current, past_attempts: next });
  };

  return (
    <View>
      <Text style={styles.title}>이전에 시도해본 방법이 있나요?</Text>

      <ChipGroup
        items={ATTEMPT_OPTIONS}
        selectedKeys={current.past_attempts}
        onSelect={handleSelect}
        multiSelect
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>전문가 도움을 받은 적 있나요?</Text>
        <Switch
          value={current.professional_help}
          onValueChange={(v) => onChange({ ...current, professional_help: v })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '600', color: '#202632', marginBottom: 20 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, color: '#333D4B', flex: 1, marginRight: 12 },
});

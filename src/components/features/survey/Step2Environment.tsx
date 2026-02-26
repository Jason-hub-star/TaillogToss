/**
 * Step 2: 생활 환경 (가구원, 주거, 혼자 있는 시간)
 * Parity: AUTH-001
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet, Switch } from 'react-native';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep2 } from 'types/dog';

const LIVING_OPTIONS = [
  { key: 'apartment', label: '아파트' },
  { key: 'house', label: '주택' },
  { key: 'villa', label: '빌라' },
  { key: 'other', label: '기타' },
];

interface Props {
  value?: SurveyStep2;
  onChange: (v: SurveyStep2) => void;
}

export function Step2Environment({ value, onChange }: Props) {
  const current: SurveyStep2 = value ?? {
    household: { members_count: 1, has_children: false, has_other_pets: false, living_type: 'apartment' },
    daily_alone_hours: 0,
  };

  const update = (partial: Partial<SurveyStep2>) => {
    onChange({ ...current, ...partial });
  };

  const updateHousehold = (partial: Partial<SurveyStep2['household']>) => {
    update({ household: { ...current.household, ...partial } });
  };

  return (
    <View>
      <Text style={styles.label}>가구원 수</Text>
      <TextInput
        style={styles.input}
        value={current.household.members_count > 0 ? String(current.household.members_count) : ''}
        onChangeText={(t) => updateHousehold({ members_count: parseInt(t, 10) || 1 })}
        keyboardType="numeric"
        placeholder="1"
        placeholderTextColor="#B0B8C1"
      />

      <Text style={styles.label}>주거 형태</Text>
      <ChipGroup
        items={LIVING_OPTIONS}
        selectedKeys={[current.household.living_type]}
        onSelect={(key) => updateHousehold({ living_type: key as SurveyStep2['household']['living_type'] })}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>어린이가 있나요?</Text>
        <Switch
          value={current.household.has_children}
          onValueChange={(v) => updateHousehold({ has_children: v })}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>다른 반려동물이 있나요?</Text>
        <Switch
          value={current.household.has_other_pets}
          onValueChange={(v) => updateHousehold({ has_other_pets: v })}
        />
      </View>

      <Text style={styles.label}>하루 혼자 있는 시간 (시간)</Text>
      <TextInput
        style={styles.input}
        value={current.daily_alone_hours > 0 ? String(current.daily_alone_hours) : ''}
        onChangeText={(t) => update({ daily_alone_hours: parseInt(t, 10) || 0 })}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#B0B8C1"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#333D4B', marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E8EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#202632',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, color: '#333D4B' },
});

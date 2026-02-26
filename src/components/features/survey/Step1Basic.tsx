/**
 * Step 1: 기본 정보 (이름, 품종, 나이, 성별)
 * Parity: AUTH-001
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep1, DogSex } from 'types/dog';

const SEX_OPTIONS = [
  { key: 'MALE', label: '수컷' },
  { key: 'FEMALE', label: '암컷' },
  { key: 'MALE_NEUTERED', label: '수컷 (중성화)' },
  { key: 'FEMALE_NEUTERED', label: '암컷 (중성화)' },
];

interface Props {
  value?: SurveyStep1;
  onChange: (v: SurveyStep1) => void;
}

export function Step1Basic({ value, onChange }: Props) {
  const current: SurveyStep1 = value ?? { name: '', breed: '', age_months: 0, sex: 'MALE' };

  const update = (partial: Partial<SurveyStep1>) => {
    onChange({ ...current, ...partial });
  };

  return (
    <View>
      <Text style={styles.label}>반려견 이름</Text>
      <TextInput
        style={styles.input}
        value={current.name}
        onChangeText={(name) => update({ name })}
        placeholder="이름을 입력해주세요"
        placeholderTextColor="#B0B8C1"
      />

      <Text style={styles.label}>품종</Text>
      <TextInput
        style={styles.input}
        value={current.breed}
        onChangeText={(breed) => update({ breed })}
        placeholder="품종을 입력해주세요"
        placeholderTextColor="#B0B8C1"
      />

      <Text style={styles.label}>나이 (개월)</Text>
      <TextInput
        style={styles.input}
        value={current.age_months > 0 ? String(current.age_months) : ''}
        onChangeText={(t) => update({ age_months: parseInt(t, 10) || 0 })}
        placeholder="개월 수"
        keyboardType="numeric"
        placeholderTextColor="#B0B8C1"
      />

      <Text style={styles.label}>성별</Text>
      <ChipGroup
        items={SEX_OPTIONS}
        selectedKeys={[current.sex]}
        onSelect={(key) => update({ sex: key as DogSex })}
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
});

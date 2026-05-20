/**
 * ABCForm — 상세 ABC 기록 폼 (선행-행동-결과 + 강도/시간/위치)
 * Accordion 펼침 구조, 와이어프레임 9-4 상세탭 기준
 * Parity: UI-001, LOG-001
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Accordion } from 'components/tds-ext/Accordion';
import { DateTimePicker } from 'components/tds-ext/DateTimePicker';
import { IntensitySelector } from 'components/tds-ext/IntensitySelector';
import type { DetailedLogInput, IntensityLevel } from 'types/log';
import { colors, typography } from 'styles/tokens';

export interface ABCFormProps {
  dogId: string;
  onSubmit: (input: DetailedLogInput) => void;
  isLoading?: boolean;
}

export function ABCForm({ dogId, onSubmit, isLoading = false }: ABCFormProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [behavior, setBehavior] = useState('');
  const [antecedent, setAntecedent] = useState('');
  const [consequence, setConsequence] = useState('');
  const [intensity, setIntensity] = useState<IntensityLevel>(5);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [location, setLocation] = useState('');
  const [memo, setMemo] = useState('');

  const canSubmit = behavior.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      dog_id: dogId,
      type_id: 'manual',
      antecedent,
      behavior,
      consequence,
      intensity,
      location: location || undefined,
      memo: memo || undefined,
      occurred_at: occurredAt.toISOString(),
    });
  }, [dogId, antecedent, behavior, consequence, intensity, location, memo, occurredAt, canSubmit, onSubmit]);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>선행(A)</Text>
        <TextInput
          style={styles.input}
          placeholder="행동 직전에 어떤 상황이었나요?"
          value={antecedent}
          onChangeText={setAntecedent}
          placeholderTextColor={colors.placeholder}
          textAlignVertical="top"
          multiline
        />

        <Text style={[styles.label, { marginTop: 16 }]}>행동(B) *</Text>
        <TextInput
          style={styles.input}
          placeholder="어떤 행동을 했나요?"
          value={behavior}
          onChangeText={setBehavior}
          placeholderTextColor={colors.placeholder}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>결과(C)</Text>
        <TextInput
          style={styles.input}
          placeholder="행동 후 어떤 결과가 있었나요?"
          value={consequence}
          onChangeText={setConsequence}
          placeholderTextColor={colors.placeholder}
          textAlignVertical="top"
          multiline
        />

        <Accordion title="강도 / 시간">
          <IntensitySelector value={intensity} onChange={setIntensity} testID="abc-log-intensity" />
          <Text style={[styles.subLabel, { marginTop: 12 }]}>발생 시각</Text>
          <DateTimePicker value={occurredAt} onChange={setOccurredAt} mode="time" />
        </Accordion>

        <Accordion title="장소 / 메모">
          <TextInput
            style={styles.input}
            placeholder="장소 (선택)"
            value={location}
            onChangeText={setLocation}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
            placeholderTextColor={colors.placeholder}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="메모 (선택)"
            value={memo}
            onChangeText={setMemo}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
            placeholderTextColor={colors.placeholder}
            textAlignVertical="top"
            multiline
          />
        </Accordion>
      </ScrollView>

      <View style={styles.submitWrap}>
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>{isLoading ? '저장하고 있어요' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingBottom: 24,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subLabel: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.grey700,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.bodySmall,
    color: colors.textPrimary,
    backgroundColor: colors.grey50,
    minHeight: 44,
  },
  submitButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitDisabled: {
    backgroundColor: colors.placeholder,
  },
  submitText: {
    color: colors.white,
    ...typography.label,
    fontWeight: '600',
  },
});

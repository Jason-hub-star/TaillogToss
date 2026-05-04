/**
 * QuickLogForm — 빠른 기록 폼 (Chip 선택 + 강도 + 시간)
 * 원탭 카테고리 선택 → 강도/시간 조절 → 저장
 * Parity: UI-001, LOG-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { QuickLogChips } from 'components/features/dashboard/QuickLogChips';
import { DateTimePicker } from 'components/tds-ext/DateTimePicker';
import type { QuickLogCategory, DailyActivityCategory, IntensityLevel, QuickLogInput } from 'types/log';
import { colors, typography } from 'styles/tokens';

export interface QuickLogFormProps {
  dogId: string;
  onSubmit: (inputs: QuickLogInput[]) => void;
  isLoading?: boolean;
}

const LOCATION_CHIPS = [
  { key: 'indoor', label: '실내' },
  { key: 'outdoor', label: '실외' },
  { key: 'walking', label: '산책 중' },
  { key: 'car', label: '차 안' },
] as const;

const DURATION_CHIPS = [
  { key: 3, label: '짧게(~5분)' },
  { key: 10, label: '보통(5~15분)' },
  { key: 20, label: '길게(15분+)' },
] as const;

export function QuickLogForm({ dogId, onSubmit, isLoading = false }: QuickLogFormProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<IntensityLevel>(3);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [memo, setMemo] = useState('');
  const [showTimeDetail, setShowTimeDetail] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const canSubmit = selectedCategories.length > 0;

  const handleBehaviorSelect = useCallback((category: QuickLogCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }, []);

  const handleActivitySelect = useCallback((category: DailyActivityCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const base = {
      dog_id: dogId,
      intensity,
      occurred_at: occurredAt.toISOString(),
      memo: memo || undefined,
      location: selectedLocation || undefined,
      duration_minutes: selectedDuration ?? undefined,
    };
    onSubmit(
      selectedCategories.map((cat) => ({
        ...base,
        category: cat as QuickLogCategory | DailyActivityCategory,
      })),
    );
  }, [dogId, selectedCategories, intensity, occurredAt, memo, selectedLocation, selectedDuration, canSubmit, onSubmit]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <QuickLogChips
        onSelectBehavior={handleBehaviorSelect}
        onSelectActivity={handleActivitySelect}
        selectedKeys={selectedCategories}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>강도: {intensity}</Text>
        <View style={styles.intensityRow}>
          {([1, 2, 3, 5, 6, 7, 10] as IntensityLevel[]).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.intensityChip, intensity === v && styles.intensityActive]}
              onPress={() => setIntensity(v)}
            >
              <Text style={[styles.intensityText, intensity === v && styles.intensityTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.timeRow}>
          <Text style={styles.sectionLabel}>시간: {occurredAt.getHours()}:{String(occurredAt.getMinutes()).padStart(2, '0')}</Text>
          <TouchableOpacity onPress={() => setShowTimeDetail(!showTimeDetail)}>
            <Text style={styles.changeText}>{showTimeDetail ? '접기' : '변경'}</Text>
          </TouchableOpacity>
        </View>
        {showTimeDetail && <DateTimePicker value={occurredAt} onChange={setOccurredAt} mode="time" />}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>장소</Text>
        <View style={styles.chipRow}>
          {LOCATION_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[styles.optionChip, selectedLocation === chip.key && styles.optionChipActive]}
              onPress={() => setSelectedLocation(selectedLocation === chip.key ? null : chip.key)}
            >
              <Text style={[styles.optionChipText, selectedLocation === chip.key && styles.optionChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>지속시간</Text>
        <View style={styles.chipRow}>
          {DURATION_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[styles.optionChip, selectedDuration === chip.key && styles.optionChipActive]}
              onPress={() => setSelectedDuration(selectedDuration === chip.key ? null : chip.key)}
            >
              <Text style={[styles.optionChipText, selectedDuration === chip.key && styles.optionChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <TextInput
          style={styles.memoInput}
          placeholder="메모 (선택)"
          value={memo}
          onChangeText={setMemo}
          placeholderTextColor={colors.placeholder}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || isLoading}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>{isLoading ? '저장 중...' : '저장'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.grey700,
    marginBottom: 8,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityChip: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityActive: {
    backgroundColor: colors.primaryBlue,
  },
  intensityText: {
    ...typography.detail,
    color: colors.grey700,
    fontWeight: '500',
  },
  intensityTextActive: {
    color: colors.white,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.divider,
  },
  optionChipActive: {
    backgroundColor: colors.primaryBlue,
  },
  optionChipText: {
    ...typography.detail,
    color: colors.grey700,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: colors.white,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.detail,
    color: colors.textPrimary,
    backgroundColor: colors.grey50,
    minHeight: 60,
  },
  submitButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
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

/**
 * QuickLogForm — 빠른 기록 폼 (Chip 선택 + 강도 + 시간)
 * 원탭 카테고리 선택 → 강도/시간 조절 → 저장
 * Parity: UI-001, LOG-001
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { QuickLogChips } from 'components/features/dashboard/QuickLogChips';
import { DateTimePicker } from 'components/tds-ext/DateTimePicker';
import { IntensitySelector } from 'components/tds-ext/IntensitySelector';
import { OccurrenceSelector, type OccurrenceValue } from 'components/tds-ext/OccurrenceSelector';
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

function formatQuickTime(date: Date): string {
  const now = new Date();
  const diffMinutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (diffMinutes < 1) return `방금 · ${hhmm}`;
  if (diffMinutes < 60) return `${diffMinutes}분 전 · ${hhmm}`;
  if (diffMinutes < 180) return `${Math.round(diffMinutes / 60)}시간 전 · ${hhmm}`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (target === today) return `오늘 · ${hhmm}`;
  if (target === today - 86400000) return `어제 · ${hhmm}`;
  return `${date.getMonth() + 1}/${date.getDate()} · ${hhmm}`;
}

export function QuickLogForm({ dogId, onSubmit, isLoading = false }: QuickLogFormProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<IntensityLevel>(5);
  const [occurrence, setOccurrence] = useState<OccurrenceValue>({ count: 1, isMinimum: false });
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
      occurrence_count: occurrence.count,
      occurrence_count_is_minimum: occurrence.isMinimum,
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
  }, [dogId, selectedCategories, intensity, occurrence, occurredAt, memo, selectedLocation, selectedDuration, canSubmit, onSubmit]);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <QuickLogChips
          onSelectBehavior={handleBehaviorSelect}
          onSelectActivity={handleActivitySelect}
          selectedKeys={selectedCategories}
        />

        <View style={styles.section}>
          <IntensitySelector value={intensity} onChange={setIntensity} testID="quick-log-intensity" />
        </View>

        <View style={styles.section}>
          <OccurrenceSelector value={occurrence} onChange={setOccurrence} testID="quick-log-occurrence" />
        </View>

        <View style={styles.section}>
          <View style={styles.timeRow}>
            <Text style={[styles.sectionLabel, styles.timeLabel]}>발생 시각</Text>
            <Text style={styles.timeValue}>{formatQuickTime(occurredAt)}</Text>
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
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
            placeholderTextColor={colors.placeholder}
            multiline
            textAlignVertical="top"
          />
        </View>
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
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.grey700,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    marginBottom: 0,
  },
  timeValue: {
    ...typography.detail,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
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
    maxHeight: 140,
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

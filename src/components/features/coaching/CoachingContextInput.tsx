/**
 * CoachingContextInput — 오늘의 상황 입력 (체크박스 + Pro 자유입력)
 * 새 코칭 받기 전 상황 선택으로 맞춤 코칭 품질 향상
 * Parity: AI-001
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';

const PRESET_SITUATIONS = [
  { id: 'walk_pulling', label: '산책 중 줄 당김' },
  { id: 'stranger_barking', label: '낯선 사람 방문 시 짖음' },
  { id: 'other_dog', label: '다른 강아지 만남' },
  { id: 'separation', label: '혼자 있을 때 불안' },
  { id: 'resource_guarding', label: '음식 독점 / 자원 지킴' },
  { id: 'training_focus', label: '훈련 집중 어려움' },
] as const;

export interface CoachingContextInputProps {
  isPro: boolean;
  selectedSituations: string[];
  onSituationToggle: (id: string) => void;
  userContext: string;
  onUserContextChange: (text: string) => void;
  disabled?: boolean;
}

export function CoachingContextInput({
  isPro,
  selectedSituations,
  onSituationToggle,
  userContext,
  onUserContextChange,
  disabled = false,
}: CoachingContextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘 특별한 상황이 있었나요?</Text>
      <Text style={styles.subtitle}>선택하면 더 정확한 코칭을 받을 수 있어요</Text>

      <View style={styles.chipGrid}>
        {PRESET_SITUATIONS.map((s) => {
          const selected = selectedSituations.includes(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSituationToggle(s.id)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isPro ? (
        <View style={styles.freeInputWrap}>
          <TextInput
            style={styles.freeInput}
            placeholder="자세한 상황을 입력해 주세요 (예: 공원에서 다른 강아지를 보자마자 줄을 잡아당기며...)"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={300}
            editable={!disabled}
            value={userContext}
            onChangeText={onUserContextChange}
          />
          <Text style={styles.charCount}>{userContext.length}/300</Text>
        </View>
      ) : (
        <View style={styles.proHint}>
          <Text style={styles.proHintText}>
            💡 PRO 구독 시 상황을 직접 입력해서 더 세밀한 코칭을 받을 수 있어요
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grey200,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  freeInputWrap: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: spacing.md,
  },
  freeInput: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    minHeight: 72,
    paddingTop: 0,
  },
  charCount: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  proHint: {
    backgroundColor: colors.orange50,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  proHintText: {
    ...typography.caption,
    color: colors.orange700,
    lineHeight: 18,
  },
});

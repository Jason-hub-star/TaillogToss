/**
 * VariantSelector — Plan A/B/C 탭 전환 + 철학 배지 (SegmentedControl 패턴)
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PlanVariant, PlanMeta } from 'types/training';
import { colors, typography } from 'styles/tokens';

interface VariantSelectorProps {
  current: PlanVariant;
  onChange: (variant: PlanVariant) => void;
  isPro: boolean;
  planMeta?: Record<PlanVariant, PlanMeta>;
  onProCTA?: () => void;
}

const VARIANTS: { key: PlanVariant; label: string; proOnly: boolean; emoji: string }[] = [
  { key: 'A', label: 'Plan A', proOnly: false, emoji: '🎯' },
  { key: 'B', label: 'Plan B', proOnly: true, emoji: '🎮' },
  { key: 'C', label: 'Plan C', proOnly: true, emoji: '🔄' },
];

const PHILOSOPHY_LABEL: Record<string, string> = {
  Focus: '집중형',
  PlayBased: '놀이형',
  Adaptive: '맞춤형',
};

export function VariantSelector({ current, onChange, isPro, planMeta, onProCTA }: VariantSelectorProps) {
  const activeMeta = planMeta?.[current];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>훈련 방법</Text>
      <View style={styles.segmented}>
        {VARIANTS.map(({ key, label, proOnly, emoji }) => {
          const isActive = current === key;
          const isDisabled = proOnly && !isPro;

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.segment,
                isActive && styles.segmentActive,
                isDisabled && styles.segmentDisabled,
              ]}
              onPress={() => isDisabled ? onProCTA?.() : onChange(key)}
              activeOpacity={0.7}
            >
              <Text style={styles.segmentEmoji}>{emoji}</Text>
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                  isDisabled && styles.segmentTextDisabled,
                ]}
              >
                {label}
              </Text>
              {isDisabled && <Text style={styles.lockIcon}>{'🔒'}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      {activeMeta && (
        <View style={styles.metaRow}>
          <View style={styles.philosophyBadge}>
            <Text style={styles.philosophyText}>
              {PHILOSOPHY_LABEL[activeMeta.philosophy] ?? activeMeta.philosophy}
            </Text>
          </View>
          <Text style={styles.idealForText} numberOfLines={1}>
            {activeMeta.ideal_for}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  segmentActive: {
    backgroundColor: colors.white,
    shadowColor: colors.grey950,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  segmentText: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primaryBlue,
  },
  segmentTextDisabled: {
    color: colors.textTertiary,
  },
  lockIcon: {
    ...typography.badge,
  },
  segmentEmoji: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  philosophyBadge: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  philosophyText: {
    ...typography.badge,
    color: colors.white,
    fontWeight: '600',
  },
  idealForText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});

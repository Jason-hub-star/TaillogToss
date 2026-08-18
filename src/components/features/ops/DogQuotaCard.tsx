/**
 * DogQuotaCard — 활성 강아지 수 / 플랜 한도 카드
 * Parity: B2B-002
 */
import React from 'react';
import { View, Text, StyleSheet, type DimensionValue } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';

interface DogQuotaCardProps {
  activeCount: number;
  maxDogs: number;
  isLoading?: boolean;
}

export function DogQuotaCard({ activeCount, maxDogs, isLoading }: DogQuotaCardProps) {
  const ratio = maxDogs > 0 ? Math.min(activeCount / maxDogs, 1) : 0;
  const pct = Math.round(ratio * 100);
  const isWarning = pct >= 80;

  const barColor = isWarning ? colors.orange500 : colors.primaryBlue;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>강아지 현황</Text>
        {maxDogs > 0 && (
          <Text style={[styles.pctText, isWarning && styles.pctWarning]}>
            {pct}%
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.skeleton} />
      ) : (
        <>
          <View style={styles.countRow}>
            <Text style={styles.countMain}>
              <Text style={styles.countActive}>{activeCount}</Text>
              <Text style={styles.countSep}> / </Text>
              <Text style={styles.countMax}>{maxDogs > 0 ? maxDogs : '—'}</Text>
            </Text>
            <Text style={styles.countUnit}>마리</Text>
          </View>

          {maxDogs > 0 && (
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${pct}%` as DimensionValue, backgroundColor: barColor }]} />
            </View>
          )}

          {isWarning && (
            <Text style={styles.warningText}>한도의 80% 이상 등록됐어요</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.label, fontWeight: '700', color: colors.textPrimary },
  pctText: { ...typography.detail, fontWeight: '700', color: colors.primaryBlue },
  pctWarning: { color: colors.orange500 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  countMain: {},
  countActive: { ...typography.t2, fontWeight: '700', color: colors.textPrimary },
  countSep: { ...typography.bodySmall, color: colors.textTertiary },
  countMax: { ...typography.bodySmall, color: colors.textSecondary },
  countUnit: { ...typography.detail, color: colors.textSecondary, marginLeft: 4 },
  barBg: {
    height: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningText: { ...typography.caption, color: colors.orange500, marginTop: 4 },
  skeleton: {
    height: 52,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 8,
  },
});

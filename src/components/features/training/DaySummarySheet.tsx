/**
 * DaySummarySheet — Day 전체 완료 시 반응 요약 + 축하 바텀시트
 * Lottie(cute-doggie) + 반응 분포 요약
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { ModalLayout } from 'components/shared/layouts/ModalLayout';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { REACTION_OPTIONS } from 'types/training';
import type { DogReaction } from 'types/training';
import { colors, typography, spacing } from 'styles/tokens';

const REACTION_DOT_COLOR: Record<string, string> = {
  successGreen: colors.green500,
  warningAmber: colors.orange500,
  errorRed: colors.red500,
};

interface Props {
  visible: boolean;
  dayNumber: number;
  reactions: DogReaction[];
  isLastDay: boolean;
  onNext: () => void;
}

export function DaySummarySheet({ visible, dayNumber, reactions, isLastDay, onNext }: Props) {
  const reactionCounts = REACTION_OPTIONS.map((opt) => ({
    ...opt,
    count: reactions.filter((r) => r === opt.value).length,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <ModalLayout title={`${dayNumber}일차를 마쳤어요`}>
        <View style={styles.content}>
          <View style={styles.lottieWrap}>
            <LottieAnimation asset="cute-doggie" size={100} loop={false} />
          </View>

          {reactions.length > 0 && (
            <View style={styles.reactionSummary}>
              {reactionCounts
                .filter((r) => r.count > 0)
                .map((r) => (
                  <View key={r.value} style={styles.reactionChip}>
                    <View
                      style={[
                        styles.reactionDot,
                        { backgroundColor: REACTION_DOT_COLOR[r.color] ?? colors.grey500 },
                      ]}
                    />
                    <Text style={styles.reactionCount}>x{r.count}</Text>
                  </View>
                ))}
            </View>
          )}

          <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
            <Text style={styles.nextText}>{isLastDay ? '미션 완료!' : '다음 날로'}</Text>
          </TouchableOpacity>
        </View>
      </ModalLayout>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  lottieWrap: {
    marginBottom: spacing.lg,
  },
  reactionSummary: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reactionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  reactionCount: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  nextButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  nextText: {
    ...typography.label,
    fontWeight: '600',
    color: colors.white,
  },
});

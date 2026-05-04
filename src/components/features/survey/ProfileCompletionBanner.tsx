/**
 * ProfileCompletionBanner — 설문 완성도 유도 배너
 * Stage 1(25%): AI 코칭 활성화 유도 → stage2-form
 * Stage 2(60%): Pro 풀 개인화 유도 → stage3-form (Pro 전용)
 * Stage 3(100%): 렌더링 없음
 * Parity: APP-001
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSurveyStatus } from 'lib/hooks/useSurvey';
import { colors, spacing, typography } from 'styles/tokens';

interface ProfileCompletionBannerProps {
  dogId: string | undefined;
  isPro?: boolean;
  onPressCTA: (targetStage: 2 | 3) => void;
}

export function ProfileCompletionBanner({ dogId, isPro, onPressCTA }: ProfileCompletionBannerProps) {
  const { data: status } = useSurveyStatus(dogId);

  if (!status || status.completion_stage >= 3) return null;
  if (status.completion_stage >= 2 && !isPro) return null;

  const isStage1 = status.completion_stage < 2;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => onPressCTA(isStage1 ? 2 : 3)}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${status.completion_percentage}%` }]} />
          </View>
          <Text style={styles.pct}>{status.completion_percentage}%</Text>
        </View>
        <Text style={styles.title}>
          {isStage1 ? '✨ AI 코칭 활성화까지 한 단계!' : '🎯 Pro 풀 개인화 활성화하기'}
        </Text>
        <Text style={styles.desc}>
          {isStage1
            ? '생활 환경 정보를 입력하면 AI 맞춤 코칭을 받을 수 있어요'
            : '기질·건강 정보를 입력하면 더욱 정확한 코칭을 드려요'}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 14,
    padding: spacing.lg,
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.md,
  },
  left: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.grey200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryBlue,
    borderRadius: 3,
  },
  pct: {
    ...typography.badge,
    fontWeight: '700',
    color: colors.primaryBlue,
    minWidth: 32,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  desc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  arrow: {
    ...typography.body,
    color: colors.primaryBlue,
    marginLeft: spacing.sm,
  },
});

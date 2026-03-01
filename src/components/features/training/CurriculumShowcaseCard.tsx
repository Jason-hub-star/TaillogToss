/**
 * CurriculumShowcaseCard — Journey Map 내부용 풀-width 쇼케이스 카드
 * 이미지 + 태그라인 + 행동 타깃 칩 + 프리뷰 스텝 + 진도 바
 * PRO 카드: 그라디언트 오버레이 + "PRO로 시작하기" CTA
 * Parity: UI-001
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { CURRICULUM_ICONS } from 'lib/data/published/runtime';
import type { Curriculum, CurriculumStatus, CurriculumShowcase, DogReaction } from 'types/training';
import { colors, typography, spacing } from 'styles/tokens';

interface Props {
  curriculum: Curriculum;
  showcase: CurriculumShowcase;
  status: CurriculumStatus;
  completedSteps: number;
  totalSteps: number;
  isLocked: boolean;
  isRecommended: boolean;
  reactionSummary?: Record<DogReaction, number>;
  onPress: () => void;
  onProCTA?: () => void;
}

const STATUS_BADGE = {
  recommended: { label: 'AI 추천', bg: `${colors.primaryBlue}1A`, color: colors.primaryBlue },
  in_progress: { label: '진행중', bg: `${colors.green500}1A`, color: colors.green500 },
  completed: { label: '완료', bg: `${colors.green500}1A`, color: colors.green500 },
  not_started: { label: '미시작', bg: colors.divider, color: colors.textSecondary },
  locked: { label: 'PRO', bg: `${colors.orange700}1A`, color: colors.orange700 },
} as const;

export function CurriculumShowcaseCard({
  curriculum,
  showcase,
  status,
  completedSteps,
  totalSteps,
  isLocked,
  isRecommended,
  reactionSummary,
  onPress,
  onProCTA,
}: Props) {
  const icon = CURRICULUM_ICONS[curriculum.id] ?? '\u{1F4DA}';
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!showcase.image_url && !imageFailed;
  const badgeKey: keyof typeof STATUS_BADGE = isLocked ? 'locked' : isRecommended ? 'recommended' : status;
  const badge = STATUS_BADGE[badgeKey];
  const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={isLocked ? onProCTA : onPress}
      activeOpacity={0.7}
    >
      {/* Icon/Image + Badge row */}
      <View style={styles.topRow}>
        {showImage ? (
          <Image
            source={{ uri: showcase.image_url! }}
            style={styles.showcaseImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Title + Tagline */}
      <Text style={styles.title}>{curriculum.title}</Text>
      <Text style={styles.tagline}>{showcase.tagline}</Text>

      {/* Target behavior chips */}
      <View style={styles.chipRow}>
        {showcase.target_behaviors.map((behavior) => (
          <View key={behavior} style={styles.chip}>
            <Text style={styles.chipText}>{behavior}</Text>
          </View>
        ))}
      </View>

      {/* Preview steps */}
      <View style={styles.previewSteps}>
        {showcase.preview_steps.slice(0, 3).map((step, i) => (
          <Text key={i} style={styles.previewStep} numberOfLines={1}>
            {i + 1}. {step}
          </Text>
        ))}
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{completedSteps}/{totalSteps}</Text>
      </View>

      {/* Reaction dots */}
      {reactionSummary && Object.values(reactionSummary).some((v) => v > 0) && (
        <View style={styles.reactionRow}>
          {reactionSummary.enjoyed > 0 && <Text style={styles.reactionDot}>{'\u{1F606}'} {reactionSummary.enjoyed}</Text>}
          {reactionSummary.neutral > 0 && <Text style={styles.reactionDot}>{'\u{1F610}'} {reactionSummary.neutral}</Text>}
          {reactionSummary.sensitive > 0 && <Text style={styles.reactionDot}>{'\u{1F623}'} {reactionSummary.sensitive}</Text>}
        </View>
      )}

      {/* PRO overlay CTA */}
      {isLocked && (
        <View style={styles.proOverlay}>
          <Text style={styles.proCTAText}>PRO로 시작하기</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  showcaseImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 26,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    ...typography.badge,
    fontWeight: '700',
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tagline: {
    ...typography.detail,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    ...typography.caption,
    color: colors.grey700,
  },
  previewSteps: {
    gap: 4,
    marginBottom: spacing.md,
  },
  previewStep: {
    ...typography.caption,
    color: colors.grey600,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryBlue,
    borderRadius: 2,
  },
  progressText: {
    ...typography.badge,
    color: colors.textSecondary,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  reactionDot: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  proOverlay: {
    backgroundColor: `${colors.blue900}E6`,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  proCTAText: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.white,
  },
});

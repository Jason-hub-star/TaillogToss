/**
 * CurriculumJourneyMap — 세로 타임라인 + 좌우 교대 카드
 * DogCoach ChallengeJourneyMap 포팅 (RN Animated)
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CurriculumShowcaseCard } from './CurriculumShowcaseCard';
import { CURRICULUM_SHOWCASES } from 'lib/data/published/showcase';
import type { Curriculum, CurriculumId, CurriculumStatus, TrainingProgress, DogReaction, StepFeedback } from 'types/training';
import { colors, spacing } from 'styles/tokens';

type NodeStatus = 'completed' | 'active' | 'locked' | 'available';

interface Props {
  curriculums: Curriculum[];
  progressMap: Map<CurriculumId, TrainingProgress>;
  feedbackList: StepFeedback[];
  isPro: boolean;
  recommendedId: CurriculumId | null;
  onCardPress: (curriculum: Curriculum) => void;
  onProCTA: () => void;
}

function getNodeStatus(
  curriculum: Curriculum,
  progress: TrainingProgress | undefined,
  isPro: boolean,
  recommendedId: CurriculumId | null,
): NodeStatus {
  if (progress?.status === 'completed') return 'completed';
  if (progress?.status === 'in_progress') return 'active';
  if (curriculum.id === recommendedId) return 'active';
  if (curriculum.access === 'pro' && !isPro && !__DEV__) return 'locked';
  return 'available';
}

function getReactionSummary(
  feedbackList: StepFeedback[],
  curriculumId: CurriculumId,
): Record<DogReaction, number> {
  const result: Record<DogReaction, number> = { enjoyed: 0, neutral: 0, sensitive: 0 };
  for (const f of feedbackList) {
    if (f.curriculum_id === curriculumId) {
      result[f.reaction]++;
    }
  }
  return result;
}

const NODE_COLORS: Record<NodeStatus, string> = {
  completed: colors.green500,
  active: colors.primaryBlue,
  locked: colors.grey400,
  available: colors.grey300,
};

const NODE_ICONS: Record<NodeStatus, string> = {
  completed: '\u2713',
  active: '\u{1F535}',
  locked: '\u{1F512}',
  available: '\u{25CB}',
};

export function CurriculumJourneyMap({
  curriculums,
  progressMap,
  feedbackList,
  isPro,
  recommendedId,
  onCardPress,
  onProCTA,
}: Props) {
  return (
    <View style={styles.container}>
      {curriculums.map((curriculum, index) => {
        const progress = progressMap.get(curriculum.id);
        const nodeStatus = getNodeStatus(curriculum, progress, isPro, recommendedId);
        const showcase = CURRICULUM_SHOWCASES[curriculum.id];
        const isLast = index === curriculums.length - 1;
        const isEven = index % 2 === 0;

        const status: CurriculumStatus = progress?.status ?? 'not_started';
        const totalSteps = curriculum.days.reduce((sum, d) => sum + d.steps.length, 0);
        const completedSteps = progress?.completed_steps?.length ?? 0;
        const isLocked = curriculum.access === 'pro' && !isPro && !__DEV__;
        const isRecommended = curriculum.id === recommendedId && status === 'not_started';
        const reactionSummary = getReactionSummary(feedbackList, curriculum.id);

        return (
          <View key={curriculum.id} style={styles.row}>
            {/* Timeline connector */}
            <View style={styles.timelineColumn}>
              <View style={[styles.node, { backgroundColor: NODE_COLORS[nodeStatus] }]}>
                <Text style={styles.nodeIcon}>{NODE_ICONS[nodeStatus]}</Text>
              </View>
              {!isLast && (
                <View style={[styles.connector, { backgroundColor: NODE_COLORS[nodeStatus] }]} />
              )}
            </View>

            {/* Card */}
            <View style={[styles.cardColumn, isEven ? styles.cardLeft : styles.cardRight]}>
              {showcase ? (
                <CurriculumShowcaseCard
                  curriculum={curriculum}
                  showcase={showcase}
                  status={status}
                  completedSteps={completedSteps}
                  totalSteps={totalSteps}
                  isLocked={isLocked}
                  isRecommended={isRecommended}
                  reactionSummary={reactionSummary}
                  onPress={() => onCardPress(curriculum)}
                  onProCTA={onProCTA}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timelineColumn: {
    width: 40,
    alignItems: 'center',
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  nodeIcon: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '700',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    opacity: 0.3,
  },
  cardColumn: {
    flex: 1,
  },
  cardLeft: {
    marginLeft: spacing.sm,
  },
  cardRight: {
    marginLeft: spacing.sm,
  },
});

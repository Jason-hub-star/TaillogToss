/**
 * CurriculumCard — 훈련 아카데미 그리드 카드
 * 아이콘 + 제목 + Badge(상태) + ProgressBar
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Curriculum, CurriculumStatus } from 'types/training';
import { CURRICULUM_ICONS } from 'lib/data/curriculum';

type BadgeStatus = 'recommended' | CurriculumStatus | 'locked';

interface CurriculumCardProps {
  curriculum: Curriculum;
  status: CurriculumStatus;
  completedSteps: number;
  totalSteps: number;
  isRecommended: boolean;
  isLocked: boolean;
  onPress: () => void;
}

const BADGE_CONFIG: Record<BadgeStatus, { label: string; bg: string; color: string }> = {
  recommended: { label: '추천', bg: '#0064FF1A', color: '#0064FF' },
  in_progress: { label: '진행중', bg: '#00C4711A', color: '#00C471' },
  completed: { label: '완료', bg: '#00C4711A', color: '#00C471' },
  not_started: { label: '미시작', bg: '#F4F4F5', color: '#8B95A1' },
  locked: { label: 'PRO', bg: '#FF6B351A', color: '#FF6B35' },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

export function CurriculumCard({
  curriculum,
  status,
  completedSteps,
  totalSteps,
  isRecommended,
  isLocked,
  onPress,
}: CurriculumCardProps) {
  const badgeKey: BadgeStatus = isLocked ? 'locked' : isRecommended ? 'recommended' : status;
  const badge = BADGE_CONFIG[badgeKey];
  const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;
  const icon = CURRICULUM_ICONS[curriculum.id] ?? '📚';

  return (
    <TouchableOpacity
      style={[styles.card, isLocked && styles.cardLocked]}
      onPress={onPress}
      activeOpacity={isLocked ? 0.5 : 0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>

      <Text style={[styles.title, isLocked && styles.textLocked]} numberOfLines={2}>
        {curriculum.title}
      </Text>

      <Text style={styles.difficulty}>{DIFFICULTY_LABEL[curriculum.difficulty]}</Text>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {completedSteps}/{totalSteps}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F4F4F5',
    flex: 1,
    minHeight: 180,
  },
  cardLocked: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202632',
    marginBottom: 4,
    lineHeight: 20,
  },
  textLocked: {
    color: '#8B95A1',
  },
  difficulty: {
    fontSize: 12,
    color: '#8B95A1',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#F4F4F5',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0064FF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: '#8B95A1',
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
});

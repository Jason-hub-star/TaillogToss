/**
 * CoachingHistoryList — 과거 코칭 기록 리스트
 * FlatList + 날짜/타입/트렌드/피드백 요약
 * Parity: AI-001
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import type { CoachingResult } from 'types/coaching';
import { useCoachingList } from 'lib/hooks/useCoaching';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { colors, typography, spacing } from 'styles/tokens';

const TREND_ICON: Record<string, string> = {
  improving: '📈',
  stable: '➡️',
  worsening: '📉',
};

const REPORT_LABEL: Record<string, string> = {
  DAILY: '일간',
  WEEKLY: '주간',
  INSIGHT: '인사이트',
};

const REPORT_COLOR: Record<string, string> = {
  DAILY: colors.primaryBlue,
  WEEKLY: colors.purple500,
  INSIGHT: colors.orange500,
};

interface CoachingHistoryListProps {
  dogId: string | undefined;
  onSelectCoaching: (coaching: CoachingResult) => void;
}

export function CoachingHistoryList({ dogId, onSelectCoaching }: CoachingHistoryListProps) {
  const { data: coachings, isLoading } = useCoachingList(dogId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <View style={[styles.skeletonLine, { width: '40%' }]} />
            <View style={[styles.skeletonLine, { width: '60%' }]} />
          </View>
        ))}
      </View>
    );
  }

  if (!coachings || coachings.length === 0) {
    return (
      <EmptyState
        title="아직 코칭 기록이 없어요"
        description="AI 코칭을 받으면 여기에 기록이 쌓여요"
        icon="📋"
      />
    );
  }

  return (
    <FlatList
      data={coachings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <HistoryItem coaching={item} onPress={() => onSelectCoaching(item)} />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

function HistoryItem({
  coaching,
  onPress,
}: {
  coaching: CoachingResult;
  onPress: () => void;
}) {
  const trend = coaching.blocks?.insight?.trend ?? 'stable';
  const feedbackScore = coaching.feedback_score;

  return (
    <TouchableOpacity style={styles.historyItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyDate}>{formatDate(coaching.created_at)}</Text>
        <View style={styles.historyMeta}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: (REPORT_COLOR[coaching.report_type] ?? colors.primaryBlue) + '1A' },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: REPORT_COLOR[coaching.report_type] ?? colors.primaryBlue },
              ]}
            >
              {REPORT_LABEL[coaching.report_type] ?? coaching.report_type}
            </Text>
          </View>
          <Text style={styles.trendEmoji}>{TREND_ICON[trend]}</Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        {feedbackScore && (
          <Text style={styles.feedbackStars}>
            {'★'.repeat(feedbackScore)}
            {'☆'.repeat(5 - feedbackScore)}
          </Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${mins}`;
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.lg,
  },
  skeletonItem: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.divider,
    borderRadius: 7,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trendEmoji: {
    fontSize: 14,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedbackStars: {
    fontSize: 11,
    color: colors.orange500,
  },
  chevron: {
    ...typography.body,
    color: colors.grey400,
  },
});

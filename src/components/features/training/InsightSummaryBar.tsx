/**
 * InsightSummaryBar — 피드백 반응 요약 바
 * 피드백 데이터가 있을 때만 표시. AI fade-in 패턴.
 * Parity: UI-001
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { REACTION_OPTIONS } from 'types/training';
import type { StepFeedback } from 'types/training';
import { colors, typography, spacing } from 'styles/tokens';

interface Props {
  feedbackList: StepFeedback[];
  onPress?: () => void;
}

let hasInsightAnimated = false;

export function InsightSummaryBar({ feedbackList, onPress }: Props) {
  const [showContent, setShowContent] = useState(hasInsightAnimated);
  const fadeAnim = useRef(new Animated.Value(hasInsightAnimated ? 1 : 0)).current;

  const distribution = REACTION_OPTIONS.map((opt) => ({
    ...opt,
    count: feedbackList.filter((f) => f.reaction === opt.value).length,
  }));

  useEffect(() => {
    if (hasInsightAnimated) return;
    const timer = setTimeout(() => {
      setShowContent(true);
      hasInsightAnimated = true;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 600);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  if (feedbackList.length === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {showContent ? (
        <Animated.View style={[styles.row, { opacity: fadeAnim }]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>훈련 인사이트</Text>
          </View>
          <View style={styles.chips}>
            {distribution
              .filter((d) => d.count > 0)
              .map((d) => (
                <View key={d.value} style={styles.chip}>
                  <Text style={styles.chipEmoji}>{d.emoji}</Text>
                  <Text style={styles.chipCount}>x{d.count}</Text>
                </View>
              ))}
          </View>
          {onPress && <Text style={styles.cta}>자세히 보기 {'>'}</Text>}
        </Animated.View>
      ) : (
        <View style={styles.row}>
          <View style={[styles.skeletonBox, { width: 80 }]} />
          <View style={[styles.skeletonBox, { width: 120 }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: `${colors.primaryBlue}1A`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    ...typography.badge,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: 2,
  },
  chipCount: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cta: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '500',
  },
  skeletonBox: {
    height: 16,
    backgroundColor: colors.grey200,
    borderRadius: 4,
  },
});

/**
 * RecommendationCard — "AI 맞춤 추천" 풀와이드 카드
 * 첫 렌더 시 SkeletonBox → 0.8초 후 fade-in 텍스트 (세션당 1회)
 * Parity: UI-001
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import type { CurriculumId } from 'types/training';
import { CURRICULUMS } from 'lib/data/published/runtime';
import { colors, typography } from 'styles/tokens';

interface Props {
  curriculumId: CurriculumId;
  reasoning: string;
  onPress: () => void;
}

// 세션당 1회만 생성 연출
let hasAnimatedOnce = false;

export function RecommendationCard({ curriculumId, reasoning, onPress }: Props) {
  const curriculum = CURRICULUMS.find((c) => c.id === curriculumId);
  const [showContent, setShowContent] = useState(hasAnimatedOnce);
  const fadeAnim = useRef(new Animated.Value(hasAnimatedOnce ? 1 : 0)).current;

  useEffect(() => {
    if (hasAnimatedOnce) return;
    const timer = setTimeout(() => {
      setShowContent(true);
      hasAnimatedOnce = true;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 800);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  if (!curriculum) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AI 맞춤 추천</Text>
      </View>

      {showContent ? (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>{curriculum.title}</Text>
          <Text style={styles.reasoning}>{reasoning}</Text>
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>시작하기 →</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.skeletonWrap}>
          <SkeletonBox width="70%" height={20} borderRadius={4} />
          <SkeletonBox width="50%" height={14} borderRadius={4} style={styles.skeletonGap} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blue500,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.white}33`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
  },
  reasoning: {
    ...typography.detail,
    color: `${colors.white}CC`,
    marginBottom: 12,
  },
  ctaRow: {
    alignItems: 'flex-end',
  },
  ctaText: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.white,
  },
  skeletonWrap: {
    marginTop: 4,
  },
  skeletonGap: {
    marginTop: 8,
  },
});

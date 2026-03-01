/**
 * AIPersonalizedHero — "AI가 {dogName}의 행동을 분석해서 맞춤 훈련을 준비했어요"
 * AI 뱃지 + fade-in (RecommendationCard 패턴 재사용, 세션당 1회)
 * Parity: UI-001
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { colors, typography, spacing } from 'styles/tokens';

interface Props {
  dogName: string;
  behaviorText: string;
}

let hasHeroAnimated = false;

export function AIPersonalizedHero({ dogName, behaviorText }: Props) {
  const [showContent, setShowContent] = useState(hasHeroAnimated);
  const fadeAnim = useRef(new Animated.Value(hasHeroAnimated ? 1 : 0)).current;

  useEffect(() => {
    if (hasHeroAnimated) return;
    const timer = setTimeout(() => {
      setShowContent(true);
      hasHeroAnimated = true;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 800);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AI 맞춤 분석</Text>
      </View>

      {showContent ? (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.headline}>
            AI가 {dogName}의{'\n'}
            {behaviorText} 행동을 분석해서{'\n'}
            맞춤 훈련을 준비했어요
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.skeletonWrap}>
          <SkeletonBox width="90%" height={22} borderRadius={4} />
          <SkeletonBox width="75%" height={22} borderRadius={4} style={{ marginTop: 8 }} />
          <SkeletonBox width="60%" height={22} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.blue50,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primaryBlue}1A`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  headline: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
  },
  skeletonWrap: {
    marginTop: spacing.xs,
  },
});

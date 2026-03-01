/**
 * ProUpgradeBanner — PRO 구독 유도 시각적 카드
 * "문제행동 맞춤 솔루션을 모두 만나보세요"
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { colors, typography, spacing } from 'styles/tokens';

export function ProUpgradeBanner() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{'✨'}</Text>
        <Text style={styles.title}>문제행동 맞춤 솔루션을 모두 만나보세요</Text>
        <View style={styles.benefitList}>
          <Text style={styles.benefit}>{'•'} 6개 추가 커리큘럼 잠금 해제</Text>
          <Text style={styles.benefit}>{'•'} Plan C 고급 훈련법 이용</Text>
          <Text style={styles.benefit}>{'•'} 훈련 인사이트 리포트</Text>
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('/settings/subscription')}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>PRO 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: spacing.sectionGap,
    marginBottom: spacing.lg,
    backgroundColor: colors.blue900,
  },
  content: {
    padding: spacing.xl,
  },
  icon: {
    fontSize: 28,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.md,
  },
  benefitList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefit: {
    ...typography.detail,
    color: `${colors.white}CC`,
  },
  ctaButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.blue900,
  },
});

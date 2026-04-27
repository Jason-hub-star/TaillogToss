/**
 * ProUpgradeBanner — PRO 구독 유도 시각적 카드
 * "광고 없이, 더 깊이 분석해보세요"
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
        <Text style={styles.title}>광고 없이, 더 깊이 분석해보세요</Text>
        <View style={styles.benefitList}>
          <Text style={styles.benefit}>{'•'} 광고 없이 이용</Text>
          <Text style={styles.benefit}>{'•'} 심화 인사이트 리포트</Text>
          <Text style={styles.benefit}>{'•'} 하루 코칭 10회 (무료 3회)</Text>
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
    borderRadius: spacing.lg,
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
    borderRadius: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.blue900,
  },
});

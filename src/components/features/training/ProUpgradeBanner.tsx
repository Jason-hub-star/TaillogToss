/**
 * ProUpgradeBanner — PRO 구독 유도 보조 카드
 * academy 하단에서 추가 기능을 부드럽게 소개한다.
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { colors, typography, spacing } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';

export function ProUpgradeBanner() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={{ uri: ICONS['badge-pro'] }} style={styles.icon} resizeMode="contain" />
        <Text style={styles.eyebrow}>더 필요한 순간에 이어서 볼 수 있어요</Text>
        <Text style={styles.title}>문제행동 분석과 추가 훈련은 PRO에서 천천히 확장할 수 있어요</Text>
        <View style={styles.benefitList}>
          <Text style={styles.benefit}>{'•'} 심화 인사이트 리포트</Text>
          <Text style={styles.benefit}>{'•'} 시도 이력과 추가 훈련 열기</Text>
          <Text style={styles.benefit}>{'•'} 하루 코칭 10회까지 확장</Text>
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('/settings/subscription')}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>추가 기능 보기</Text>
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
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  content: {
    padding: spacing.xl,
  },
  icon: {
    width: 32,
    height: 32,
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryBlue,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  benefitList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefit: {
    ...typography.detail,
    color: colors.textSecondary,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
});

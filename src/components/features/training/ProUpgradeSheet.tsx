/**
 * ProUpgradeSheet — Pro 전용 기능 접근 시 인터셉트 바텀시트
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@granite-js/react-native';
import { ModalLayout } from 'components/shared/layouts/ModalLayout';
import { colors, typography, spacing } from 'styles/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const BENEFITS = [
  { emoji: '📊', text: '심화 인사이트 리포트' },
  { emoji: '🔇', text: '광고 없이 이용' },
  { emoji: '📋', text: '시도 이력 상세 조회' },
  { emoji: '💬', text: '하루 코칭 10회 (무료 3회)' },
];

export function ProUpgradeSheet({ visible, onClose }: Props) {
  const navigation = useNavigation();

  const handleUpgrade = () => {
    onClose();
    navigation.navigate('/settings/subscription');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalLayout title="PRO 전용 기능" onClose={onClose}>
        <View style={styles.content}>
          <Text style={styles.icon}>{'✨'}</Text>
          <Text style={styles.title}>PRO 구독으로 더 깊이 분석하세요</Text>
          <Text style={styles.subtitle}>시도 이력 조회는 Pro 전용 기능이에요</Text>

          <View style={styles.benefitList}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>{b.emoji}</Text>
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={handleUpgrade} activeOpacity={0.8}>
            <Text style={styles.ctaText}>PRO 시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.dismissText}>다음에</Text>
          </TouchableOpacity>
        </View>
      </ModalLayout>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  icon: {
    fontSize: 36,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  benefitList: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitEmoji: {
    fontSize: 18,
  },
  benefitText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: colors.blue900,
    borderRadius: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ctaText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.white,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
  },
  dismissText: {
    ...typography.detail,
    color: colors.textSecondary,
  },
});

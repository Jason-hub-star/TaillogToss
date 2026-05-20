/**
 * ProUpgradeSheet — Pro 전용 기능 접근 시 인터셉트 바텀시트
 * 시트 안에서 IAP 구매까지 완결 처리
 * Parity: UI-001, IAP-001
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, Image } from 'react-native';
import { ModalLayout } from 'components/shared/layouts/ModalLayout';
import { usePurchaseIAP } from 'lib/hooks/useSubscription';
import { ICONS } from 'lib/data/iconSources';
import { IAP_PRODUCTS, formatKRW, getDiscountPercent } from 'types/subscription';
import { colors, typography, spacing } from 'styles/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const BENEFITS = [
  { icon: ICONS['ic-analysis'], text: '심화 인사이트 리포트' },
  { icon: ICONS['badge-pro'], text: '광고 없이 이용' },
  { icon: ICONS['ic-report'], text: '시도 이력 상세 조회' },
  { icon: ICONS['ic-coaching'], text: '하루 코칭 10회 (무료 1회)' },
  { icon: ICONS['ic-training'], text: '다양한 훈련 방법 모두 이용' },
];

const proProduct = IAP_PRODUCTS.PRO_MONTHLY!;
const proDiscount = getDiscountPercent(proProduct);

export function ProUpgradeSheet({ visible, onClose }: Props) {
  const purchaseMutation = usePurchaseIAP();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleUpgrade = () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    purchaseMutation.mutate(proProduct.product_id, {
      onSuccess: (granted) => {
        setIsPurchasing(false);
        if (granted) {
          onClose();
          Alert.alert('구독 완료', 'PRO를 시작했어요!');
        } else {
          Alert.alert('결제를 완료하지 못했어요', '잠시 후 다시 시도해주세요.');
        }
      },
      onError: () => {
        setIsPurchasing(false);
        Alert.alert('결제를 완료하지 못했어요', '잠시 후 다시 시도해주세요.');
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalLayout title="PRO 전용 기능" onClose={onClose}>
        <View style={styles.content}>
          <Image source={{ uri: ICONS['badge-pro'] }} style={styles.icon} resizeMode="contain" />
          <Text style={styles.title}>PRO로 더 자세히 볼 수 있어요</Text>

          <View style={styles.priceRow}>
            {proProduct.list_price && (
              <Text style={styles.listPrice}>{formatKRW(proProduct.list_price)}</Text>
            )}
            {proDiscount !== null && (
              <Text style={styles.discountText}>{proDiscount}% 할인</Text>
            )}
            <Text style={styles.price}>{formatKRW(proProduct.price)}</Text>
            <Text style={styles.period}>/월</Text>
          </View>

          <View style={styles.benefitList}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefitRow}>
                <Image source={{ uri: b.icon }} style={styles.benefitIcon} resizeMode="contain" />
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.ctaButton, isPurchasing && styles.ctaButtonDisabled]}
            onPress={handleUpgrade}
            activeOpacity={0.8}
            disabled={isPurchasing}
          >
            <Text style={styles.ctaText}>
              {isPurchasing ? '처리하고 있어요' : 'PRO 시작하기'}
            </Text>
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
    width: 44,
    height: 44,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.xl,
  },
  listPrice: {
    ...typography.detail,
    color: colors.grey400,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  discountText: {
    ...typography.badge,
    fontWeight: '700',
    color: colors.orange700,
    marginBottom: 5,
  },
  price: {
    ...typography.heroTitle,
    fontWeight: '800',
    color: colors.primaryBlue,
  },
  period: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 3,
    marginLeft: 2,
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
  benefitIcon: {
    width: 24,
    height: 24,
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
  ctaButtonDisabled: {
    opacity: 0.5,
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

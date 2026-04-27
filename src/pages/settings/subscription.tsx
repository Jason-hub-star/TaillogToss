/**
 * 구독/결제 관리 화면 — Card Stack 레이아웃 (PRO 플랜 + 토큰 IAP)
 * 패턴 B(상세형): Navbar + ScrollView + 플랜 카드 + BottomCTA
 * Parity: APP-001, IAP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { useAuth } from 'stores/AuthContext';
import { isB2BRole } from 'stores/OrgContext';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { ErrorState } from 'components/tds-ext';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { useCurrentSubscription, useIsPro, usePurchaseIAP, useRestoreSubscription } from 'lib/hooks/useSubscription';
import { IAP_PRODUCTS, DOG_LIMITS } from 'types/subscription';
import { B2B_IAP_PRODUCTS } from 'types/b2b';
import type { IAPProduct } from 'types/subscription';
import { colors, typography } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';

export const Route = createRoute('/settings/subscription', {
  component: SubscriptionPage,
  screenOptions: { headerShown: false },
});

const PRO_FEATURES: Array<{ icon: string; iconSource?: string; label: string }> = [
  { icon: '🤖', label: 'AI 코칭 무제한' },
  { icon: '🐕', iconSource: ICONS['ic-dog'], label: `다견 기능 최대 ${DOG_LIMITS.PRO}마리` },
  { icon: '📊', iconSource: ICONS['ic-analysis'], label: '심화 인사이트 리포트' },
  { icon: '📅', label: '훈련 계획 무제한 (Plan A/B/C)' },
];

const FREE_FEATURES = [
  { label: 'AI 코칭', free: '하루 3회', pro: '무제한' },
  { label: '다견 기능', free: `${DOG_LIMITS.FREE}마리`, pro: `${DOG_LIMITS.PRO}마리` },
  { label: '훈련 계획', free: 'Plan A', pro: '무제한 (A/B/C)' },
] as const;

function SubscriptionPage() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isReady } = usePageGuard({ currentPath: '/settings/subscription' });
  const { data: subscription, isLoading, isError, refetch } = useCurrentSubscription(user?.id);
  const isPro = useIsPro(user?.id);
  const purchaseMutation = usePurchaseIAP();
  const restoreMutation = useRestoreSubscription();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handlePurchase = useCallback((productId: string) => {
    setPurchasingId(productId);
    purchaseMutation.mutate(productId, {
      onSuccess: (granted) => {
        setPurchasingId(null);
        if (granted) {
          Alert.alert('구독 완료', 'PRO 구독이 시작되었어요!', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert('구매 실패', '결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
        }
      },
      onError: () => {
        setPurchasingId(null);
        Alert.alert('구매 실패', '결제 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
      },
    });
  }, [purchaseMutation]);

  const handleRestore = useCallback(() => {
    if (!user?.id) return;
    restoreMutation.mutate(user.id, {
      onSuccess: () => Alert.alert('복원 완료', '구독 정보가 복원되었습니다.'),
      onError: () => Alert.alert('복원 실패', '복원할 구독 정보가 없습니다.'),
    });
  }, [user?.id, restoreMutation]);

  if (!isReady) return null;

  if (isError) {
    return (
      <DetailLayout title="구독 관리" onBack={() => navigation.goBack()}>
        <ErrorState onRetry={() => void refetch()} />
      </DetailLayout>
    );
  }

  const proProduct = IAP_PRODUCTS.PRO_MONTHLY as IAPProduct;
  const token10 = IAP_PRODUCTS.AI_TOKEN_10 as IAPProduct;
  const token30 = IAP_PRODUCTS.AI_TOKEN_30 as IAPProduct;

  return (
    <DetailLayout title="구독 관리" onBack={() => navigation.goBack()}>
        {/* 현재 구독 상태 */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>현재 플랜</Text>
            <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
              <Text style={[styles.badgeText, isPro ? styles.badgeTextPro : styles.badgeTextFree]}>
                {isPro ? 'PRO' : 'FREE'}
              </Text>
            </View>
          </View>
          {isPro && subscription?.next_billing_date && (
            <Text style={styles.billingDate}>
              다음 결제일: {subscription.next_billing_date.slice(0, 10)}
            </Text>
          )}
          {!isPro && subscription && subscription.ai_tokens_remaining > 0 && (
            <Text style={styles.tokenInfo}>
              AI 토큰 잔여: {subscription.ai_tokens_remaining}회
            </Text>
          )}
          {isLoading && <SkeletonBox width={140} height={14} style={{ marginTop: 8 }} />}
        </View>

        {/* PRO 플랜 카드 */}
        {!isPro && (
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>PRO 월간 플랜</Text>
              <Text style={styles.planPrice}>
                ₩{proProduct.price.toLocaleString()}
                <Text style={styles.planPeriod}>/월</Text>
              </Text>
            </View>
            <View style={styles.featureList}>
              {PRO_FEATURES.map((f) => (
                <View key={f.label} style={styles.featureRow}>
                  {f.iconSource ? (
                    <Image source={{ uri: f.iconSource }} style={styles.featureIconImg} />
                  ) : (
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                  )}
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.purchaseButton, purchasingId === 'pro_monthly' && styles.buttonDisabled]}
              onPress={() => handlePurchase('pro_monthly')}
              disabled={!!purchasingId}
              activeOpacity={0.8}
            >
              <Text style={styles.purchaseButtonText}>
                {purchasingId === 'pro_monthly' ? '처리 중...' : 'PRO 시작하기'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 토큰 팩 */}
        <Text style={styles.sectionTitle}>AI 토큰 충전</Text>
        <View style={styles.tokenRow}>
          <View style={styles.tokenCard}>
            <View style={styles.badgePlaceholder} />
            <Text style={styles.tokenAmount}>10회</Text>
            <Text style={styles.tokenPrice}>₩{token10.price.toLocaleString()}</Text>
            <Text style={styles.tokenUnit}>회당 ₩190</Text>
            <TouchableOpacity
              style={[styles.tokenButton, purchasingId === 'ai_token_10' && styles.buttonDisabled]}
              onPress={() => handlePurchase('ai_token_10')}
              disabled={!!purchasingId}
              activeOpacity={0.8}
            >
              <Text style={styles.tokenButtonText}>
                {purchasingId === 'ai_token_10' ? '...' : '충전'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tokenCard}>
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>추천</Text>
            </View>
            <Text style={styles.tokenAmount}>30회</Text>
            <Text style={styles.tokenPrice}>₩{token30.price.toLocaleString()}</Text>
            <Text style={styles.tokenUnit}>회당 ₩163</Text>
            <TouchableOpacity
              style={[styles.tokenButton, styles.tokenButtonHighlight, purchasingId === 'ai_token_30' && styles.buttonDisabled]}
              onPress={() => handlePurchase('ai_token_30')}
              disabled={!!purchasingId}
              activeOpacity={0.8}
            >
              <Text style={[styles.tokenButtonText, styles.tokenButtonTextHighlight]}>
                {purchasingId === 'ai_token_30' ? '...' : '충전'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FREE vs PRO 비교 테이블 */}
        <Text style={styles.sectionTitle}>플랜 비교</Text>
        <View style={styles.compareTable}>
          <View style={styles.compareHeader}>
            <Text style={[styles.compareCell, styles.compareLabelCell]}>기능</Text>
            <Text style={[styles.compareCell, styles.compareValueCell]}>FREE</Text>
            <Text style={[styles.compareCell, styles.compareValueCell, styles.compareProCell]}>PRO</Text>
          </View>
          {FREE_FEATURES.map((row) => (
            <View key={row.label} style={styles.compareRow}>
              <Text style={[styles.compareCell, styles.compareLabelCell]}>{row.label}</Text>
              <Text style={[styles.compareCell, styles.compareValueCell]}>{row.free}</Text>
              <Text style={[styles.compareCell, styles.compareValueCell, styles.compareProValue]}>{row.pro}</Text>
            </View>
          ))}
        </View>

        {/* B2B 플랜 (B2B 역할일 때만 표시) */}
        {isB2BRole(user?.role) && (
          <>
            <Text style={styles.sectionTitle}>센터/훈련사 플랜</Text>
            <View style={styles.b2bGrid}>
              {Object.values(B2B_IAP_PRODUCTS).map((product: IAPProduct) => (
                <View key={product.product_id} style={styles.b2bCard}>
                  <Text style={styles.b2bName}>{product.name}</Text>
                  <Text style={styles.b2bPrice}>₩{product.price.toLocaleString()}/월</Text>
                  <Text style={styles.b2bDesc}>{product.description}</Text>
                  <TouchableOpacity
                    style={[styles.tokenButton, styles.tokenButtonHighlight, purchasingId === product.product_id && styles.buttonDisabled]}
                    onPress={() => handlePurchase(product.product_id)}
                    disabled={!!purchasingId}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tokenButtonText, styles.tokenButtonTextHighlight]}>
                      {purchasingId === product.product_id ? '...' : '구독'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 구독 복원 */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} activeOpacity={0.7}>
          <Text style={styles.restoreText}>구매 내역 복원</Text>
        </TouchableOpacity>
    </DetailLayout>
  );
}

const styles = StyleSheet.create({

  /* 현재 상태 카드 */
  statusCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { ...typography.label, fontWeight: '600', color: colors.textDark },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgePro: { backgroundColor: colors.primaryBlue },
  badgeFree: { backgroundColor: colors.border },
  badgeText: { ...typography.caption, fontWeight: '700' },
  badgeTextPro: { color: colors.white },
  badgeTextFree: { color: colors.grey600 },
  billingDate: { ...typography.caption, color: colors.grey600, marginTop: 8 },
  tokenInfo: { ...typography.caption, color: colors.primaryBlue, marginTop: 8 },

  /* PRO 플랜 카드 */
  planCard: {
    backgroundColor: colors.blue50,
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.primaryBlueLight,
  },
  planHeader: { marginBottom: 16 },
  planTitle: { ...typography.subtitle, fontWeight: '700', color: colors.primaryBlue },
  planPrice: { ...typography.heroTitle, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  planPeriod: { ...typography.detail, fontWeight: '400', color: colors.grey600 },
  featureList: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureIcon: { ...typography.label, marginRight: 10 },
  featureIconImg: { width: 20, height: 20, marginRight: 10 },
  featureLabel: { ...typography.bodySmall, color: colors.textDark },
  purchaseButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  purchaseButtonText: { color: colors.white, ...typography.label, fontWeight: '700' },

  /* 토큰 팩 */
  sectionTitle: { ...typography.label, fontWeight: '700', color: colors.textDark, marginBottom: 12 },
  tokenRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  tokenCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  badgePlaceholder: {
    height: 20,
    marginBottom: 8,
  },
  bestValueBadge: {
    backgroundColor: colors.orange700,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  bestValueText: { ...typography.badge, fontWeight: '700', color: colors.white },
  tokenAmount: { ...typography.sectionTitle, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  tokenPrice: { ...typography.label, fontWeight: '600', color: colors.textDark },
  tokenUnit: { ...typography.badge, color: colors.grey400, marginTop: 2, marginBottom: 12 },
  tokenButton: {
    borderWidth: 1,
    borderColor: colors.grey300,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  tokenButtonHighlight: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  tokenButtonText: { ...typography.detail, fontWeight: '600', color: colors.textDark },
  tokenButtonTextHighlight: { color: colors.white },

  /* 비교 테이블 */
  compareTable: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  compareHeader: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    paddingVertical: 10,
  },
  compareRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: 10,
  },
  compareCell: { paddingHorizontal: 12, ...typography.caption },
  compareLabelCell: { flex: 2, fontWeight: '600', color: colors.textDark },
  compareValueCell: { flex: 2, color: colors.grey600, textAlign: 'center' },
  compareProCell: { color: colors.primaryBlue, fontWeight: '600' },
  compareProValue: { color: colors.primaryBlue },

  /* 복원 */
  restoreButton: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { ...typography.detail, color: colors.grey400, textDecorationLine: 'underline' },

  /* B2B */
  b2bGrid: { gap: 12, marginBottom: 28 },
  b2bCard: {
    backgroundColor: colors.green50, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.green100,
  },
  b2bName: { ...typography.label, fontWeight: '700', color: colors.green700, marginBottom: 4 },
  b2bPrice: { ...typography.sectionTitle, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  b2bDesc: { ...typography.caption, color: colors.grey600, marginBottom: 12 },

  /* 공통 */
  buttonDisabled: { opacity: 0.5 },
});

/**
 * BannerAd — 토스 Ads SDK InlineAd 래퍼
 * B1(대시보드 96px) · B2(빠른기록 410px) · B3(훈련상세 96px)
 * 테스트 ID 사용 시 목업 플레이스홀더로 자동 전환
 * Parity: AD-001
 *
 * 사용 예:
 *   <BannerAd placement="B1" />
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BannerPlacement } from 'types/ads';
import { BANNER_PLACEMENT_CONFIG } from 'types/ads';
import { getAdGroupId, isMockMode } from 'lib/ads/config';
import { useBannerAd } from 'lib/hooks/useBannerAd';
import { colors, typography } from 'styles/tokens';

const COLLAPSE_AFTER_IMPRESSION_DELAY_MS = 1200;

export interface BannerAdProps {
  placement: BannerPlacement;
  testID?: string;
  collapseAfterImpression?: boolean;
}

export function BannerAd({ placement, testID, collapseAfterImpression = true }: BannerAdProps) {
  const config = BANNER_PLACEMENT_CONFIG[placement];
  const { canShow, onAdRendered, onAdImpression, onAdClicked, onNoFill, onAdFailedToRender } =
    useBannerAd(placement);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
  }, []);

  const scheduleCollapse = useCallback(() => {
    if (!collapseAfterImpression || collapseTimerRef.current) return;
    collapseTimerRef.current = setTimeout(() => {
      setIsCollapsed(true);
      collapseTimerRef.current = null;
    }, COLLAPSE_AFTER_IMPRESSION_DELAY_MS);
  }, [collapseAfterImpression]);

  const handleAdImpression = useCallback((details?: unknown) => {
    onAdImpression(details);
    scheduleCollapse();
  }, [onAdImpression, scheduleCollapse]);

  const handleNoFill = useCallback((details?: unknown) => {
    setIsCollapsed(true);
    onNoFill(details);
  }, [onNoFill]);

  const handleAdFailedToRender = useCallback((details?: unknown) => {
    setIsCollapsed(true);
    onAdFailedToRender(details);
  }, [onAdFailedToRender]);

  if (!canShow || isCollapsed) return null;

  const height = config.variant === 'card' ? 410 : 96;
  const adGroupId = getAdGroupId(placement);

  // 테스트 ID 환경 — 실 SDK 없이 플레이스홀더 렌더링
  if (isMockMode(placement)) {
    return (
      <View style={[styles.mock, { height }]} testID={testID}>
        <Text style={styles.mockLabel}>[광고 미리보기] {config.description}</Text>
        <Text style={styles.mockSub}>{placement} · {config.variant} · {height}px</Text>
      </View>
    );
  }

  // 프로덕션 — 실 InlineAd 컴포넌트
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { InlineAd } = require('@apps-in-toss/framework') as {
    InlineAd: React.ComponentType<InlineAdProps>;
  };

  return (
    <View style={[styles.container, { height }]} testID={testID}>
      <InlineAd
        adGroupId={adGroupId}
        variant={config.variant}
        theme="auto"
        tone="blackAndWhite"
        impressFallbackOnMount={true}
        onAdRendered={onAdRendered}
        onAdImpression={handleAdImpression}
        onAdViewable={() => {}}
        onAdClicked={onAdClicked}
        onNoFill={handleNoFill}
        onAdFailedToRender={handleAdFailedToRender}
      />
    </View>
  );
}

interface InlineAdProps {
  adGroupId: string;
  variant: 'expanded' | 'card';
  theme: 'auto' | 'light' | 'dark';
  tone: 'blackAndWhite' | 'grey';
  impressFallbackOnMount: boolean;
  onAdRendered: (details?: unknown) => void;
  onAdImpression: (details?: unknown) => void;
  onAdViewable: (details?: unknown) => void;
  onAdClicked: () => void;
  onNoFill: (details?: unknown) => void;
  onAdFailedToRender: (details?: unknown) => void;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  mock: {
    width: '100%',
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  mockLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  mockSub: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});

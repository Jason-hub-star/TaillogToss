/**
 * CoachingBlockList — 6블록 순서 렌더링 + PRO 잠금/해제 처리
 * Block ①②③ 무료 + Block ④⑤⑥ PRO(Skeleton 블러 or 잠금 해제)
 * Parity: AI-001
 */
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { CoachingBlocks } from 'types/coaching';
import { InsightBlockView, ActionPlanBlockView, DogVoiceBlockView } from './FreeBlock';
import {
  LockedBlock,
  UnlockedBlock,
  Next7DaysView,
  RiskSignalsView,
  ConsultationView,
} from './LockedBlock';
import { RewardedAdButton } from 'components/shared/ads/RewardedAdButton';

interface CoachingBlockListProps {
  blocks: CoachingBlocks;
  isPro: boolean;
  onToggleActionItem?: (itemId: string) => void;
  dogName?: string;
  dogImageUrl?: string | null;
}

export function CoachingBlockList({ blocks, isPro, onToggleActionItem, dogName, dogImageUrl }: CoachingBlockListProps) {
  const [adUnlocked, setAdUnlocked] = useState(false);
  const isUnlocked = isPro || adUnlocked;

  const handleAdReward = useCallback(() => {
    setAdUnlocked(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Block ① 행동 분석 인사이트 (무료) */}
      <InsightBlockView data={blocks.insight} />

      {/* Block ② 실행 계획 (무료) */}
      <ActionPlanBlockView data={blocks.action_plan} onToggleItem={onToggleActionItem} />

      {/* Block ③ 강아지 시점 메시지 (무료) */}
      <DogVoiceBlockView data={blocks.dog_voice} dogName={dogName} dogImageUrl={dogImageUrl} />

      {/* R3 광고 터치포인트 — PRO가 아니고 광고 미시청 시 */}
      {!isUnlocked && (
        <View style={styles.adSection}>
          <RewardedAdButton
            placement="R3"
            label="광고 보고 오늘의 코칭 열기"
            onRewarded={handleAdReward}
          />
        </View>
      )}

      {/* Block ④ 7일 맞춤 플랜 (PRO) */}
      {isUnlocked ? (
        <UnlockedBlock blockKey="next_7_days">
          <Next7DaysView data={blocks.next_7_days} />
        </UnlockedBlock>
      ) : (
        <LockedBlock blockKey="next_7_days" />
      )}

      {/* Block ⑤ 위험 신호 분석 (PRO) */}
      {isUnlocked ? (
        <UnlockedBlock blockKey="risk_signals">
          <RiskSignalsView data={blocks.risk_signals} />
        </UnlockedBlock>
      ) : (
        <LockedBlock blockKey="risk_signals" />
      )}

      {/* Block ⑥ 전문가 상담 질문 (PRO) */}
      {isUnlocked ? (
        <UnlockedBlock blockKey="consultation_questions">
          <ConsultationView data={blocks.consultation_questions} />
        </UnlockedBlock>
      ) : (
        <LockedBlock blockKey="consultation_questions" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  adSection: {
    marginVertical: 8,
  },
});

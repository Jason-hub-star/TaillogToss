/**
 * CoachingBlockList — 6블록 순서 렌더링
 * Block ①②③: 무료/Pro 공개
 * Block ④⑤⑥: isPro=true → 공개, isPro=false → LockedBlock 잠금 표시
 * Parity: AI-001
 */
import React from 'react';
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

interface CoachingBlockListProps {
  blocks: CoachingBlocks;
  onToggleActionItem?: (itemId: string) => void;
  onNavigateToTraining?: () => void;
  dogName?: string;
  dogImageUrl?: string | null;
  isPro?: boolean;
}

export function CoachingBlockList({ blocks, onToggleActionItem, onNavigateToTraining, dogName, dogImageUrl, isPro = false }: CoachingBlockListProps) {
  return (
    <View style={styles.container}>
      {/* Block ① 행동 분석 인사이트 */}
      <InsightBlockView data={blocks.insight} />

      {/* Block ② 실행 계획 */}
      <ActionPlanBlockView data={blocks.action_plan} onToggleItem={onToggleActionItem} onNavigateToTraining={onNavigateToTraining} />

      {/* Block ③ 강아지 시점 메시지 */}
      <DogVoiceBlockView data={blocks.dog_voice} dogName={dogName} dogImageUrl={dogImageUrl} />

      {/* Block ④ 7일 맞춤 플랜 — Pro 전용 */}
      {isPro ? (
        <UnlockedBlock blockKey="next_7_days">
          <Next7DaysView data={blocks.next_7_days} />
        </UnlockedBlock>
      ) : (
        <LockedBlock blockKey="next_7_days" />
      )}

      {/* Block ⑤ 위험 신호 분석 — Pro 전용 */}
      {isPro ? (
        <UnlockedBlock blockKey="risk_signals">
          <RiskSignalsView data={blocks.risk_signals} />
        </UnlockedBlock>
      ) : (
        <LockedBlock blockKey="risk_signals" />
      )}

      {/* Block ⑥ 전문가 상담 질문 — Pro 전용 */}
      {isPro ? (
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
});

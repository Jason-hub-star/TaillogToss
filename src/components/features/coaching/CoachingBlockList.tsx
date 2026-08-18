/**
 * CoachingBlockList — 6블록 순서 렌더링
 * 생성된 코칭 결과는 FREE/PRO 모두 6블록 전체 공개
 * Parity: AI-001
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CoachingBlocks } from 'types/coaching';
import type { CurriculumId } from 'types/training';
import { InsightBlockView, ActionPlanBlockView, DogVoiceBlockView } from './FreeBlock';
import {
  UnlockedBlock,
  Next7DaysView,
  RiskSignalsView,
  ConsultationView,
} from './LockedBlock';

interface CoachingBlockListProps {
  blocks: CoachingBlocks;
  onToggleActionItem?: (itemId: string) => void;
  onNavigateToTraining?: (curriculumId?: CurriculumId | null) => void;
  dogName?: string;
  dogImageUrl?: string | null;
  isPro?: boolean;
  generatedAt?: string;
}

export function CoachingBlockList({ blocks, onToggleActionItem, onNavigateToTraining, dogName, dogImageUrl, isPro = false, generatedAt }: CoachingBlockListProps) {
  return (
    <View style={styles.container}>
      {/* Block ① 행동 분석 인사이트 */}
      <InsightBlockView data={blocks.insight} />

      {/* Block ② 실행 계획 */}
      <ActionPlanBlockView
        data={blocks.action_plan}
        isPro={isPro}
        onToggleItem={onToggleActionItem}
        onNavigateToTraining={onNavigateToTraining}
      />

      {/* Block ③ 강아지 시점 메시지 */}
      <DogVoiceBlockView data={blocks.dog_voice} dogName={dogName} dogImageUrl={dogImageUrl} />

      {/* Block ④ 7일 맞춤 플랜 */}
      <UnlockedBlock blockKey="next_7_days">
        <Next7DaysView data={blocks.next_7_days} generatedAt={generatedAt} />
      </UnlockedBlock>

      {/* Block ⑤ 위험 신호 분석 */}
      <UnlockedBlock blockKey="risk_signals" defaultCollapsed>
        <RiskSignalsView data={blocks.risk_signals} />
      </UnlockedBlock>

      {/* Block ⑥ 전문가 상담 질문 */}
      <UnlockedBlock blockKey="consultation_questions" defaultCollapsed>
        <ConsultationView data={blocks.consultation_questions} />
      </UnlockedBlock>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
});

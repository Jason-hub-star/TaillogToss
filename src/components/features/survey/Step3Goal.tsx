/**
 * Step 3: 목표 & 과거 기록 (Goals + History + Preferences)
 * Phase 3: UI/UX & AI Enrichment — 7단계를 3단계로 압축
 * Parity: UIUX-004
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep5, SurveyStep6, SurveyStep7, BehaviorType } from 'types/dog';

const BEHAVIOR_LABELS: Record<BehaviorType, string> = {
  barking: '짖음/울음',
  aggression: '공격성',
  anxiety: '분리불안',
  destructive: '파괴행동',
  reactivity: '과잉반응',
  leash_pulling: '리드줄 당김',
  jumping: '점핑',
  resource_guarding: '자원 지키기',
  separation: '배변 문제',
  other: '기타',
};

const AI_TONE_OPTIONS = [
  { key: 'empathetic', label: '공감 중심' },
  { key: 'solution', label: '해결책 중심' },
];

const AI_PERSPECTIVE_OPTIONS = [
  { key: 'coach', label: '전문 훈련사' },
  { key: 'dog', label: '반려견의 입장' },
];

interface Props {
  step5: SurveyStep5;
  step6: SurveyStep6;
  step7: SurveyStep7;
  availableBehaviors: BehaviorType[];
  onChange: (step5: SurveyStep5, step6: SurveyStep6, step7: SurveyStep7) => void;
}

export function Step3Goal({ step5, step6, step7, availableBehaviors, onChange }: Props) {
  const update5 = (partial: Partial<SurveyStep5>) => {
    onChange({ ...step5, ...partial }, step6, step7);
  };

  const update6 = (partial: Partial<SurveyStep6>) => {
    onChange(step5, { ...step6, ...partial }, step7);
  };

  const update7 = (partial: Partial<SurveyStep7>) => {
    onChange(step5, step6, { ...step7, ...partial });
  };

  const behaviorItems = availableBehaviors.map((b) => ({
    key: b,
    label: BEHAVIOR_LABELS[b] || b,
  }));

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>가장 먼저 해결하고 싶은 고민</Text>
        <Text style={styles.subtitle}>AI 코칭의 우선순위가 됩니다</Text>
        
        <ChipGroup
          items={behaviorItems}
          selectedKeys={[step6.priority_behavior]}
          onSelect={(key) => update6({ priority_behavior: key as BehaviorType })}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>과거 교육 경험</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>전문가(훈련사)의 도움을 받은 적이 있나요?</Text>
          <Switch
            value={step5.professional_help}
            onValueChange={(v) => update5({ professional_help: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 코칭 스타일 선호</Text>
        
        <Text style={styles.label}>대화 톤</Text>
        <ChipGroup
          items={AI_TONE_OPTIONS}
          selectedKeys={[step7.ai_tone]}
          onSelect={(key) => update7({ ai_tone: key as SurveyStep7['ai_tone'] })}
        />

        <Text style={styles.label}>조언 관점</Text>
        <ChipGroup
          items={AI_PERSPECTIVE_OPTIONS}
          selectedKeys={[step7.ai_perspective]}
          onSelect={(key) => update7({ ai_perspective: key as SurveyStep7['ai_perspective'] })}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>AI 분석 결과 알림 받기</Text>
          <Switch
            value={step7.notification_consent}
            onValueChange={(v) => update7({ notification_consent: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 24 },
  sectionTitle: { ...typography.subtitle, fontWeight: '700', color: colors.textPrimary, marginTop: 12, marginBottom: 4 },
  subtitle: { ...typography.detail, color: colors.textSecondary, marginBottom: 16 },
  label: { ...typography.detail, fontWeight: '600', color: colors.textDark, marginTop: 16, marginBottom: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  switchLabel: { ...typography.bodySmall, color: colors.textDark, flex: 1, marginRight: 16 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
});

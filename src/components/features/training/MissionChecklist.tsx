/**
 * MissionChecklist — 일별 스텝 체크리스트 + 팁 표시
 * Accordion 활용, variant별 instruction 오버라이드 적용
 * Parity: UI-001
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { TrainingStep, PlanVariant } from 'types/training';
import { colors, typography } from 'styles/tokens';

interface MissionChecklistProps {
  steps: TrainingStep[];
  completedStepIds: string[];
  currentVariant: PlanVariant;
  onToggleStep: (stepId: string) => void;
}

export function MissionChecklist({
  steps,
  completedStepIds,
  currentVariant,
  onToggleStep,
}: MissionChecklistProps) {
  return (
    <View style={styles.container}>
      {steps.map((s) => (
        <StepItem
          key={s.id}
          step={s}
          isCompleted={completedStepIds.includes(s.id)}
          variant={currentVariant}
          onToggle={() => onToggleStep(s.id)}
        />
      ))}
    </View>
  );
}

// ──────────────────────────────────────
// Individual step item
// ──────────────────────────────────────

function StepItem({
  step,
  isCompleted,
  variant,
  onToggle,
}: {
  step: TrainingStep;
  isCompleted: boolean;
  variant: PlanVariant;
  onToggle: () => void;
}) {
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const variantData = step.variants[variant];
  const instruction = variantData?.instruction_override ?? step.instruction;
  const duration = variantData?.duration_override ?? step.duration_minutes;

  return (
    <View style={styles.stepCard}>
      <TouchableOpacity style={styles.stepHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.checkbox, isCompleted && styles.checkboxDone]}>
          {isCompleted && <Text style={styles.checkmark}>{'✓'}</Text>}
        </View>
        <View style={styles.stepContent}>
          <Text style={[styles.stepInstruction, isCompleted && styles.stepDone]}>{instruction}</Text>
          <View style={styles.stepMeta}>
            <Text style={styles.duration}>{'⏱'} {duration}분</Text>
            {variantData?.difficulty_note && variantData.difficulty_note !== '표준 방법' && (
              <View style={styles.variantTag}>
                <Text style={styles.variantTagText}>Plan {variant}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Tips section */}
      {step.tips.length > 0 && (
        <View style={styles.tipsSection}>
          <TouchableOpacity
            onPress={() => setTipsExpanded(!tipsExpanded)}
            style={styles.tipsToggle}
          >
            <Text style={styles.tipsToggleText}>
              {tipsExpanded ? '팁 접기' : '팁 보기'} {tipsExpanded ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {tipsExpanded && (
            <View style={styles.tipsList}>
              {step.tips.map((tip, i) => (
                <View key={i} style={styles.tipItem}>
                  <Text style={styles.tipIcon}>{'💡'}</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  stepCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.grey300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  checkmark: {
    color: colors.white,
    ...typography.detail,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    ...typography.bodySmall,
    color: colors.textDark,
    marginBottom: 8,
  },
  stepDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  variantTag: {
    backgroundColor: colors.primaryBlueLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  variantTagText: {
    ...typography.badge,
    fontWeight: '600',
    color: colors.primaryBlue,
  },
  tipsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tipsToggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tipsToggleText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '500',
  },
  tipsList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.blue50,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryBlue,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    paddingTop: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  tipIcon: {
    ...typography.detail,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    ...typography.caption,
    color: colors.grey600,
  },
});

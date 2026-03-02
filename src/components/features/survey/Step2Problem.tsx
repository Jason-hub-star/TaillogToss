/**
 * Step 2: 행동 고민 & 상황 (Behavior + Triggers)
 * Phase 3: UI/UX & AI Enrichment — 7단계를 3단계로 압축
 * Parity: UIUX-004
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep3, SurveyStep4, BehaviorType } from 'types/dog';

const BEHAVIOR_OPTIONS: { key: BehaviorType; label: string }[] = [
  { key: 'barking', label: '짖음/울음' },
  { key: 'aggression', label: '공격성' },
  { key: 'anxiety', label: '분리불안' },
  { key: 'destructive', label: '파괴행동' },
  { key: 'reactivity', label: '과잉반응' },
  { key: 'leash_pulling', label: '리드줄 당김' },
  { key: 'jumping', label: '점핑' },
  { key: 'resource_guarding', label: '자원 지키기' },
  { key: 'separation', label: '배변 문제' },
  { key: 'other', label: '기타' },
];

const TRIGGER_OPTIONS = [
  { key: 'strangers', label: '낯선 사람' },
  { key: 'other_dogs', label: '다른 강아지' },
  { key: 'loud_noise', label: '큰 소리' },
  { key: 'alone', label: '혼자 있을 때' },
  { key: 'mealtime', label: '식사 시간' },
  { key: 'walk', label: '산책 중' },
  { key: 'car', label: '차 안' },
  { key: 'vet', label: '병원 방문' },
];

const SEVERITY_LABELS = ['매우 낮음', '낮음', '보통', '심함', '매우 심함'];

const TIME_OPTIONS = [
  { key: 'morning', label: '아침' },
  { key: 'afternoon', label: '오후' },
  { key: 'evening', label: '저녁' },
  { key: 'night', label: '밤' },
  { key: 'random', label: '불규칙' },
];

interface Props {
  step3: SurveyStep3;
  step4: SurveyStep4;
  onChange: (step3: SurveyStep3, step4: SurveyStep4) => void;
}

export function Step2Problem({ step3, step4, onChange }: Props) {
  const handleBehaviorSelect = (key: string) => {
    const behavior = key as BehaviorType;
    const exists = step3.primary_behaviors.includes(behavior);

    let nextBehaviors: BehaviorType[];
    if (exists) {
      nextBehaviors = step3.primary_behaviors.filter((b) => b !== behavior);
    } else if (step3.primary_behaviors.length < 3) {
      nextBehaviors = [...step3.primary_behaviors, behavior];
    } else {
      return;
    }

    const nextSeverity = { ...step3.severity };
    if (!exists) {
      nextSeverity[behavior] = 3; // Default severity
    } else {
      delete nextSeverity[behavior];
    }

    onChange({ primary_behaviors: nextBehaviors, severity: nextSeverity }, step4);
  };

  const updateSeverity = (behavior: BehaviorType, level: number) => {
    const nextSeverity = { ...step3.severity, [behavior]: level as 1 | 2 | 3 | 4 | 5 };
    onChange({ ...step3, severity: nextSeverity }, step4);
  };

  const handleTriggerSelect = (key: string) => {
    const exists = step4.triggers.includes(key);
    const nextTriggers = exists
      ? step4.triggers.filter((t) => t !== key)
      : [...step4.triggers, key];
    onChange(step3, { ...step4, triggers: nextTriggers });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>어떤 행동이 가장 고민인가요?</Text>
        <Text style={styles.subtitle}>최대 3개까지 선택 가능</Text>
        
        <ChipGroup
          items={BEHAVIOR_OPTIONS}
          selectedKeys={step3.primary_behaviors}
          onSelect={handleBehaviorSelect}
          multiSelect
        />
      </View>

      {step3.primary_behaviors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>선택한 행동의 심각도</Text>
          {step3.primary_behaviors.map((behavior) => {
            const label = BEHAVIOR_OPTIONS.find((o) => o.key === behavior)?.label || behavior;
            const currentLevel = step3.severity[behavior] || 3;

            return (
              <View key={behavior} style={styles.severityCard}>
                <Text style={styles.behaviorName}>{label}</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.ratingButton,
                        currentLevel === level && styles.ratingButtonActive,
                      ]}
                      onPress={() => updateSeverity(behavior, level)}
                    >
                      <Text
                        style={[
                          styles.ratingText,
                          currentLevel === level && styles.ratingTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.severityHint}>{SEVERITY_LABELS[currentLevel - 1]}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>주로 발생하는 상황</Text>
        <Text style={styles.subtitle}>해당하는 것을 모두 선택해주세요</Text>
        
        <ChipGroup
          items={TRIGGER_OPTIONS}
          selectedKeys={step4.triggers}
          onSelect={handleTriggerSelect}
          multiSelect
        />

        <Text style={styles.label}>가장 심한 시간대</Text>
        <ChipGroup
          items={TIME_OPTIONS}
          selectedKeys={[step4.worst_time]}
          onSelect={(key) => onChange(step3, { ...step4, worst_time: key as SurveyStep4['worst_time'] })}
        />
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 24 },
  sectionTitle: { ...typography.subtitle, fontWeight: '700', color: colors.textPrimary, marginTop: 12, marginBottom: 4 },
  subtitle: { ...typography.detail, color: colors.textSecondary, marginBottom: 16 },
  label: { ...typography.detail, fontWeight: '600', color: colors.textDark, marginTop: 8, marginBottom: 12 },
  severityCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  behaviorName: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ratingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ratingText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  ratingTextActive: { color: '#FFFFFF' },
  severityHint: { ...typography.detail, color: colors.textSecondary, textAlign: 'center', fontSize: 11 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
});

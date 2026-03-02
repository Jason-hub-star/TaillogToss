/**
 * Step 2: 행동 고민 & 상황 (개선된 UI 2.0)
 * 기타 주관식 입력 필드 및 심각도 UI 조건부 렌더링
 * Parity: UIUX-004 고도화
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
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
  { key: 'other', label: '직접 입력(기타)' },
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
      if (behavior !== 'other') nextSeverity[behavior] = 3;
    } else {
      delete nextSeverity[behavior];
    }

    // behavior가 'other'에서 해제될 때 설명도 초기화
    const nextDesc = !exists && behavior === 'other' ? step3.other_behavior_desc : (behavior === 'other' ? '' : step3.other_behavior_desc);

    onChange({ primary_behaviors: nextBehaviors, severity: nextSeverity, other_behavior_desc: nextDesc }, step4);
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
        <Text style={styles.subtitle}>최대 3개까지 선택 가능 (AI 정밀 분석용)</Text>
        
        <ChipGroup
          items={BEHAVIOR_OPTIONS}
          selectedKeys={step3.primary_behaviors}
          onSelect={handleBehaviorSelect}
          multiSelect
        />

        {step3.primary_behaviors.includes('other') && (
          <View style={styles.otherInputContainer}>
            <Text style={styles.label}>구체적인 행동을 적어주세요</Text>
            <TextInput
              style={styles.textArea}
              value={step3.other_behavior_desc || ''}
              onChangeText={(text) => {
                onChange({ ...step3, other_behavior_desc: text }, step4);
              }}
              placeholder="예: 초인종 소리만 나면 5분 넘게 하울링을 해요"
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </View>
        )}
      </View>

      {step3.primary_behaviors.filter(b => b !== 'other').length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>선택한 행동의 심각도</Text>
          {step3.primary_behaviors.map((behavior) => {
            if (behavior === 'other') return null;
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

        <View style={styles.otherTriggerInput}>
          <TextInput
            style={styles.input}
            value={step4.custom_trigger || ''}
            onChangeText={(text) => {
              onChange(step3, { ...step4, custom_trigger: text });
            }}
            placeholder="상황을 직접 입력하세요 (선택)"
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
  label: { ...typography.detail, fontWeight: '600', color: colors.textDark, marginTop: 16, marginBottom: 12 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    ...typography.bodySmall,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  otherInputContainer: { marginTop: 8 },
  severityCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  behaviorName: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ratingButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F2F4F6', // 좀 더 연한 회색 배경
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonActive: { 
    backgroundColor: colors.primaryBlue, 
    borderColor: colors.primaryBlue,
  },
  ratingText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  ratingTextActive: { color: '#FFFFFF' },
  severityHint: { ...typography.detail, color: colors.textSecondary, textAlign: 'center', fontSize: 11 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
  // Other trigger
  addTriggerBtn: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12 },
  addTriggerText: { ...typography.detail, color: colors.primaryBlue, fontWeight: '600' },
  otherTriggerInput: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: '#FFFFFF' },
  saveTriggerBtn: { backgroundColor: colors.primaryBlue, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  saveTriggerText: { color: '#FFFFFF', fontWeight: '600' },
});

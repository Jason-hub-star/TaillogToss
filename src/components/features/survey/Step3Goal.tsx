/**
 * Step 3: AI 정밀 분석용 Deep Dive (기질 & 훈련)
 * 확장된 명령어 리스트 및 직접 입력 기능 추가
 * Parity: UIUX-004 고도화
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { ChipGroup } from 'components/tds-ext';
import type { SurveyStep5, SurveyStep6, SurveyStep7, BehaviorType } from 'types/dog';

const RATING_LABELS = ['매우 낮음', '낮음', '보통', '높음', '매우 높음'];

const COMMAND_CATEGORIES = [
  {
    title: '필수 기초',
    items: [
      { key: 'sit', label: '앉아' },
      { key: 'down', label: '엎드려' },
      { key: 'stay', label: '기다려' },
      { key: 'come', label: '이리와' },
      { key: 'no', label: '안 돼 / 그만' },
    ],
  },
  {
    title: '생활 매너',
    items: [
      { key: 'heel', label: '옆에 서(Heel)' },
      { key: 'house', label: '하우스' },
      { key: 'drop', label: '놔(Drop)' },
      { key: 'stand', label: '서(Stand)' },
      { key: 'focus', label: '지켜봐(Focus)' },
    ],
  },
  {
    title: '유대감 트릭',
    items: [
      { key: 'hand', label: '손' },
      { key: 'highfive', label: '하이파이브' },
      { key: 'roll', label: '굴러' },
      { key: 'bang', label: '빵!' },
      { key: 'spin', label: '돌아' },
      { key: 'touch', label: '코(Touch)' },
    ],
  },
  {
    title: '고급 훈련',
    items: [
      { key: 'back', label: '뒤로 가' },
      { key: 'fetch', label: '가져와' },
      { key: 'speak', label: '짖어 / 조용히' },
      { key: 'jump', label: '점프' },
    ],
  },
];

interface Props {
  step5: SurveyStep5;
  step6: SurveyStep6;
  step7: SurveyStep7;
  availableBehaviors: BehaviorType[];
  onChange: (step5: SurveyStep5, step6: SurveyStep6, step7: SurveyStep7) => void;
}

export function Step3Goal({ step5, step6, step7, availableBehaviors, onChange }: Props) {
  const [customCommand, setCustomCommand] = useState('');

  const update7 = (partial: Partial<SurveyStep7>) => {
    onChange(step5, step6, { ...step7, ...partial });
  };

  const handleCommandToggle = (key: string) => {
    const next = step7.mastered_commands.includes(key)
      ? step7.mastered_commands.filter(k => k !== key)
      : [...step7.mastered_commands, key];
    update7({ mastered_commands: next });
  };

  const addCustomCommand = () => {
    if (customCommand.trim()) {
      const next = [...step7.mastered_commands, customCommand.trim()];
      update7({ mastered_commands: next });
      setCustomCommand('');
    }
  };

  const renderRatingSelector = (label: string, value: number, onSelect: (v: number) => void) => (
    <View style={styles.ratingSection}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity 
            key={num} 
            style={[styles.ratingBtn, value === num && styles.ratingBtnActive]}
            onPress={() => onSelect(num)}
          >
            <Text style={[styles.ratingText, value === num && styles.ratingTextActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingHint}>{RATING_LABELS[value - 1] || '선택해주세요'}</Text>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>반려견의 기질을 알려주세요</Text>
        <Text style={styles.subtitle}>AI가 아이의 성격에 맞춘 솔루션을 제안합니다</Text>
        
        {renderRatingSelector('에너지 레벨 (활동량)', step7.energy_score, (v) => update7({ energy_score: v }))}
        {renderRatingSelector('사회성 (우호도)', step7.social_score, (v) => update7({ social_score: v }))}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>보상 선호도</Text>
        <Text style={styles.subtitle}>무엇을 줄 때 가장 행복해하나요? (1~5점)</Text>
        
        {renderRatingSelector('😋 맛있는 간식', step7.rewards.treats, (v) => update7({ rewards: { ...step7.rewards, treats: v } }))}
        {renderRatingSelector('🎾 장난감과 놀이', step7.rewards.play, (v) => update7({ rewards: { ...step7.rewards, play: v } }))}
        {renderRatingSelector('🥰 보호자의 칭찬/스킨십', step7.rewards.praise, (v) => update7({ rewards: { ...step7.rewards, praise: v } }))}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기초 복종 및 트릭</Text>
        <Text style={styles.subtitle}>이미 마스터한 명령어를 모두 선택해주세요</Text>
        
        {COMMAND_CATEGORIES.map((cat) => (
          <View key={cat.title} style={styles.commandCategory}>
            <Text style={styles.catTitle}>{cat.title}</Text>
            <ChipGroup
              items={cat.items}
              selectedKeys={step7.mastered_commands}
              onSelect={handleCommandToggle}
              multiSelect
            />
          </View>
        ))}

        <View style={styles.customCommandInput}>
          <TextInput
            style={styles.input}
            value={customCommand}
            onChangeText={setCustomCommand}
            placeholder="기타 명령어 직접 입력"
            placeholderTextColor={colors.placeholder}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addCustomCommand}>
            <Text style={styles.addBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
        
        {/* 직접 입력된 명령어들 목록 표시 */}
        <View style={styles.customList}>
          {step7.mastered_commands
            .filter(k => !COMMAND_CATEGORIES.some(cat => cat.items.some(i => i.key === k)))
            .map(cmd => (
              <TouchableOpacity key={cmd} style={styles.customChip} onPress={() => handleCommandToggle(cmd)}>
                <Text style={styles.customChipText}>{cmd} ✕</Text>
              </TouchableOpacity>
            ))
          }
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>과거 교육 및 환경</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>전문가(훈련사)의 도움을 받은 적이 있나요?</Text>
          <Switch
            value={step5.professional_help}
            onValueChange={(v) => onChange({ ...step5, professional_help: v }, step6, step7)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>분석 완료 시 알림을 받을까요?</Text>
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
  label: { ...typography.detail, fontWeight: '600', color: colors.textDark, marginTop: 16, marginBottom: 12 },
  ratingSection: { marginBottom: 20 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ratingBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ratingBtnActive: { 
    backgroundColor: colors.primaryBlue, 
    borderColor: colors.primaryBlue,
  },
  ratingText: { ...typography.body, color: colors.textSecondary, fontWeight: '700' },
  ratingTextActive: { color: '#FFFFFF' },
  ratingHint: { ...typography.detail, color: colors.primaryBlue, textAlign: 'center', fontWeight: '600' },
  // Commands
  commandCategory: { marginTop: 16 },
  catTitle: { ...typography.detail, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, fontSize: 12 },
  customCommandInput: { flexDirection: 'row', gap: 8, marginTop: 24 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: '#FFFFFF', ...typography.bodySmall },
  addBtn: { backgroundColor: colors.primaryBlue, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontWeight: '600' },
  customList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  customChip: { backgroundColor: colors.backgroundSecondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.primaryBlue },
  customChipText: { ...typography.detail, color: colors.primaryBlue, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  switchLabel: { ...typography.bodySmall, color: colors.textDark, flex: 1, marginRight: 16 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
});

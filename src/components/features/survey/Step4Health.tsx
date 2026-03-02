/**
 * Step 4: 건강 & 환경 스트레스 (Deep Context)
 * 신체 통증, 알러지, 외부 소음 예민도 등 AI 정밀 분석용 데이터
 * Parity: UIUX-004 신규
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput } from 'react-native';
import { colors, typography } from 'styles/tokens';
import type { SurveyStep8 } from 'types/dog';

const RATING_LABELS = ['매우 낮음', '낮음', '보통', '심함', '매우 심함'];

interface Props {
  value: SurveyStep8;
  onChange: (value: SurveyStep8) => void;
}

export function Step4Health({ value, onChange }: Props) {
  const updateHealth = (partial: Partial<SurveyStep8['health']>) => {
    onChange({ ...value, health: { ...value.health, ...partial } });
  };

  const updateEnv = (partial: Partial<SurveyStep8['environment_stress']>) => {
    onChange({ ...value, environment_stress: { ...value.environment_stress, ...partial } });
  };

  const renderRatingSelector = (label: string, val: number, onSelect: (v: number) => void) => (
    <View style={styles.ratingSection}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity 
            key={num} 
            style={[styles.ratingBtn, val === num && styles.ratingBtnActive]}
            onPress={() => onSelect(num)}
          >
            <Text style={[styles.ratingText, val === num && styles.ratingTextActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingHint}>{RATING_LABELS[val - 1] || '선택해주세요'}</Text>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>건강 상태 체크</Text>
        <Text style={styles.subtitle}>통증이나 질환은 행동 문제의 원인이 될 수 있습니다</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>관절이나 신체 통증이 의심되나요?</Text>
          <Switch
            value={value.health.has_pain}
            onValueChange={(v) => updateHealth({ has_pain: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>알러지나 피부 질환이 있나요?</Text>
          <Switch
            value={value.health.has_allergy}
            onValueChange={(v) => updateHealth({ has_allergy: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>현재 과체중 상태인가요?</Text>
          <Switch
            value={value.health.is_overweight}
            onValueChange={(v) => updateHealth({ is_overweight: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <TextInput
          style={styles.textArea}
          value={value.health.notes}
          onChangeText={(t) => updateHealth({ notes: t })}
          placeholder="기타 건강 특이사항을 입력해주세요 (선택)"
          placeholderTextColor={colors.placeholder}
          multiline
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>환경적 스트레스 요인</Text>
        <Text style={styles.subtitle}>생활 환경의 자극 정도를 알려주세요</Text>
        
        {renderRatingSelector('🔊 외부 소음 예민도', value.environment_stress.noise_sensitivity, (v) => updateEnv({ noise_sensitivity: v }))}

        <Text style={styles.label}>집을 방문하는 외부인 빈도</Text>
        <View style={styles.optionRow}>
          {(['rare', 'sometimes', 'frequent'] as const).map((opt) => (
            <TouchableOpacity 
              key={opt}
              style={[styles.optionBtn, value.environment_stress.visitor_frequency === opt && styles.optionBtnActive]}
              onPress={() => updateEnv({ visitor_frequency: opt })}
            >
              <Text style={[styles.optionText, value.environment_stress.visitor_frequency === opt && styles.optionTextActive]}>
                {opt === 'rare' ? '거의 없음' : opt === 'sometimes' ? '가끔 있음' : '자주 있음'}
              </Text>
            </TouchableOpacity>
          ))}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  switchLabel: { ...typography.bodySmall, color: colors.textDark, flex: 1, marginRight: 16 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
    marginTop: 16,
    ...typography.bodySmall,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
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
  optionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  optionBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderLight },
  optionBtnActive: { backgroundColor: colors.primaryBlue, borderColor: colors.primaryBlue },
  optionText: { ...typography.detail, color: colors.textSecondary, fontWeight: '600' },
  optionTextActive: { color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
});

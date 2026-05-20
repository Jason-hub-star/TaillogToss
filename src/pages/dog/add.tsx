/**
 * 반려견 추가 — 서베이 축소판 (이름/품종/성별 3필드)
 * 멀티독: 무료 1마리, PRO 5마리
 * 와이어프레임 9-8 변형, 패턴 C (입력폼형)
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { SkeletonBox } from 'components/tds-ext/SkeletonBox';
import { BackButton, BackButtonSpacer } from 'components/shared/BackButton';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useCreateDogFromSurvey } from 'lib/hooks/useDogs';
import type { DogSex, SurveyData } from 'types/dog';
import { colors, typography } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';

export const Route = createRoute('/dog/add', {
  component: DogAddPage,
});

const SEX_OPTIONS: { value: DogSex; label: string }[] = [
  { value: 'MALE', label: '수컷' },
  { value: 'FEMALE', label: '암컷' },
  { value: 'MALE_NEUTERED', label: '수컷 (중성화)' },
  { value: 'FEMALE_NEUTERED', label: '암컷 (중성화)' },
];

function DogAddPage() {
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dog/add', requireFeature: 'multiDog' });
  const { user } = useAuth();
  const { setDogs, dogs } = useActiveDog();
  const createDog = useCreateDogFromSurvey();

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<DogSex>('MALE');

  const handleSave = useCallback(() => {
    if (!user?.id || !name.trim() || !breed.trim()) return;

    // 최소 SurveyData 구조로 생성 (createDogFromSurvey API가 step1_basic만 사용)
    const survey: SurveyData = {
      step1_basic: { name: name.trim(), breed: breed.trim(), age_months: 0, sex },
      step2_environment: {
        household: {
          members_count: 1,
          has_children: false,
          has_other_pets: dogs.length > 0,
          living_type: 'apartment',
        },
        daily_alone_hours: 0,
      },
      step3_behavior: { primary_behaviors: [], severity: {} as never },
      step4_triggers: { triggers: [], worst_time: 'random' },
      step5_history: { past_attempts: [], professional_help: false },
      step6_goals: { goals: [], priority_behavior: 'other' },
      step7_preferences: {
        energy_score: 3,
        social_score: 3,
        mastered_commands: [],
        rewards: { treats: 3, play: 3, praise: 3 },
        notification_consent: true,
      },
      step8_health_context: {
        health: { has_pain: false, has_allergy: false, is_overweight: false, notes: '' },
        environment_stress: { noise_sensitivity: 3, visitor_frequency: 'sometimes', walk_environment: 'normal' },
      },
    };

    createDog.mutate(
      { userId: user.id, survey },
      {
        onSuccess: (newDog) => {
          setDogs([...dogs, newDog]);
          Alert.alert('등록 완료', `${newDog.name}이(가) 추가되었어요!`, [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
        },
        onError: () => {
          Alert.alert('등록하지 못했어요', '잠시 후 다시 시도해주세요.');
        },
      }
    );
  }, [user?.id, name, breed, sex, dogs, createDog, setDogs, navigation]);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navbar}>
          <BackButtonSpacer />
          <SkeletonBox width={100} height={20} />
          <BackButtonSpacer />
        </View>
        <View style={styles.scrollContent}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <SkeletonBox width={80} height={80} borderRadius={40} />
          </View>
          <SkeletonBox width={60} height={14} style={{ marginBottom: 6 }} />
          <SkeletonBox width="100%" height={44} borderRadius={10} style={{ marginBottom: 20 }} />
          <SkeletonBox width={60} height={14} style={{ marginBottom: 6 }} />
          <SkeletonBox width="100%" height={44} borderRadius={10} style={{ marginBottom: 20 }} />
          <SkeletonBox width={60} height={14} style={{ marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBox key={i} width={80} height={40} borderRadius={20} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const breedTrimmed = breed.trim();
  const isBreedValid = breedTrimmed.length >= 2 && breedTrimmed.length <= 30;
  const canSave = name.trim().length > 0 && isBreedValid && !createDog.isPending;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navbar}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.navTitle}>반려견 추가</Text>
        <BackButtonSpacer />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 아바타 */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Image source={{ uri: ICONS['ic-dog'] }} style={styles.avatarIcon} resizeMode="contain" />
          </View>
          <Text style={styles.avatarHint}>새 반려견을 등록해주세요</Text>
        </View>

        {/* 이름 */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>
            이름 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="반려견 이름"
            placeholderTextColor={colors.placeholder}
            autoFocus
          />
        </View>

        {/* 품종 */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>
            품종 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={breed}
            onChangeText={setBreed}
            placeholder="품종 (예: 비숑, 골든리트리버)"
            placeholderTextColor={colors.placeholder}
            maxLength={30}
          />
          {breedTrimmed.length > 0 && breedTrimmed.length < 2 && (
            <Text style={styles.validationHint}>품종 이름은 2자 이상 입력해주세요</Text>
          )}
        </View>

        {/* 성별 */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>성별</Text>
          <View style={styles.sexRow}>
            {SEX_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sexChip, sex === opt.value && styles.sexChipSelected]}
                onPress={() => setSex(opt.value)}
              >
                <Text style={[styles.sexText, sex === opt.value && styles.sexTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* 저장 버튼 */}
      <View style={styles.bottomCTA}>
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>{createDog.isPending ? '등록하고 있어요' : '등록하기'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceTertiary,
  },
  navTitle: { ...typography.body, fontWeight: '600', color: colors.grey950 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarIcon: { width: 44, height: 44 },
  avatarHint: { ...typography.detail, color: colors.textSecondary },

  // Inputs
  inputGroup: { marginBottom: 20 },
  fieldLabel: { ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  required: { color: colors.red600 },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.label,
    color: colors.grey950,
  },

  // Sex chips
  sexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sexChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  sexChipSelected: { borderColor: colors.primaryBlue, backgroundColor: colors.blue50 },
  sexText: { ...typography.detail, color: colors.grey600 },
  sexTextSelected: { color: colors.primaryBlue, fontWeight: '600' },

  // Bottom CTA
  bottomCTA: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceTertiary,
    backgroundColor: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveDisabled: { backgroundColor: colors.placeholder },
  saveText: { ...typography.body, fontWeight: '700', color: colors.white },
  validationHint: { ...typography.caption, color: colors.red600, marginTop: 4 },
});

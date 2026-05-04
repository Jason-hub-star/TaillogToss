/**
 * Stage 1 설문 — 기본 프로필 (7문항, 필수, 스킵 불가)
 * 최초 진입 시 Dog 생성 → stage2-form 또는 dashboard 이동
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { FormLayout } from 'components/shared/layouts/FormLayout';
import { DogPhotoPicker } from 'components/features/dog/DogPhotoPicker';
import { useSubmitStage1 } from 'lib/hooks/useSurvey';
import { useDraftSave } from 'lib/hooks/useDraftSave';
import { useAuth } from 'stores/AuthContext';
import { uploadDogProfileImage } from 'lib/api/dog';
import { supabase } from 'lib/api/supabase';
import { colors, typography, spacing } from 'styles/tokens';
import type { DogSex, SurveyStage1Request } from 'types/dog';

export const Route = createRoute('/onboarding/stage1-form', {
  component: Stage1FormPage,
  screenOptions: { headerShown: false },
});

type AgeMode = 'birthdate' | 'approximate';

interface Stage1Draft {
  name: string;
  sex: DogSex | null;
  breed: string;
  isNeutered: boolean | null;
  weightText: string;
  ageMode: AgeMode;
  birthdateText: string;
  approxAge: ApproxAge | null;
  profileImageUrl: string | null;
}
type ApproxAge = '1살 미만' | '1~2살' | '3~5살' | '6~9살' | '10살 이상';

const APPROX_AGES: ApproxAge[] = ['1살 미만', '1~2살', '3~5살', '6~9살', '10살 이상'];
const APPROX_BIRTH_MAP: Record<ApproxAge, string> = {
  '1살 미만': '2026-01-01',
  '1~2살': '2025-01-01',
  '3~5살': '2022-01-01',
  '6~9살': '2018-01-01',
  '10살 이상': '2014-01-01',
};

function Stage1FormPage() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const submitStage1 = useSubmitStage1(user?.id ?? '');

  const [name, setName] = useState('');
  const [sex, setSex] = useState<DogSex | null>(null);
  const [breed, setBreed] = useState('');
  const [isNeutered, setIsNeutered] = useState<boolean | null>(null);
  const [weightText, setWeightText] = useState('');
  const [ageMode, setAgeMode] = useState<AgeMode>('birthdate');
  const [birthdateText, setBirthdateText] = useState('');
  const [approxAge, setApproxAge] = useState<ApproxAge | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const draftData: Stage1Draft = {
    name, sex, breed, isNeutered, weightText, ageMode, birthdateText, approxAge, profileImageUrl,
  };

  const { loadedDraft, clearDraft } = useDraftSave<Stage1Draft>({
    stageKey: 'stage1_new',
    data: draftData,
  });

  useEffect(() => {
    if (!loadedDraft || name) return;
    setName(loadedDraft.name);
    setSex(loadedDraft.sex);
    setBreed(loadedDraft.breed);
    setIsNeutered(loadedDraft.isNeutered);
    setWeightText(loadedDraft.weightText);
    setAgeMode(loadedDraft.ageMode);
    setBirthdateText(loadedDraft.birthdateText);
    setApproxAge(loadedDraft.approxAge);
    setProfileImageUrl(loadedDraft.profileImageUrl);
  }, [loadedDraft]);

  const isValid = name.trim().length > 0 && sex !== null;

  const buildBirthDate = (): string | null => {
    if (ageMode === 'approximate' && approxAge) return APPROX_BIRTH_MAP[approxAge];
    if (ageMode === 'birthdate' && birthdateText.trim()) return birthdateText.trim();
    return null;
  };

  const buildSex = (): DogSex => {
    if (sex === 'MALE') return isNeutered ? 'MALE_NEUTERED' : 'MALE';
    return isNeutered ? 'FEMALE_NEUTERED' : 'FEMALE';
  };

  const handleSubmit = useCallback(() => {
    if (!isValid || !user) return;

    // profile_image_url은 로컬 URI — 백엔드에 전송하지 않고 dog 생성 후 Supabase Storage에 직접 업로드
    const payload: SurveyStage1Request = {
      name: name.trim(),
      breed: breed.trim() || undefined,
      birth_date: buildBirthDate(),
      sex: buildSex(),
      weight_kg: weightText ? parseFloat(weightText) : undefined,
    };

    submitStage1.mutate(payload, {
      onSuccess: async (dog) => {
        // 사진이 있으면 Supabase Storage에 직접 업로드 후 DB 업데이트
        if (profileImageUrl) {
          try {
            const publicUrl = await uploadDogProfileImage(user.id, dog.id, profileImageUrl);
            await supabase.from('dogs').update({ profile_image_url: publicUrl }).eq('id', dog.id);
          } catch (e) {
            if (__DEV__) console.warn('[APP-001] photo upload failed (non-fatal):', e);
          }
        }
        await clearDraft();
        navigation.navigate('/onboarding/stage2-form', { dogId: dog.id, dogName: dog.name });
      },
      onError: (err) => {
        Alert.alert('저장 실패', err.message.slice(0, 200));
      },
    });
  }, [isValid, user, name, breed, sex, isNeutered, weightText, approxAge, birthdateText, profileImageUrl, submitStage1, navigation]);

  return (
    <FormLayout
      title="우리 아이를 소개해줘요"
      onBack={() => navigation.navigate('/onboarding/welcome')}
      bottomCTA={{
        label: submitStage1.isPending ? '저장 중...' : '다음',
        onPress: handleSubmit,
        disabled: !isValid || submitStage1.isPending,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* 프로필 사진 */}
          <View style={styles.photoSection}>
            <DogPhotoPicker
              uri={profileImageUrl ?? undefined}
              onSelect={setProfileImageUrl}
            />
          </View>

          {/* 이름 */}
          <Section label="우리 아이 이름이 뭐예요?" required>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="예: 정베"
              placeholderTextColor={colors.textSecondary}
              maxLength={20}
            />
          </Section>

          {/* 성별 */}
          <Section label="어떤 친구예요?" required>
            <View style={styles.chipRow}>
              {(['MALE', 'FEMALE'] as const).map((s) => (
                <ChoiceChip
                  key={s}
                  label={s === 'MALE' ? '🐶 남자아이' : '🌸 여자아이'}
                  selected={sex === s}
                  onPress={() => setSex(s)}
                />
              ))}
            </View>
          </Section>

          {/* 중성화 */}
          {sex !== null && (
            <Section label="중성화를 했나요?">
              <View style={styles.chipRow}>
                <ChoiceChip label="✅ 했어요" selected={isNeutered === true} onPress={() => setIsNeutered(true)} />
                <ChoiceChip label="❌ 안 했어요" selected={isNeutered === false} onPress={() => setIsNeutered(false)} />
                <ChoiceChip label="🤔 모르겠어요" selected={isNeutered === null && sex !== null} onPress={() => setIsNeutered(null)} />
              </View>
            </Section>
          )}

          {/* 견종 */}
          <Section label="어떤 견종이에요?">
            <TextInput
              style={styles.input}
              value={breed}
              onChangeText={setBreed}
              placeholder="말티푸, 믹스견, 잘 모르겠어요..."
              placeholderTextColor={colors.textSecondary}
              maxLength={40}
            />
          </Section>

          {/* 몸무게 */}
          <Section label="몸무게가 얼마예요? (kg)">
            <TextInput
              style={[styles.input, styles.inputNarrow]}
              value={weightText}
              onChangeText={setWeightText}
              placeholder="4.1"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              maxLength={5}
            />
          </Section>

          {/* 나이/생년월일 */}
          <Section label="언제 태어났어요?">
            <View style={styles.chipRow}>
              <ChoiceChip
                label="📅 날짜 알아요"
                selected={ageMode === 'birthdate'}
                onPress={() => setAgeMode('birthdate')}
              />
              <ChoiceChip
                label="🤔 대략만 알아요"
                selected={ageMode === 'approximate'}
                onPress={() => setAgeMode('approximate')}
              />
            </View>
            {ageMode === 'birthdate' ? (
              <TextInput
                style={[styles.input, styles.mt8]}
                value={birthdateText}
                onChangeText={setBirthdateText}
                placeholder="2023-11-08"
                placeholderTextColor={colors.textSecondary}
                maxLength={10}
              />
            ) : (
              <View style={[styles.chipRow, styles.chipWrap, styles.mt8]}>
                {APPROX_AGES.map((a) => (
                  <ChoiceChip
                    key={a}
                    label={a}
                    selected={approxAge === a}
                    onPress={() => setApproxAge(a)}
                  />
                ))}
              </View>
            )}
          </Section>

        </ScrollView>
      </KeyboardAvoidingView>
    </FormLayout>
  );
}

function Section({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function ChoiceChip({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.screenHorizontal, paddingBottom: 40 },
  photoSection: { alignItems: 'center', marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionLabel: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm },
  required: { color: colors.primary },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
  },
  inputNarrow: { width: 120 },
  chipRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: spacing.sm },
  chipWrap: { flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBlueLight },
  chipText: { ...typography.bodySmall, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
  mt8: { marginTop: 8 },
});

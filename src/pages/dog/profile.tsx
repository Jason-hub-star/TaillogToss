/**
 * 반려견 프로필 편집 — TextField×4 + Switch + Accordion×3 + 삭제
 * 와이어프레임 9-8, 패턴 C (입력폼형)
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { Accordion } from 'components/tds-ext/Accordion';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { BackButton, BackButtonSpacer } from 'components/shared/BackButton';
import { DogPhotoPicker } from 'components/features/dog/DogPhotoPicker';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useDogDetail, useDogEnv, useUpdateDog, useUpdateDogEnv, useDeleteDog } from 'lib/hooks/useDogs';
import { uploadDogProfileImage } from 'lib/api/dog';
import type { CaseIntakePayload, DogSex, HouseholdInfo } from 'types/dog';
import { colors, spacing, typography } from 'styles/tokens';
import { usePageDataPerformance } from 'lib/performance/usePageDataPerformance';

export const Route = createRoute('/dog/profile', {
  component: DogProfilePage,
  screenOptions: { headerShown: false },
});

/** 행동 트리거 8카테고리 (서베이 Step 6 동일) */
const TRIGGER_OPTIONS = [
  '짖음/울음',
  '공격성',
  '분리불안',
  '파괴행동',
  '마운팅',
  '과잉흥분',
  '배변문제',
  '공포/회피',
] as const;

const LIVING_TYPES: { value: HouseholdInfo['living_type']; label: string }[] = [
  { value: 'apartment', label: '아파트' },
  { value: 'house', label: '주택' },
  { value: 'villa', label: '빌라' },
  { value: 'other', label: '기타' },
];

function summarizeCaseIntake(intake?: CaseIntakePayload) {
  const sections = intake?.sections;
  const grooming = sections?.grooming_handling;
  const episodeCount = intake?.behavior_episodes?.length ?? 0;
  const coreCompleted = [
    Boolean(sections?.case_summary && sections?.owner_goals?.length),
    episodeCount > 0,
    Boolean(grooming?.grooming_context || grooming?.noise_reaction || grooming?.noise_sources?.length),
  ].filter(Boolean).length;

  return {
    coreCompleted,
    episodeCount,
    caseSummary: sections?.case_summary || '아직 저장된 핵심 고민이 없어요.',
    goals: sections?.owner_goals ?? [],
    handling: [
      ...(grooming?.handling_sensitive_areas ?? []),
      ...(grooming?.grooming_tools ?? []),
    ].slice(0, 4),
    noise: grooming?.noise_sources ?? [],
    healthNote: typeof sections?.health_context?.healthNote === 'string'
      ? sections.health_context.healthNote
      : '',
    status: intake?.status ?? 'draft',
  };
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (value && typeof value === 'object' && Array.isArray((value as { ids?: unknown }).ids)) {
    return (value as { ids: unknown[] }).ids.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAgeYears(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    years -= 1;
  }
  return Math.max(years, 0);
}

function buildBirthDateFromAge(ageText: string, currentBirthDate?: string | null): string | null {
  const trimmed = ageText.replace(/\D/g, '');
  if (!trimmed) return null;

  const years = Number(trimmed);
  if (!Number.isInteger(years) || years < 0 || years > 40) {
    throw new Error('나이는 0~40 사이의 숫자로 입력해주세요.');
  }

  if (currentBirthDate && getAgeYears(currentBirthDate) === years) {
    return currentBirthDate.slice(0, 10);
  }

  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return formatDate(date);
}

function DogProfilePage() {
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dog/profile' });
  const { user } = useAuth();
  const { activeDog } = useActiveDog();

  const dogDetailQuery = useDogDetail(activeDog?.id);
  const dogEnvQuery = useDogEnv(activeDog?.id);
  const { data: dog, isLoading, isError, refetch } = dogDetailQuery;
  const { data: dogEnv } = dogEnvQuery;
  const displayDog = dog ?? activeDog;
  const updateDog = useUpdateDog();
  const updateDogEnv = useUpdateDogEnv();
  const deleteDogMutation = useDeleteDog();
  const isSaving = updateDog.isPending || updateDogEnv.isPending;
  const caseIntake = dogEnv?.onboarding_survey?.stage3_response?.case_intake;
  const intakeSummary = summarizeCaseIntake(caseIntake);

  // Basic info
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [ageText, setAgeText] = useState('');
  const [isNeutered, setIsNeutered] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);

  // Environment
  const [livingType, setLivingType] = useState<HouseholdInfo['living_type']>('apartment');
  const [membersCount, setMembersCount] = useState('1');

  // Health
  const [healthNotes, setHealthNotes] = useState('');

  // Triggers
  const [triggers, setTriggers] = useState<string[]>([]);

  // Initialize from cached/active dog data first, then hydrate with detail.
  useEffect(() => {
    if (displayDog) {
      setName(displayDog.name);
      setBreed(displayDog.breed ?? '');
      setProfileImageUrl(displayDog.profile_image_url ?? undefined);
      if (displayDog.birth_date) {
        setAgeText(String(getAgeYears(displayDog.birth_date)));
      } else {
        setAgeText('');
      }
      setIsNeutered(displayDog.sex === 'MALE_NEUTERED' || displayDog.sex === 'FEMALE_NEUTERED');
    }
  }, [displayDog]);

  useEffect(() => {
    if (dogEnv) {
      setLivingType(dogEnv.household_info.living_type);
      setMembersCount(String(dogEnv.household_info.members_count));
      setHealthNotes(dogEnv.health_meta.vet_notes ?? '');
      setTriggers(normalizeStringList(dogEnv.triggers));
    }
  }, [dogEnv]);

  usePageDataPerformance('/dog/profile', [
    {
      label: 'shell_ready',
      ready: isReady,
      meta: { activeDogId: activeDog?.id },
    },
    {
      label: 'cached_data_ready',
      ready: isReady && !!displayDog,
      meta: {
        activeDogId: activeDog?.id,
        hasActiveDog: !!activeDog,
        hasDogDetail: !!dog,
        hasDogEnv: !!dogEnv,
        dogDetailIsFetching: dogDetailQuery.isFetching,
        dogEnvIsFetching: dogEnvQuery.isFetching,
        dogDetailDataUpdatedAt: dogDetailQuery.dataUpdatedAt || null,
        dogEnvDataUpdatedAt: dogEnvQuery.dataUpdatedAt || null,
      },
    },
    {
      label: 'fresh_data_settled',
      ready:
        isReady &&
        !!activeDog?.id &&
        !dogDetailQuery.isLoading &&
        !dogDetailQuery.isFetching &&
        !dogEnvQuery.isLoading &&
        !dogEnvQuery.isFetching &&
        !isError,
      meta: {
        activeDogId: activeDog?.id,
        hasDogDetail: !!dog,
        hasDogEnv: !!dogEnv,
        dogDetailDataUpdatedAt: dogDetailQuery.dataUpdatedAt || null,
        dogEnvDataUpdatedAt: dogEnvQuery.dataUpdatedAt || null,
      },
    },
  ]);

  const handleSave = useCallback(async () => {
    if (!activeDog?.id || !name.trim() || !user?.id) return;

    let finalImageUrl = profileImageUrl;

    // 사진이 변경된 경우 (로컬 URI인 경우) 업로드
    if (profileImageUrl && !profileImageUrl.startsWith('http')) {
      try {
        finalImageUrl = await uploadDogProfileImage(user.id, activeDog.id, profileImageUrl);
      } catch (e) {
        console.error('Image upload failed during profile save:', e);
        Alert.alert('사진 저장 실패', '사진 업로드에 실패했어요. 다시 선택한 뒤 저장해주세요.');
        return;
      }
    }

    const baseSex = (displayDog?.sex?.replace('_NEUTERED', '') ?? 'MALE') as 'MALE' | 'FEMALE';
    const newSex: DogSex = isNeutered ? (`${baseSex}_NEUTERED` as DogSex) : baseSex;

    let birthDate: string | null;
    try {
      birthDate = buildBirthDateFromAge(ageText, displayDog?.birth_date);
    } catch (error) {
      Alert.alert('나이 확인 필요', error instanceof Error ? error.message : '나이를 다시 입력해주세요.');
      return;
    }

    const members = Number(membersCount.trim());
    if (!Number.isInteger(members) || members < 1 || members > 20) {
      Alert.alert('가족 수 확인 필요', '가족 수는 1~20 사이의 숫자로 입력해주세요.');
      return;
    }

    const nextHousehold = {
      ...dogEnv?.household_info,
      living_type: livingType,
      members_count: members,
      has_children: dogEnv?.household_info?.has_children ?? false,
      has_other_pets: dogEnv?.household_info?.has_other_pets ?? false,
    };
    const nextHealth = {
      ...dogEnv?.health_meta,
      chronic_issues: dogEnv?.health_meta?.chronic_issues ?? [],
      medications: dogEnv?.health_meta?.medications ?? [],
      vet_notes: healthNotes.trim() || null,
    };

    try {
      await Promise.all([
        updateDog.mutateAsync({
          dogId: activeDog.id,
          updates: {
            name: name.trim(),
            breed: breed.trim(),
            birth_date: birthDate,
            sex: newSex,
            profile_image_url: finalImageUrl || null,
          },
        }),
        updateDogEnv.mutateAsync({
          dogId: activeDog.id,
          updates: {
            household_info: nextHousehold,
            health_meta: nextHealth,
            triggers,
          },
        }),
      ]);
      navigation.goBack();
    } catch (error) {
      console.error('[UIUX-006] dog profile save failed:', error);
      Alert.alert(
        '저장 실패',
        error instanceof Error ? error.message.slice(0, 180) : '프로필 저장에 실패했어요.',
      );
    }
  }, [
    activeDog?.id,
    user?.id,
    name,
    breed,
    ageText,
    isNeutered,
    displayDog?.sex,
    displayDog?.birth_date,
    profileImageUrl,
    membersCount,
    dogEnv?.household_info,
    dogEnv?.health_meta,
    livingType,
    healthNotes,
    triggers,
    updateDog,
    updateDogEnv,
    navigation,
  ]);

  const handleDelete = useCallback(() => {
    if (!activeDog?.id) return;
    Alert.alert('반려견 삭제', `${name}의 모든 데이터가 삭제됩니다. 정말 삭제하시겠어요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제하기',
        style: 'destructive',
        onPress: () => {
          deleteDogMutation.mutate(activeDog.id, {
            onSuccess: () => navigation.goBack(),
          });
        },
      },
    ]);
  }, [activeDog?.id, name, deleteDogMutation, navigation]);

  const toggleTrigger = useCallback((t: string) => {
    setTriggers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }, []);

  const handleEditProIntake = useCallback(() => {
    navigation.navigate('/onboarding/stage3-form', {
      dogId: activeDog?.id ?? '',
      dogName: displayDog?.name ?? activeDog?.name ?? '우리 강아지',
      mode: 'edit',
    });
  }, [activeDog?.id, activeDog?.name, displayDog?.name, navigation]);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <Navbar onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <Navbar onBack={() => navigation.goBack()} />
        <ErrorState onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (isLoading && !displayDog) {
    return (
      <SafeAreaView style={styles.safe}>
        <Navbar onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Navbar onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 프로필 사진 편집 */}
        <DogPhotoPicker 
          uri={profileImageUrl} 
          onSelect={setProfileImageUrl} 
        />

        {/* 기본 정보 */}
        <LabeledInput label="이름" value={name} onChangeText={setName} placeholder="반려견 이름" />
        <LabeledInput label="품종" value={breed} onChangeText={setBreed} placeholder="품종" />
        <LabeledInput
          label="나이 (세)"
          value={ageText}
          onChangeText={(text) => setAgeText(text.replace(/\D/g, ''))}
          placeholder="나이"
          keyboardType="numeric"
        />

        {/* 중성화 */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>중성화 여부</Text>
          <Switch
            value={isNeutered}
            onValueChange={setIsNeutered}
            trackColor={{ false: colors.border, true: colors.primaryBlue }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.proCard}>
          <View style={styles.proCardHeader}>
            <View>
              <Text style={styles.proTitle}>Pro 상담지 요약</Text>
              <Text style={styles.proMeta}>
                완성도 {intakeSummary.coreCompleted}/3 · 에피소드 {intakeSummary.episodeCount}개 · {intakeSummary.status === 'submitted' ? '제출됨' : '초안'}
              </Text>
            </View>
            <TouchableOpacity style={styles.proEditButton} onPress={handleEditProIntake} activeOpacity={0.7}>
              <Text style={styles.proEditText}>수정</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.proSummaryText}>{intakeSummary.caseSummary}</Text>
          {intakeSummary.goals.length ? (
            <SummaryLine label="목표" value={intakeSummary.goals.slice(0, 2).join(' / ')} />
          ) : null}
          {intakeSummary.handling.length ? (
            <SummaryLine label="핸들링" value={intakeSummary.handling.join(' / ')} />
          ) : null}
          {intakeSummary.noise.length ? (
            <SummaryLine label="소리" value={intakeSummary.noise.join(' / ')} />
          ) : null}
          {intakeSummary.healthNote ? (
            <SummaryLine label="건강" value={intakeSummary.healthNote} />
          ) : null}
        </View>

        {/* 환경 정보 */}
        <Accordion title="환경 정보">
          <Text style={styles.fieldLabel}>주거 형태</Text>
          <View style={styles.livingTypeRow}>
            {LIVING_TYPES.map((lt) => (
              <TouchableOpacity
                key={lt.value}
                style={[styles.livingTypeChip, livingType === lt.value && styles.livingTypeSelected]}
                onPress={() => setLivingType(lt.value)}
              >
                <Text
                  style={[
                    styles.livingTypeText,
                    livingType === lt.value && styles.livingTypeTextSelected,
                  ]}
                >
                  {lt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <LabeledInput
            label="가족 수"
            value={membersCount}
            onChangeText={setMembersCount}
            placeholder="1"
            keyboardType="numeric"
          />
        </Accordion>

        {/* 건강 정보 */}
        <Accordion title="건강 정보">
          <LabeledInput
            label="수의사 메모"
            value={healthNotes}
            onChangeText={setHealthNotes}
            placeholder="건강 특이사항"
            multiline
          />
        </Accordion>

        {/* 행동 트리거 */}
        <Accordion title="행동 트리거">
          <View style={styles.chipContainer}>
            {TRIGGER_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, triggers.includes(t) && styles.chipSelected]}
                onPress={() => toggleTrigger(t)}
              >
                <Text style={[styles.chipText, triggers.includes(t) && styles.chipTextSelected]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Accordion>

        {/* 반려견 삭제 */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>반려견 삭제</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 저장 버튼 */}
      <View style={styles.bottomCTA}>
        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || isSaving) && styles.saveDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || isSaving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>{isSaving ? '저장하고 있어요' : '저장'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────
// Sub-components
// ──────────────────────────────────────

function Navbar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.navbar}>
      <BackButton onPress={onBack} />
      <Text style={styles.navTitle}>반려견 프로필</Text>
      <BackButtonSpacer />
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && styles.textInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ──────────────────────────────────────
// Styles
// ──────────────────────────────────────

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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Form inputs
  inputGroup: { marginBottom: 16 },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.label,
    color: colors.grey950,
  },
  textInputMultiline: { height: 80, textAlignVertical: 'top' },

  // Switch row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  switchLabel: { ...typography.label, color: colors.grey950 },

  divider: { height: 1, backgroundColor: colors.surfaceTertiary, marginVertical: 8 },

  proCard: {
    borderWidth: 1,
    borderColor: colors.primaryBlueLight,
    borderRadius: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    marginVertical: spacing.lg,
  },
  proCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  proTitle: { ...typography.body, color: colors.grey950, fontWeight: '700' },
  proMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  proEditButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
  },
  proEditText: { ...typography.bodySmall, color: colors.primaryBlue, fontWeight: '700' },
  proSummaryText: { ...typography.bodySmall, color: colors.textPrimary, marginBottom: spacing.sm },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryLabel: { ...typography.caption, color: colors.textSecondary, width: 48, fontWeight: '700' },
  summaryValue: { ...typography.caption, color: colors.textPrimary, flex: 1 },

  // Living type chips
  livingTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  livingTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  livingTypeSelected: { borderColor: colors.primaryBlue, backgroundColor: colors.blue50 },
  livingTypeText: { ...typography.detail, color: colors.grey600 },
  livingTypeTextSelected: { color: colors.primaryBlue, fontWeight: '600' },

  // Trigger chips
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: { borderColor: colors.primaryBlue, backgroundColor: colors.blue50 },
  chipText: { ...typography.detail, color: colors.grey600 },
  chipTextSelected: { color: colors.primaryBlue, fontWeight: '600' },

  // Delete
  deleteButton: { marginTop: 32, paddingVertical: 8 },
  deleteText: { ...typography.bodySmall, color: colors.red600 },

  bottomSpacer: { height: 80 },

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
});

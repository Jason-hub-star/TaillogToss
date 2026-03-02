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
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Accordion } from 'components/tds-ext/Accordion';
import { ErrorState } from 'components/tds-ext/ErrorState';
import { DogAvatar } from 'components/features/dog/DogAvatar';
import { DogPhotoPicker } from 'components/features/dog/DogPhotoPicker';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useAuth } from 'stores/AuthContext';
import { useActiveDog } from 'stores/ActiveDogContext';
import { useDogDetail, useDogEnv, useUpdateDog, useDeleteDog } from 'lib/hooks/useDogs';
import { uploadDogProfileImage } from 'lib/api/dog';
import type { DogSex, HouseholdInfo } from 'types/dog';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/dog/profile', {
  component: DogProfilePage,
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

function DogProfilePage() {
  const navigation = useNavigation();
  const { isReady } = usePageGuard({ currentPath: '/dog/profile' });
  const { user } = useAuth();
  const { activeDog } = useActiveDog();

  const { data: dog, isLoading, isError, refetch } = useDogDetail(activeDog?.id);
  const { data: dogEnv } = useDogEnv(activeDog?.id);
  const updateDog = useUpdateDog();
  const deleteDogMutation = useDeleteDog();

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

  // Initialize from dog data
  useEffect(() => {
    if (dog) {
      setName(dog.name);
      setBreed(dog.breed);
      setProfileImageUrl(dog.profile_image_url ?? undefined);
      if (dog.birth_date) {
        const birth = new Date(dog.birth_date);
        const now = new Date();
        const years = Math.floor(
          (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        setAgeText(String(years));
      }
      setIsNeutered(dog.sex === 'MALE_NEUTERED' || dog.sex === 'FEMALE_NEUTERED');
    }
  }, [dog]);

  useEffect(() => {
    if (dogEnv) {
      setLivingType(dogEnv.household_info.living_type);
      setMembersCount(String(dogEnv.household_info.members_count));
      setHealthNotes(dogEnv.health_meta.vet_notes ?? '');
      setTriggers(dogEnv.triggers);
    }
  }, [dogEnv]);

  const handleSave = useCallback(async () => {
    if (!activeDog?.id || !name.trim() || !user?.id) return;

    let finalImageUrl = profileImageUrl;
    
    // 사진이 변경된 경우 (로컬 URI인 경우) 업로드
    if (profileImageUrl && !profileImageUrl.startsWith('http')) {
      try {
        finalImageUrl = await uploadDogProfileImage(user.id, activeDog.id, profileImageUrl);
      } catch (e) {
        console.error('Image upload failed during profile save:', e);
      }
    }

    const baseSex = (dog?.sex?.replace('_NEUTERED', '') ?? 'MALE') as 'MALE' | 'FEMALE';
    const newSex: DogSex = isNeutered ? (`${baseSex}_NEUTERED` as DogSex) : baseSex;

    updateDog.mutate(
      { 
        dogId: activeDog.id, 
        updates: { 
          name: name.trim(), 
          breed: breed.trim(), 
          sex: newSex,
          profile_image_url: finalImageUrl || null
        } 
      },
      { onSuccess: () => navigation.goBack() }
    );
  }, [activeDog?.id, user?.id, name, breed, isNeutered, dog?.sex, profileImageUrl, updateDog, navigation]);

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

  if (!isReady) return null;

  if (isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <Navbar onBack={() => navigation.goBack()} />
        <ErrorState onRetry={() => void refetch()} />
      </SafeAreaView>
    );
  }

  if (isLoading) {
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
          onChangeText={setAgeText}
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
          style={[styles.saveButton, (!name.trim() || updateDog.isPending) && styles.saveDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || updateDog.isPending}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>{updateDog.isPending ? '저장 중...' : '저장'}</Text>
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
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>{'←'}</Text>
      </TouchableOpacity>
      <Text style={styles.navTitle}>반려견 프로필</Text>
      <View style={styles.backButton} />
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
  backButton: { width: 40 },
  backText: { ...typography.sectionTitle, color: colors.grey950 },
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
  avatarEmoji: { ...typography.display },

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

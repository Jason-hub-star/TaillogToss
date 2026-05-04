/**
 * Ops Dog Add — 센터 강아지 등록 화면 v2
 * 사진 + 보호자 전화/주소 + 동물병원 + 동물등록번호 + 자유입력 반 배정
 * 성공 → /ops/today 이동
 * Parity: B2B-001
 *
 * NOTE: vet_name / animal_reg_no / parent_address는 UI 수집 후
 *       DB 마이그레이션(dogs 테이블 컬럼 추가) 완료 시 저장 예정.
 *       parent_phone은 org_dogs_pii에 btoa 저장 (추후 AES-GCM 교체).
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { colors, typography, spacing } from 'styles/tokens';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useCreateOrgDog } from 'lib/hooks/useOrg';
import { useOrg } from 'stores/OrgContext';
import { useAuth } from 'stores/AuthContext';
import { DogPhotoPicker } from 'components/features/dog/DogPhotoPicker';

export const Route = createRoute('/ops/dog-add', {
  component: OpsDogAddPage,
  screenOptions: { headerShown: false },
});

const SEX_OPTIONS: { value: 'MALE' | 'FEMALE'; label: string }[] = [
  { value: 'MALE', label: '수컷' },
  { value: 'FEMALE', label: '암컷' },
];

function OpsDogAddPage() {
  const { isReady } = usePageGuard({
    currentPath: '/ops/dog-add' as never,
    requireFeature: 'b2bOnly',
  });

  const navigation = useNavigation();
  const { org, isOrgLoading } = useOrg();
  const { user } = useAuth();
  const createOrgDog = useCreateOrgDog();

  // 필수
  const [dogName, setDogName] = useState('');
  const [sex, setSex] = useState<'MALE' | 'FEMALE'>('MALE');
  // 선택 — 기본 정보
  const [dogBreed, setDogBreed] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [groupTag, setGroupTag] = useState('');
  // 선택 — 보호자 정보
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  // 선택 — 의료 정보 (TODO: DB migration 후 저장)
  const [vetName, setVetName] = useState('');
  const [animalRegNo, setAnimalRegNo] = useState('');

  const [error, setError] = useState<string | null>(null);

  // 섹션 접기/펼치기
  const [showGuardianSection, setShowGuardianSection] = useState(false);
  const [showMedicalSection, setShowMedicalSection] = useState(false);

  const breedRef = useRef<TextInput>(null);
  const parentNameRef = useRef<TextInput>(null);
  const parentPhoneRef = useRef<TextInput>(null);

  const handleSubmit = useCallback(async () => {
    if (!org?.id || !user?.id) {
      setError('조직 정보를 불러올 수 없어요.');
      return;
    }
    if (!dogName.trim()) {
      setError('강아지 이름을 입력해주세요.');
      return;
    }
    setError(null);

    createOrgDog.mutate(
      {
        org_id: org.id,
        trainer_user_id: user.id,
        dog_name: dogName,
        dog_breed: dogBreed || undefined,
        dog_sex: sex,
        parent_name: parentName || undefined,
        parent_phone: parentPhone || undefined,
        parent_address: parentAddress || undefined,
        vet_name: vetName || undefined,
        animal_reg_no: animalRegNo || undefined,
        group_tag: groupTag || undefined,
      },
      {
        onSuccess: () => {
          navigation.navigate('/ops/today' as never);
        },
        onError: (err) => {
          setError('등록에 실패했어요. 다시 시도해주세요.');
          if (__DEV__) console.error('[B2B-001] createOrgDog failed', err);
        },
      },
    );
  }, [org, user, dogName, dogBreed, sex, parentName, parentPhone, groupTag, createOrgDog, navigation]);

  if (!isReady) return null;

  // org 로딩 중 — OrgBootstrap 완료 대기
  if (isOrgLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
        </View>
      </SafeAreaView>
    );
  }

  // org가 없으면 센터 등록 화면으로
  if (!org) {
    navigation.navigate('/ops/setup' as never);
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backText}>{'←'}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>강아지 등록</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 사진 */}
          <DogPhotoPicker uri={photoUri} onSelect={setPhotoUri} />

          {/* ── 기본 정보 ── */}
          <SectionTitle>기본 정보</SectionTitle>

          <FieldLabel required>이름</FieldLabel>
          <TextInput
            style={[styles.input, error && !dogName.trim() ? styles.inputError : null]}
            value={dogName}
            onChangeText={(v) => { setDogName(v); setError(null); }}
            placeholder="예: 뭉치"
            placeholderTextColor={colors.textTertiary}
            maxLength={20}
            returnKeyType="next"
            onSubmitEditing={() => breedRef.current?.focus()}
          />

          <FieldLabel>견종</FieldLabel>
          <TextInput
            ref={breedRef}
            style={styles.input}
            value={dogBreed}
            onChangeText={setDogBreed}
            placeholder="예: 골든 리트리버 (믹스 가능)"
            placeholderTextColor={colors.textTertiary}
            maxLength={30}
            returnKeyType="done"
          />

          <FieldLabel>성별</FieldLabel>
          <View style={styles.segmentRow}>
            {SEX_OPTIONS.map((opt) => {
              const active = sex === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setSex(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FieldLabel>반 배정</FieldLabel>
          <TextInput
            style={styles.input}
            value={groupTag}
            onChangeText={setGroupTag}
            placeholder="예: A반, 오전반, 재활반 (선택)"
            placeholderTextColor={colors.textTertiary}
            maxLength={20}
            returnKeyType="done"
          />

          {/* ── 보호자 정보 (펼침) ── */}
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setShowGuardianSection((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionToggleText}>보호자 정보</Text>
            <Text style={styles.sectionToggleArrow}>{showGuardianSection ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showGuardianSection && (
            <View>
              <FieldLabel>보호자 이름</FieldLabel>
              <TextInput
                ref={parentNameRef}
                style={styles.input}
                value={parentName}
                onChangeText={setParentName}
                placeholder="예: 김민준"
                placeholderTextColor={colors.textTertiary}
                maxLength={20}
                returnKeyType="next"
                onSubmitEditing={() => parentPhoneRef.current?.focus()}
              />

              <FieldLabel>보호자 전화번호</FieldLabel>
              <TextInput
                ref={parentPhoneRef}
                style={styles.input}
                value={parentPhone}
                onChangeText={setParentPhone}
                placeholder="예: 01012345678"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={11}
                returnKeyType="done"
              />
              <Text style={styles.fieldHint}>리포트 발송 시 알림에 사용돼요</Text>

              <FieldLabel>보호자 주소</FieldLabel>
              <TextInput
                style={styles.input}
                value={parentAddress}
                onChangeText={setParentAddress}
                placeholder="예: 서울 강남구 (선택)"
                placeholderTextColor={colors.textTertiary}
                maxLength={60}
                returnKeyType="done"
              />
            </View>
          )}

          {/* ── 의료 정보 (펼침) ── */}
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setShowMedicalSection((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionToggleText}>의료 정보</Text>
            <Text style={styles.sectionToggleArrow}>{showMedicalSection ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showMedicalSection && (
            <View>
              <FieldLabel>자주 가는 동물병원</FieldLabel>
              <TextInput
                style={styles.input}
                value={vetName}
                onChangeText={setVetName}
                placeholder="예: 강남 행복 동물병원 (선택)"
                placeholderTextColor={colors.textTertiary}
                maxLength={40}
                returnKeyType="done"
              />

              <FieldLabel>동물등록번호</FieldLabel>
              <TextInput
                style={styles.input}
                value={animalRegNo}
                onChangeText={setAnimalRegNo}
                placeholder="15자리 숫자 (선택)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={15}
                returnKeyType="done"
              />
            </View>
          )}

          {/* 에러 */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.bottomPad} />
        </ScrollView>

        {/* 하단 CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, (createOrgDog.isPending || !dogName.trim()) && styles.ctaDisabled]}
            onPress={handleSubmit}
            disabled={createOrgDog.isPending || !dogName.trim()}
            activeOpacity={0.85}
          >
            {createOrgDog.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.ctaText}>등록하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** 소형 헬퍼 컴포넌트 */
function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backText: { ...typography.sectionTitle, color: colors.textPrimary, paddingRight: spacing.sm },
  navTitle: { flex: 1, ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  navSpacer: { width: 30 },
  scroll: { flex: 1 },
  content: { padding: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  sectionTitle: {
    ...typography.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textDark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  required: { color: colors.red500 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    ...typography.bodySmall,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.red500 },
  fieldHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segment: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  segmentActive: { borderColor: colors.primaryBlue, backgroundColor: colors.blue50 },
  segmentText: { ...typography.bodySmall, fontWeight: '600', color: colors.textSecondary },
  segmentTextActive: { color: colors.primaryBlue },
  // 섹션 토글 행
  sectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  sectionToggleText: { ...typography.label, fontWeight: '600', color: colors.textPrimary },
  sectionToggleArrow: { ...typography.caption, color: colors.textSecondary },
  errorBanner: {
    backgroundColor: colors.red50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.badgeRedBg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginTop: spacing.lg,
  },
  errorText: { ...typography.detail, color: colors.red500 },
  bottomPad: { height: spacing.lg },
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxxl,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cta: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: colors.grey300 },
  ctaText: { color: colors.white, ...typography.body, fontWeight: '700' },
});

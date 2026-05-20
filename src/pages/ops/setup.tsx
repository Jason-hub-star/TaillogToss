/**
 * Ops Setup — 조직 최초 생성 화면 (B2B 온보딩 첫 단계)
 * org_owner/trainer 역할 유저가 조직을 등록하는 진입점.
 * 생성 성공 → OrgContext 갱신 → /ops/today 이동
 * Parity: B2B-001
 */
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { colors, typography, spacing } from 'styles/tokens';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { useCreateOrg } from 'lib/hooks/useOrg';
import { useOrg } from 'stores/OrgContext';
import type { OrgType } from 'types/b2b';

export const Route = createRoute('/ops/setup', {
  component: OpsSetupPage,
  screenOptions: { headerShown: false },
});

const ORG_TYPES: { value: OrgType; label: string; desc: string }[] = [
  { value: 'daycare',          label: '반려견 유치원',   desc: '데이케어 / 위탁' },
  { value: 'hotel',            label: '반려견 호텔',     desc: '장단기 숙박 위탁' },
  { value: 'training_center',  label: '훈련 센터',       desc: '그룹·개인 훈련' },
  { value: 'hospital',         label: '동물병원',         desc: '재활·치료 연계' },
];

function OpsSetupPage() {
  const { isReady } = usePageGuard({
    currentPath: '/ops/setup' as never,
    requireFeature: 'b2bOnly',
  });

  const navigation = useNavigation();
  const { setOrg, setMembership } = useOrg();
  const createOrg = useCreateOrg();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<OrgType>('daycare');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('센터 이름을 입력해주세요.');
      return;
    }
    setError(null);

    createOrg.mutate(
      { name: trimmed, type: selectedType },
      {
        onSuccess: (org) => {
          // OrgContext 갱신 (membership은 RPC가 생성, 조회는 useOrgMembers로)
          setOrg(org);
          setMembership(null); // 이후 useOrgMembers로 로드됨
          navigation.navigate('/ops/today' as never);
        },
        onError: (err) => {
          setError('센터를 만들지 못했어요. 다시 시도해주세요.');
          if (__DEV__) console.error('[B2B-001] createOrg failed', err);
        },
      },
    );
  }, [name, selectedType, createOrg, setOrg, setMembership, navigation]);

  if (!isReady) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>센터 등록</Text>
          <Text style={styles.subtitle}>운영하시는 센터 정보를 입력해주세요.{'\n'}나중에 설정에서 수정할 수 있어요.</Text>
        </View>

        {/* 센터 이름 */}
        <View style={styles.section}>
          <Text style={styles.label}>센터 이름 *</Text>
          <TextInput
            style={[styles.input, error && !name.trim() ? styles.inputError : null]}
            value={name}
            onChangeText={(v) => { setName(v); setError(null); }}
            placeholder="예: 멍멍 유치원 강남점"
            placeholderTextColor={colors.textTertiary}
            maxLength={40}
            returnKeyType="done"
          />
          <Text style={styles.inputHint}>{name.trim().length}/40</Text>
        </View>

        {/* 센터 유형 */}
        <View style={styles.section}>
          <Text style={styles.label}>센터 유형</Text>
          <View style={styles.typeGrid}>
            {ORG_TYPES.map((item) => {
              const active = selectedType === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => setSelectedType(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{item.label}</Text>
                  <Text style={[styles.typeDesc, active && styles.typeDescActive]}>{item.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 에러 */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* 하단 CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, (createOrg.isPending || !name.trim()) && styles.ctaDisabled]}
          onPress={handleCreate}
          disabled={createOrg.isPending || !name.trim()}
          activeOpacity={0.85}
        >
          {createOrg.isPending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.ctaText}>센터 등록하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.screenHorizontal, paddingBottom: 24 },
  header: { marginBottom: 32 },
  title: { ...typography.t2, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { ...typography.label, color: colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: 28 },
  label: { ...typography.bodySmall, fontWeight: '600', color: colors.textDark, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.red500 },
  inputHint: { ...typography.caption, color: colors.textTertiary, textAlign: 'right', marginTop: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '47%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.white,
  },
  typeCardActive: { borderColor: colors.primaryBlue, backgroundColor: colors.blue50 },
  typeLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.textDark, marginBottom: 2 },
  typeLabelActive: { color: colors.primaryBlue },
  typeDesc: { ...typography.caption, color: colors.textTertiary },
  typeDescActive: { color: colors.blue500 },
  errorBanner: {
    backgroundColor: colors.red50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.badgeRedBg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: { ...typography.detail, color: colors.red500 },
  footer: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: 32, paddingTop: 12, backgroundColor: colors.background },
  cta: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: colors.grey300 },
  ctaText: { color: colors.white, ...typography.body, fontWeight: '700' },
});

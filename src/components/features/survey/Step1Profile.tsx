/**
 * Step 1: 반려견 프로필 (개선된 UI 2.0 + UX 보완)
 * 믹스견 등 자유 입력 지원, 포커스 제어
 */
import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { ChipGroup } from 'components/tds-ext';
import { DogPhotoPicker } from 'components/features/dog/DogPhotoPicker';
import type { SurveyStep1, SurveyStep2, DogSex } from 'types/dog';
import breedsData from 'lib/data/breeds.json';

const LIVING_OPTIONS = [
  { key: 'apartment', label: '아파트' },
  { key: 'house', label: '주택' },
  { key: 'villa', label: '빌라' },
  { key: 'other', label: '기타' },
];

const LIFE_STAGES = [
  { key: 'puppy', label: '퍼피', desc: '1세 미만', icon: '🐾' },
  { key: 'adult', label: '성견', desc: '1~7세 미만', icon: '🐕' },
  { key: 'senior', label: '시니어', desc: '7세 이상', icon: '🛋️' },
];

interface Props {
  step1: SurveyStep1;
  step2: SurveyStep2;
  onChange: (step1: SurveyStep1, step2: SurveyStep2) => void;
}

export function Step1Profile({ step1, step2, onChange }: Props) {
  const [breedSearch, setBreedSearch] = useState(step1.breed);
  const [showDropdown, setShowDropdown] = useState(false);
  const breedInputRef = useRef<TextInput>(null);

  // 로컬 상태: 나이 선택을 위한 임시 값
  const [years, setYears] = useState(Math.floor(step1.age_months / 12));
  const [months, setMonths] = useState(step1.age_months % 12);

  const filteredBreeds = useMemo(() => {
    if (!breedSearch || breedSearch.length < 1) return [];
    const searchLower = breedSearch.toLowerCase();
    return breedsData
      .filter((b) => 
        b.ko.includes(breedSearch) || 
        b.en.toLowerCase().includes(searchLower)
      )
      .slice(0, 10);
  }, [breedSearch]);

  const update1 = (partial: Partial<SurveyStep1>) => {
    onChange({ ...step1, ...partial }, step2);
  };

  const update2 = (partial: Partial<SurveyStep2>) => {
    onChange(step1, { ...step2, ...partial });
  };

  const updateAge = (newYears: number, newMonths: number) => {
    setYears(newYears);
    setMonths(newMonths);
    update1({ age_months: newYears * 12 + newMonths });
  };

  const handleSexToggle = (base: 'MALE' | 'FEMALE') => {
    const isNeutered = step1.sex.includes('_NEUTERED');
    const nextSex: DogSex = isNeutered ? (`${base}_NEUTERED` as DogSex) : base;
    update1({ sex: nextSex });
  };

  const handleNeuteredToggle = (isNeutered: boolean) => {
    const base = step1.sex.replace('_NEUTERED', '') as 'MALE' | 'FEMALE';
    const nextSex: DogSex = isNeutered ? (`${base}_NEUTERED` as DogSex) : base;
    update1({ sex: nextSex });
  };

  return (
    <View style={styles.container}>
      <DogPhotoPicker 
        uri={step1.profile_image_url} 
        onSelect={(uri) => update1({ profile_image_url: uri })} 
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>반려견 기초 정보</Text>
        
        <Text style={styles.label}>이름</Text>
        <TextInput
          style={styles.input}
          value={step1.name}
          onChangeText={(name) => update1({ name })}
          placeholder="이름을 입력해주세요"
          placeholderTextColor={colors.placeholder}
          returnKeyType="next"
          onSubmitEditing={() => breedInputRef.current?.focus()}
        />

        <Text style={styles.label}>성별</Text>
        <View style={styles.sexRow}>
          <TouchableOpacity 
            style={[styles.sexCard, step1.sex.startsWith('MALE') && styles.sexCardActive]}
            onPress={() => handleSexToggle('MALE')}
          >
            <Text style={styles.sexEmoji}>♂️</Text>
            <Text style={[styles.sexLabel, step1.sex.startsWith('MALE') && styles.sexLabelActive]}>남아</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sexCard, step1.sex.startsWith('FEMALE') && styles.sexCardActive]}
            onPress={() => handleSexToggle('FEMALE')}
          >
            <Text style={styles.sexEmoji}>♀️</Text>
            <Text style={[styles.sexLabel, step1.sex.startsWith('FEMALE') && styles.sexLabelActive]}>여아</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.neuteredRow}>
          <Text style={styles.neuteredLabel}>중성화를 했나요?</Text>
          <Switch 
            value={step1.sex.includes('_NEUTERED')}
            onValueChange={handleNeuteredToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <Text style={styles.label}>나이</Text>
        <View style={styles.lifeStageRow}>
          {LIFE_STAGES.map((stage) => {
            const isActive = (stage.key === 'puppy' && years === 0) || 
                             (stage.key === 'adult' && years >= 1 && years < 7) || 
                             (stage.key === 'senior' && years >= 7);
            return (
              <TouchableOpacity 
                key={stage.key} 
                style={[styles.stageCard, isActive && styles.stageCardActive]}
                onPress={() => {
                  if (stage.key === 'puppy') updateAge(0, 6);
                  else if (stage.key === 'adult') updateAge(2, 0);
                  else updateAge(8, 0);
                }}
              >
                <Text style={styles.stageEmoji}>{stage.icon}</Text>
                <Text style={[styles.stageLabel, isActive && styles.stageLabelActive]}>{stage.label}</Text>
                <Text style={styles.stageDesc}>{stage.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.ageInputRow}>
          <View style={styles.ageInputItem}>
            <TextInput
              style={styles.ageInput}
              value={String(years)}
              onChangeText={(v) => updateAge(parseInt(v, 10) || 0, months)}
              keyboardType="numeric"
            />
            <Text style={styles.ageUnit}>년</Text>
          </View>
          <View style={styles.ageInputItem}>
            <TextInput
              style={styles.ageInput}
              value={String(months)}
              onChangeText={(v) => updateAge(years, parseInt(v, 10) || 0)}
              keyboardType="numeric"
            />
            <Text style={styles.ageUnit}>개월</Text>
          </View>
        </View>

        <Text style={styles.label}>품종</Text>
        <View style={styles.searchContainer}>
          <TextInput
            ref={breedInputRef}
            style={styles.input}
            value={breedSearch}
            onChangeText={(text) => {
              setBreedSearch(text);
              update1({ breed: text }); // 드롭다운 선택 전에도 값을 상태에 반영 (믹스견 등 직접 입력 허용)
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="품종 검색 (예: 믹스견)"
            placeholderTextColor={colors.placeholder}
          />
          {showDropdown && filteredBreeds.length > 0 && (
            <View style={styles.dropdown}>
              {filteredBreeds.map((item) => (
                <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => {
                  update1({ breed: item.ko });
                  setBreedSearch(item.ko);
                  setShowDropdown(false);
                }}>
                  <Text style={styles.dropdownText}>{item.ko}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>생활 환경</Text>
        <Text style={styles.label}>주거 형태</Text>
        <ChipGroup
          items={LIVING_OPTIONS}
          selectedKeys={[step2.household.living_type]}
          onSelect={(key) => update2({ household: { ...step2.household, living_type: key as any } })}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>어린이와 함께 사나요?</Text>
          <Switch
            value={step2.household.has_children}
            onValueChange={(v) => update2({ household: { ...step2.household, has_children: v } })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  section: { paddingHorizontal: 4 },
  sectionTitle: { ...typography.subtitle, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  label: { ...typography.detail, fontWeight: '600', color: colors.textDark, marginTop: 24, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.bodySmall,
    backgroundColor: '#FFFFFF',
    color: colors.textPrimary,
  },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexCardActive: { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary, borderWidth: 2 },
  sexEmoji: { fontSize: 24, marginBottom: 4 },
  sexLabel: { ...typography.detail, color: colors.textSecondary },
  sexLabelActive: { color: colors.primary, fontWeight: '700' },
  neuteredRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  neuteredLabel: { ...typography.bodySmall, color: colors.textDark },
  lifeStageRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stageCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  stageCardActive: { borderColor: colors.primary, backgroundColor: colors.backgroundSecondary, borderWidth: 2 },
  stageEmoji: { fontSize: 20, marginBottom: 4 },
  stageLabel: { ...typography.detail, fontWeight: '700', color: colors.textPrimary, fontSize: 13 },
  stageLabelActive: { color: colors.primary },
  stageDesc: { ...typography.detail, color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  ageInputRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  ageInputItem: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundSecondary, borderRadius: 12, paddingHorizontal: 12 },
  ageInput: { flex: 1, paddingVertical: 12, ...typography.bodySmall, textAlign: 'right', marginRight: 4, color: colors.textPrimary },
  ageUnit: { ...typography.detail, color: colors.textSecondary },
  searchContainer: { position: 'relative', zIndex: 100 },
  dropdown: { position: 'absolute', top: 56, left: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: colors.border, maxHeight: 200, elevation: 5, zIndex: 1000 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dropdownText: { ...typography.bodySmall, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 24 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  switchLabel: { ...typography.bodySmall, color: colors.textDark },
});

/**
 * Step 1: 반려견 프로필 & 생활 환경 (Basic + Environment)
 * Phase 3: UI/UX & AI Enrichment — 7단계를 3단계로 압축
 * Parity: UIUX-004
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { colors, typography } from 'styles/tokens';
import { ChipGroup } from 'components/tds-ext';
import { DogPhotoPicker } from 'components/features/dog/DogPhotoPicker';
import type { SurveyStep1, SurveyStep2, DogSex } from 'types/dog';
import breedsData from 'lib/data/breeds.json';

const SEX_OPTIONS = [
  { key: 'MALE', label: '수컷' },
  { key: 'FEMALE', label: '암컷' },
  { key: 'MALE_NEUTERED', label: '수컷 (중성화)' },
  { key: 'FEMALE_NEUTERED', label: '암컷 (중성화)' },
];

const LIVING_OPTIONS = [
  { key: 'apartment', label: '아파트' },
  { key: 'house', label: '주택' },
  { key: 'villa', label: '빌라' },
  { key: 'other', label: '기타' },
];

const POPULAR_BREEDS = ['말티즈', '푸들', '포메라니안', '비숑 프리제', '믹스', '진돗개', '골든 리트리버', '치와와'];

interface Props {
  step1: SurveyStep1;
  step2: SurveyStep2;
  onChange: (step1: SurveyStep1, step2: SurveyStep2) => void;
}

export function Step1Profile({ step1, step2, onChange }: Props) {
  const [breedSearch, setBreedSearch] = useState(step1.breed);
  const [showDropdown, setShowDropdown] = useState(false);

  // 스마트 견종 검색 (자음/모음 분리 없이 포함 여부로 우선 구현)
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

  const updateHousehold = (partial: Partial<SurveyStep2['household']>) => {
    update2({ household: { ...step2.household, ...partial } });
  };

  const handleBreedSelect = (breed: string) => {
    update1({ breed });
    setBreedSearch(breed);
    setShowDropdown(false);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <DogPhotoPicker 
          uri={step1.profile_image_url} 
          onSelect={(uri) => update1({ profile_image_url: uri })} 
        />

        <Text style={styles.sectionTitle}>반려견 기본 정보</Text>
        
        <Text style={styles.label}>반려견 이름</Text>
        <TextInput
          style={styles.input}
          value={step1.name}
          onChangeText={(name) => update1({ name })}
          placeholder="반려견의 이름을 입력해주세요"
          placeholderTextColor={colors.placeholder}
        />

        <Text style={styles.label}>품종</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            value={breedSearch}
            onChangeText={(text) => {
              setBreedSearch(text);
              setShowDropdown(true);
              if (!text) update1({ breed: '' });
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="품종을 검색하거나 입력해주세요"
            placeholderTextColor={colors.placeholder}
          />
          
          {showDropdown && filteredBreeds.length > 0 && (
            <View style={styles.dropdown}>
              {filteredBreeds.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dropdownItem}
                  onPress={() => handleBreedSelect(item.ko)}
                >
                  <Text style={styles.dropdownText}>{item.ko}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {!breedSearch && (
          <View style={styles.popularContainer}>
            <Text style={styles.subLabel}>자주 찾는 견종</Text>
            <View style={styles.chipRow}>
              {POPULAR_BREEDS.map((b) => (
                <TouchableOpacity 
                  key={b} 
                  style={styles.popularChip} 
                  onPress={() => handleBreedSelect(b)}
                >
                  <Text style={styles.popularChipText}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>나이 (개월)</Text>
        <TextInput
          style={styles.input}
          value={step1.age_months > 0 ? String(step1.age_months) : ''}
          onChangeText={(t) => update1({ age_months: parseInt(t, 10) || 0 })}
          placeholder="나이를 개월 수로 입력해주세요"
          keyboardType="numeric"
          placeholderTextColor={colors.placeholder}
        />

        <Text style={styles.label}>성별</Text>
        <ChipGroup
          items={SEX_OPTIONS}
          selectedKeys={[step1.sex]}
          onSelect={(key) => update1({ sex: key as DogSex })}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>생활 환경</Text>
        
        <Text style={styles.label}>주거 형태</Text>
        <ChipGroup
          items={LIVING_OPTIONS}
          selectedKeys={[step2.household.living_type]}
          onSelect={(key) => updateHousehold({ living_type: key as SurveyStep2['household']['living_type'] })}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>어린이가 있나요?</Text>
          <Switch
            value={step2.household.has_children}
            onValueChange={(v) => updateHousehold({ has_children: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>다른 반려동물이 있나요?</Text>
          <Switch
            value={step2.household.has_other_pets}
            onValueChange={(v) => updateHousehold({ has_other_pets: v })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <Text style={styles.label}>하루 혼자 있는 시간 (시간)</Text>
        <TextInput
          style={styles.input}
          value={step2.daily_alone_hours > 0 ? String(step2.daily_alone_hours) : ''}
          onChangeText={(t) => update2({ daily_alone_hours: parseInt(t, 10) || 0 })}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.placeholder}
        />
      </View>
      
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 20 },
  sectionTitle: { ...typography.subtitle, fontWeight: '700', color: colors.textPrimary, marginTop: 12, marginBottom: 8 },
  label: { ...typography.detail, fontWeight: '600', color: colors.textDark, marginTop: 24, marginBottom: 8 },
  subLabel: { ...typography.detail, fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.bodySmall,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    position: 'relative',
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  popularContainer: { marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popularChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  popularChipText: { ...typography.detail, color: colors.textSecondary },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 4,
  },
  switchLabel: { ...typography.bodySmall, color: colors.textDark },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
});

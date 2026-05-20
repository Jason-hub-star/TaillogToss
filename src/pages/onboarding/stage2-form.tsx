/**
 * Stage 2 설문 — 생활 & 고민 (9문항, "나중에" 허용)
 * 완료 → AI 코칭 활성화 → dashboard 이동
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Image,
  Alert, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { FormLayout } from 'components/shared/layouts/FormLayout';
import { useSubmitStage2 } from 'lib/hooks/useSurvey';
import { useDraftSave } from 'lib/hooks/useDraftSave';
import { ICONS } from 'lib/data/iconSources';
import { useActiveDog } from 'stores/ActiveDogContext';
import { colors, typography, spacing } from 'styles/tokens';
import type { SurveyStage2Request } from 'types/dog';

export const Route = createRoute('/onboarding/stage2-form', {
  component: Stage2FormPage,
  screenOptions: { headerShown: false },
});

type RouteParams = { dogId: string; dogName: string };

interface Stage2Draft {
  issues: string[];
  issueOther: string;
  livingType: string | null;
  aloneHours: string | null;
  hasOtherPets: boolean | null;
  triggers: string[];
  pastAttempts: string[];
  walkFreq: string | null;
  walkDuration: string | null;
  rewards: string[];
}

const ISSUES = [
  { id: 'bathroom_miss', label: '배변 실수', iconSource: ICONS['ic-cat-toilet'] },
  { id: 'barking', label: '짖음', iconSource: ICONS['ic-cat-barking'] },
  { id: 'separation_anxiety', label: '분리불안', iconSource: ICONS['ic-cat-anxiety'] },
  { id: 'leash_pulling', label: '산책 당김', iconSource: ICONS['ic-cat-walk'] },
  { id: 'aggression', label: '공격성', iconSource: ICONS['ic-cat-aggression'] },
  { id: 'destructive', label: '파괴 행동', iconSource: ICONS['ic-cat-destructive'] },
];

const LIVING_TYPES = [
  { id: 'apartment', label: '아파트', iconSource: ICONS['ic-home'] },
  { id: 'house', label: '단독주택', iconSource: ICONS['ic-home'] },
  { id: 'villa', label: '빌라', iconSource: ICONS['ic-home'] },
  { id: 'other', label: '오피스텔·기타', iconSource: ICONS['ic-home'] },
] as const;

const ALONE_HOURS = [
  { id: '0', label: '거의 없어요', iconSource: ICONS['ic-none'] },
  { id: '1.5', label: '1~2시간', iconSource: ICONS['ic-clock'] },
  { id: '3', label: '2~4시간', iconSource: ICONS['ic-clock'] },
  { id: '5', label: '4~6시간', iconSource: ICONS['ic-clock'] },
  { id: '7', label: '6시간 이상', iconSource: ICONS['ic-cat-anxiety'] },
];

const TRIGGERS = [
  { id: 'alone', label: '혼자 있을 때', iconSource: ICONS['ic-cat-anxiety'] },
  { id: 'walk', label: '산책 중', iconSource: ICONS['ic-cat-walk'] },
  { id: 'stranger', label: '낯선 사람', iconSource: ICONS['ic-cat-fear'] },
  { id: 'other_dog', label: '다른 개', iconSource: ICONS['ic-dog'] },
  { id: 'noise', label: '큰 소리', iconSource: ICONS['ic-bolt'] },
  { id: 'feeding', label: '밥 먹을 때', iconSource: ICONS['ic-cat-meal'] },
];

const PAST_ATTEMPTS = [
  { id: 'treat_reward', label: '간식 보상', iconSource: ICONS['ic-cat-meal'] },
  { id: 'youtube_diy', label: '유튜브·독학', iconSource: ICONS['ic-search'] },
  { id: 'professional', label: '전문 훈련사', iconSource: ICONS['ic-trainer'] },
  { id: 'kindergarten', label: '유치원', iconSource: ICONS['ic-training'] },
  { id: 'none', label: '없어요', iconSource: ICONS['ic-none'] },
];

const WALK_FREQ = [
  { id: '1', label: '주 1~2회', iconSource: ICONS['ic-cat-walk'] },
  { id: '3.5', label: '주 3~4회', iconSource: ICONS['ic-cat-walk'] },
  { id: '6', label: '거의 매일', iconSource: ICONS['ic-cat-walk'] },
  { id: '7', label: '매일 꼭!', iconSource: ICONS['ic-cat-walk'] },
];

const WALK_DURATION = [
  { id: '10', label: '15분 이내', iconSource: ICONS['ic-bolt'] },
  { id: '22', label: '15~30분', iconSource: ICONS['ic-bolt'] },
  { id: '45', label: '30~60분', iconSource: ICONS['ic-bolt'] },
  { id: '90', label: '60분 이상', iconSource: ICONS['ic-bolt'] },
];

const REWARDS = [
  { id: 'treat', label: '간식', iconSource: ICONS['ic-cat-meal'] },
  { id: 'toy', label: '장난감', iconSource: ICONS['ic-cat-play'] },
  { id: 'praise', label: '칭찬·스킨십', iconSource: ICONS['ic-praise'] },
  { id: 'walk', label: '산책', iconSource: ICONS['ic-cat-walk'] },
];

function Stage2FormPage() {
  const navigation = useNavigation();
  const params = Route.useParams() as RouteParams;
  const { activeDog } = useActiveDog();
  const targetDogId = params.dogId ?? activeDog?.id;
  const displayDogName = params.dogName ?? activeDog?.name ?? '우리 아이';
  const submitStage2 = useSubmitStage2();

  const [issues, setIssues] = useState<string[]>([]);
  const [issueOther, setIssueOther] = useState('');
  const [livingType, setLivingType] = useState<string | null>(null);
  const [aloneHours, setAloneHours] = useState<string | null>(null);
  const [hasOtherPets, setHasOtherPets] = useState<boolean | null>(null);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [pastAttempts, setPastAttempts] = useState<string[]>([]);
  const [walkFreq, setWalkFreq] = useState<string | null>(null);
  const [walkDuration, setWalkDuration] = useState<string | null>(null);
  const [rewards, setRewards] = useState<string[]>([]);

  const draftData: Stage2Draft = {
    issues, issueOther, livingType, aloneHours, hasOtherPets,
    triggers, pastAttempts, walkFreq, walkDuration, rewards,
  };

  const { loadedDraft, clearDraft } = useDraftSave<Stage2Draft>({
    stageKey: `stage2_${targetDogId ?? 'direct-entry'}`,
    data: draftData,
  });

  useEffect(() => {
    if (!loadedDraft || issues.length > 0) return;
    setIssues(loadedDraft.issues);
    setIssueOther(loadedDraft.issueOther);
    setLivingType(loadedDraft.livingType);
    setAloneHours(loadedDraft.aloneHours);
    setHasOtherPets(loadedDraft.hasOtherPets);
    setTriggers(loadedDraft.triggers);
    setPastAttempts(loadedDraft.pastAttempts);
    setWalkFreq(loadedDraft.walkFreq);
    setWalkDuration(loadedDraft.walkDuration);
    setRewards(loadedDraft.rewards);
  }, [loadedDraft]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, id: string, max = 99) => {
    if (list.includes(id)) {
      setList(list.filter((x) => x !== id));
    } else if (list.length < max) {
      setList([...list, id]);
    }
  };

  const handleSubmit = useCallback(() => {
    if (!targetDogId) {
      Alert.alert('반려견 정보가 필요해요', '먼저 반려견 프로필을 등록한 뒤 다시 시도해주세요.', [
        { text: '확인', onPress: () => navigation.navigate('/onboarding/stage1-form' as never) },
      ]);
      return;
    }

    const allIssues = issueOther.trim()
      ? [...issues, issueOther.trim()]
      : issues;

    const payload: SurveyStage2Request = {
      household_info: {
        living_type: (livingType as SurveyStage2Request['household_info']['living_type']) ?? undefined,
        has_other_pets: hasOtherPets ?? false,
        has_children: false,
        members_count: 1,
      },
      chronic_issues: { top_issues: allIssues },
      triggers: { ids: triggers },
      antecedents: { ids: triggers },
      past_attempts: { ids: pastAttempts },
      activity_meta: {
        walk_frequency: walkFreq ?? undefined,
        walk_duration_minutes: walkDuration ? parseInt(walkDuration, 10) : undefined,
      },
      rewards_meta: rewards.length > 0 ? { ids: rewards } : undefined,
    };

    submitStage2.mutate({ dogId: targetDogId, data: payload }, {
      onSuccess: async () => {
        await clearDraft();
        navigation.navigate('/dashboard');
      },
      onError: (err) => {
        Alert.alert('저장 실패', err.message.slice(0, 200));
      },
    });
  }, [targetDogId, issues, issueOther, livingType, hasOtherPets, triggers, pastAttempts, walkFreq, walkDuration, rewards, submitStage2, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('/dashboard');
  }, [navigation]);

  return (
    <FormLayout
      title={`${displayDogName}에 대해 더 알려줘요`}
      onBack={() => navigation.goBack()}
      bottomCTA={{
        label: submitStage2.isPending ? '저장하고 있어요' : 'AI 코칭 시작하기',
        onPress: handleSubmit,
        disabled: submitStage2.isPending,
      }}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 나중에 하기 배너 */}
        <TouchableOpacity style={styles.skipBanner} onPress={handleSkip} activeOpacity={0.8}>
          <Text style={styles.skipText}>나중에 할게요. 기본 코칭만 먼저 볼게요</Text>
        </TouchableOpacity>

        {/* 주요 고민 */}
        <Section label="지금 가장 큰 고민이 뭐예요?" hint="최대 3개">
          <View style={styles.chipWrap}>
            {ISSUES.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={issues.includes(item.id)}
                onPress={() => toggleItem(issues, setIssues, item.id, 3)}
              />
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.mt8]}
            value={issueOther}
            onChangeText={setIssueOther}
            placeholder="직접 입력"
            placeholderTextColor={colors.textSecondary}
            maxLength={100}
          />
        </Section>

        {/* 주거 형태 */}
        <Section label="어디서 같이 살아요?">
          <View style={styles.chipWrap}>
            {LIVING_TYPES.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={livingType === item.id}
                onPress={() => setLivingType(item.id)}
              />
            ))}
          </View>
        </Section>

        {/* 혼자 있는 시간 */}
        <Section label="하루에 혼자 있는 시간이 얼마나 돼요?">
          <View style={styles.chipWrap}>
            {ALONE_HOURS.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={aloneHours === item.id}
                onPress={() => setAloneHours(item.id)}
              />
            ))}
          </View>
        </Section>

        {/* 다른 동물 */}
        <Section label="함께 사는 동물이 있나요?">
          <View style={styles.chipRow}>
            <ChoiceChip label="있어요" iconSource={ICONS['ic-dog']} selected={hasOtherPets === true} onPress={() => setHasOtherPets(true)} />
            <ChoiceChip label="없어요" iconSource={ICONS['ic-none']} selected={hasOtherPets === false} onPress={() => setHasOtherPets(false)} />
          </View>
        </Section>

        {/* 트리거 */}
        <Section label="주로 언제 문제가 생겨요?" hint="최대 3개">
          <View style={styles.chipWrap}>
            {TRIGGERS.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={triggers.includes(item.id)}
                onPress={() => toggleItem(triggers, setTriggers, item.id, 3)}
              />
            ))}
          </View>
        </Section>

        {/* 과거 훈련 */}
        <Section label="전에 어떤 훈련을 해봤어요?" hint="최대 3개">
          <View style={styles.chipWrap}>
            {PAST_ATTEMPTS.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={pastAttempts.includes(item.id)}
                onPress={() => toggleItem(pastAttempts, setPastAttempts, item.id, 3)}
              />
            ))}
          </View>
        </Section>

        {/* 산책 빈도 */}
        <Section label="일주일에 몇 번 산책해요?">
          <View style={styles.chipWrap}>
            {WALK_FREQ.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={walkFreq === item.id}
                onPress={() => setWalkFreq(item.id)}
              />
            ))}
          </View>
        </Section>

        {/* 산책 시간 */}
        <Section label="한 번 산책 시간이 얼마나 돼요?">
          <View style={styles.chipWrap}>
            {WALK_DURATION.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={walkDuration === item.id}
                onPress={() => setWalkDuration(item.id)}
              />
            ))}
          </View>
        </Section>

        {/* 보상 */}
        <Section label="아이가 가장 좋아하는 보상이 뭐예요?" hint="최대 2개">
          <View style={styles.chipWrap}>
            {REWARDS.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                iconSource={item.iconSource}
                selected={rewards.includes(item.id)}
                onPress={() => toggleItem(rewards, setRewards, item.id, 2)}
              />
            ))}
          </View>
        </Section>

      </ScrollView>
    </FormLayout>
  );
}

function Section({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function ChoiceChip({
  label, iconSource, selected, onPress,
}: { label: string; iconSource?: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {iconSource ? <Image source={{ uri: iconSource }} style={styles.chipIcon} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.screenHorizontal, paddingBottom: 40 },
  skipBanner: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  skipText: { ...typography.bodySmall, color: colors.textSecondary },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionLabel: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  hint: { ...typography.detail, color: colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 4,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBlueLight },
  chipIcon: { width: 18, height: 18 },
  chipText: { ...typography.bodySmall, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
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
  mt8: { marginTop: 8 },
});

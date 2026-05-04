/**
 * Stage 2 설문 — 생활 & 고민 (9문항, "나중에" 허용)
 * 완료 → AI 코칭 활성화 → dashboard 이동
 * Parity: APP-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { FormLayout } from 'components/shared/layouts/FormLayout';
import { useSubmitStage2 } from 'lib/hooks/useSurvey';
import { useDraftSave } from 'lib/hooks/useDraftSave';
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
  { id: 'bathroom_miss', label: '🚽 배변 실수' },
  { id: 'barking', label: '😤 짖음' },
  { id: 'separation_anxiety', label: '😰 분리불안' },
  { id: 'leash_pulling', label: '🐾 산책 당김' },
  { id: 'aggression', label: '😾 공격성' },
  { id: 'destructive', label: '🏠 파괴 행동' },
];

const LIVING_TYPES = [
  { id: 'apartment', label: '🏢 아파트' },
  { id: 'house', label: '🏠 단독주택' },
  { id: 'villa', label: '🏘️ 빌라' },
  { id: 'other', label: '🏙️ 오피스텔·기타' },
] as const;

const ALONE_HOURS = [
  { id: '0', label: '😊 거의 없어요' },
  { id: '1.5', label: '🕐 1~2시간' },
  { id: '3', label: '🕒 2~4시간' },
  { id: '5', label: '🕔 4~6시간' },
  { id: '7', label: '😢 6시간 이상' },
];

const TRIGGERS = [
  { id: 'alone', label: '🚪 혼자 있을 때' },
  { id: 'walk', label: '🚶 산책 중' },
  { id: 'stranger', label: '👥 낯선 사람' },
  { id: 'other_dog', label: '🐕 다른 개' },
  { id: 'noise', label: '🔊 큰 소리' },
  { id: 'feeding', label: '🍽️ 밥 먹을 때' },
];

const PAST_ATTEMPTS = [
  { id: 'treat_reward', label: '🍖 간식 보상' },
  { id: 'youtube_diy', label: '📱 유튜브·독학' },
  { id: 'professional', label: '👨‍🏫 전문 훈련사' },
  { id: 'kindergarten', label: '🏫 유치원' },
  { id: 'none', label: '없어요' },
];

const WALK_FREQ = [
  { id: '1', label: '🐌 주 1~2회' },
  { id: '3.5', label: '🚶 주 3~4회' },
  { id: '6', label: '🏃 거의 매일' },
  { id: '7', label: '💨 매일 꼭!' },
];

const WALK_DURATION = [
  { id: '10', label: '⏱️ 15분 이내' },
  { id: '22', label: '🕐 15~30분' },
  { id: '45', label: '🕓 30~60분' },
  { id: '90', label: '🏅 60분 이상' },
];

const REWARDS = [
  { id: 'treat', label: '🍖 간식' },
  { id: 'toy', label: '🎾 장난감' },
  { id: 'praise', label: '👋 칭찬·스킨십' },
  { id: 'walk', label: '🚶 산책' },
];

function Stage2FormPage() {
  const navigation = useNavigation();
  const params = Route.useParams() as RouteParams;
  const { dogId, dogName } = params;
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
    stageKey: `stage2_${dogId}`,
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

    submitStage2.mutate({ dogId, data: payload }, {
      onSuccess: async () => {
        await clearDraft();
        navigation.navigate('/dashboard');
      },
      onError: (err) => {
        Alert.alert('저장 실패', err.message.slice(0, 200));
      },
    });
  }, [dogId, issues, issueOther, livingType, hasOtherPets, triggers, pastAttempts, walkFreq, walkDuration, rewards, submitStage2, navigation]);

  const handleSkip = useCallback(() => {
    navigation.navigate('/dashboard');
  }, [navigation]);

  return (
    <FormLayout
      title={`${dogName}에 대해 더 알려줘요`}
      onBack={() => navigation.goBack()}
      bottomCTA={{
        label: submitStage2.isPending ? '저장 중...' : 'AI 코칭 활성화',
        onPress: handleSubmit,
        disabled: submitStage2.isPending,
      }}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 나중에 하기 배너 */}
        <TouchableOpacity style={styles.skipBanner} onPress={handleSkip} activeOpacity={0.8}>
          <Text style={styles.skipText}>⏭️ 나중에 할게요 — 기본 코칭만 먼저 볼게요</Text>
        </TouchableOpacity>

        {/* 주요 고민 */}
        <Section label="지금 가장 큰 고민이 뭐예요?" hint="최대 3개">
          <View style={styles.chipWrap}>
            {ISSUES.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
                selected={issues.includes(item.id)}
                onPress={() => toggleItem(issues, setIssues, item.id, 3)}
              />
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.mt8]}
            value={issueOther}
            onChangeText={setIssueOther}
            placeholder="✏️ 직접 입력..."
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
                selected={aloneHours === item.id}
                onPress={() => setAloneHours(item.id)}
              />
            ))}
          </View>
        </Section>

        {/* 다른 동물 */}
        <Section label="함께 사는 동물이 있나요?">
          <View style={styles.chipRow}>
            <ChoiceChip label="🐾 있어요" selected={hasOtherPets === true} onPress={() => setHasOtherPets(true)} />
            <ChoiceChip label="❌ 없어요" selected={hasOtherPets === false} onPress={() => setHasOtherPets(false)} />
          </View>
        </Section>

        {/* 트리거 */}
        <Section label="주로 언제 문제가 생겨요?" hint="최대 3개">
          <View style={styles.chipWrap}>
            {TRIGGERS.map((item) => (
              <ChoiceChip
                key={item.id}
                label={item.label}
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
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 4,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBlueLight },
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

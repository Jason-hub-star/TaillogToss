/**
 * Stage 3 Pro 상담지 — 풀 개인화 AI 리포트 입력
 * Parity: APP-001, AI-001, PRO-INTAKE-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormLayout } from 'components/shared/layouts/FormLayout';
import { useSubmitStage3 } from 'lib/hooks/useSurvey';
import { useDogEnv } from 'lib/hooks/useDogs';
import { useDraftSave } from 'lib/hooks/useDraftSave';
import { ICONS } from 'lib/data/iconSources';
import { useActiveDog } from 'stores/ActiveDogContext';
import { colors, spacing, typography } from 'styles/tokens';
import type { BehaviorEpisode, SurveyStage3Request } from 'types/dog';

export const Route = createRoute('/onboarding/stage3-form', {
  component: Stage3FormPage,
  screenOptions: { headerShown: false },
});

type RouteParams = { dogId?: string; dogName?: string; mode?: 'edit' };

interface EpisodeDraft extends BehaviorEpisode {
  localId: string;
}

interface Stage3Draft {
  primaryConcern: string;
  ownerGoal: string;
  protectiveFactorsText: string;
  episodes: EpisodeDraft[];
  groomingContext: string;
  handlingSensitiveAreas: string[];
  groomingTools: string[];
  handlingNotes: string;
  noiseSources: string[];
  noiseReactionDetail: string;
  recoveryPattern: string;
  healthStatus: HealthStatus | null;
  healthIssues: string[];
  healthNote: string;
  hadSurgery: boolean | null;
  surgeryNote: string;
  adoptionStory: string;
  socializationNotes: string;
  feedingSchedule: string;
  playRoutine: string;
  eliminationRoutine: string;
  educationExperience: string;
  temperamentMemo: string;
  envReaction: EnvReaction | null;
  personReaction: PersonReaction | null;
  dogReaction: DogReaction | null;
  noiseReaction: NoiseReaction | null;
  focusLevel: FocusLevel | null;
  attachLevel: AttachLevel | null;
  energyLevel: number | null;
  rewards: string[];
  walkMinutes: string;
}

type HealthStatus = 'healthy' | 'concern' | 'treatment';
type EnvReaction = 'explore' | 'adapt' | 'anxious' | 'indifferent';
type PersonReaction = 'rush' | 'observe' | 'hide' | 'indifferent';
type DogReaction = 'approach' | 'sniff' | 'bark' | 'indifferent';
type NoiseReaction = 'calm' | 'recover' | 'prolonged';
type FocusLevel = 'treat_only' | 'good' | 'distracted' | 'uninterested';
type AttachLevel = 'velcro' | 'moderate' | 'independent';

const HEALTH_ISSUES = [
  { id: 'joint_disc', label: '관절·디스크', iconSource: ICONS['ic-health'] },
  { id: 'skin_allergy', label: '피부·알레르기', iconSource: ICONS['ic-idea'] },
  { id: 'heart', label: '심장·호흡', iconSource: ICONS['ic-bolt'] },
  { id: 'digestive', label: '소화기', iconSource: ICONS['ic-cat-meal'] },
];

const REWARDS = [
  { id: 'treat', label: '간식', iconSource: ICONS['ic-cat-meal'] },
  { id: 'toy', label: '장난감·놀이', iconSource: ICONS['ic-cat-play'] },
  { id: 'praise', label: '칭찬·스킨십', iconSource: ICONS['ic-praise'] },
  { id: 'walk', label: '산책', iconSource: ICONS['ic-cat-walk'] },
];

const HANDLING_AREAS = ['얼굴', '발', '귀', '꼬리', '몸통', '입 주변'];
const GROOMING_TOOLS = ['가위', '클리퍼', '드라이기', '발톱깎이', '빗질', '목욕'];
const NOISE_SOURCES = ['윗집 소리', '문 닫힘', '미용기기', '공사음', '낯선 사람 움직임', '초인종'];

const blankEpisode = (index: number): EpisodeDraft => ({
  localId: `episode_${Date.now()}_${index}`,
  title: '',
  situation: '',
  antecedent: '',
  behavior: '',
  consequence: '',
  duration: '',
  intensity: 3,
  recovery: '',
  owner_response: '',
});

const splitLines = (value: string) =>
  value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);

const hasEpisodeContent = (episode: EpisodeDraft) =>
  Boolean(episode.situation?.trim() || episode.antecedent?.trim() || episode.behavior?.trim());

function Stage3FormPage() {
  const navigation = useNavigation();
  const params = Route.useParams() as RouteParams;
  const { activeDog } = useActiveDog();
  const targetDogId = params.dogId ?? activeDog?.id;
  const displayDogName = params.dogName ?? activeDog?.name ?? '우리 아이';
  const submitStage3 = useSubmitStage3();
  const dogEnvQuery = useDogEnv(targetDogId);

  const [primaryConcern, setPrimaryConcern] = useState('');
  const [ownerGoal, setOwnerGoal] = useState('');
  const [protectiveFactorsText, setProtectiveFactorsText] = useState('');
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([blankEpisode(1)]);
  const [groomingContext, setGroomingContext] = useState('');
  const [handlingSensitiveAreas, setHandlingSensitiveAreas] = useState<string[]>([]);
  const [groomingTools, setGroomingTools] = useState<string[]>([]);
  const [handlingNotes, setHandlingNotes] = useState('');
  const [noiseSources, setNoiseSources] = useState<string[]>([]);
  const [noiseReactionDetail, setNoiseReactionDetail] = useState('');
  const [recoveryPattern, setRecoveryPattern] = useState('');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthIssues, setHealthIssues] = useState<string[]>([]);
  const [healthNote, setHealthNote] = useState('');
  const [hadSurgery, setHadSurgery] = useState<boolean | null>(null);
  const [surgeryNote, setSurgeryNote] = useState('');
  const [adoptionStory, setAdoptionStory] = useState('');
  const [socializationNotes, setSocializationNotes] = useState('');
  const [feedingSchedule, setFeedingSchedule] = useState('');
  const [playRoutine, setPlayRoutine] = useState('');
  const [eliminationRoutine, setEliminationRoutine] = useState('');
  const [educationExperience, setEducationExperience] = useState('');
  const [temperamentMemo, setTemperamentMemo] = useState('');
  const [envReaction, setEnvReaction] = useState<EnvReaction | null>(null);
  const [personReaction, setPersonReaction] = useState<PersonReaction | null>(null);
  const [dogReaction, setDogReaction] = useState<DogReaction | null>(null);
  const [noiseReaction, setNoiseReaction] = useState<NoiseReaction | null>(null);
  const [focusLevel, setFocusLevel] = useState<FocusLevel | null>(null);
  const [attachLevel, setAttachLevel] = useState<AttachLevel | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [rewards, setRewards] = useState<string[]>([]);
  const [walkMinutes, setWalkMinutes] = useState('');
  const [openOptional, setOpenOptional] = useState<Record<string, boolean>>({});
  const [didHydrate, setDidHydrate] = useState(false);

  const draftData: Stage3Draft = {
    primaryConcern,
    ownerGoal,
    protectiveFactorsText,
    episodes,
    groomingContext,
    handlingSensitiveAreas,
    groomingTools,
    handlingNotes,
    noiseSources,
    noiseReactionDetail,
    recoveryPattern,
    healthStatus,
    healthIssues,
    healthNote,
    hadSurgery,
    surgeryNote,
    adoptionStory,
    socializationNotes,
    feedingSchedule,
    playRoutine,
    eliminationRoutine,
    educationExperience,
    temperamentMemo,
    envReaction,
    personReaction,
    dogReaction,
    noiseReaction,
    focusLevel,
    attachLevel,
    energyLevel,
    rewards,
    walkMinutes,
  };

  const { loadedDraft, clearDraft } = useDraftSave<Stage3Draft>({
    stageKey: `stage3_${targetDogId ?? 'direct-entry'}`,
    data: draftData,
  });

  const applyDraft = useCallback((draft: Partial<Stage3Draft>) => {
    setPrimaryConcern(draft.primaryConcern ?? '');
    setOwnerGoal(draft.ownerGoal ?? '');
    setProtectiveFactorsText(draft.protectiveFactorsText ?? '');
    setEpisodes(draft.episodes?.length ? draft.episodes : [blankEpisode(1)]);
    setGroomingContext(draft.groomingContext ?? '');
    setHandlingSensitiveAreas(draft.handlingSensitiveAreas ?? []);
    setGroomingTools(draft.groomingTools ?? []);
    setHandlingNotes(draft.handlingNotes ?? '');
    setNoiseSources(draft.noiseSources ?? []);
    setNoiseReactionDetail(draft.noiseReactionDetail ?? '');
    setRecoveryPattern(draft.recoveryPattern ?? '');
    setHealthStatus(draft.healthStatus ?? null);
    setHealthIssues(draft.healthIssues ?? []);
    setHealthNote(draft.healthNote ?? '');
    setHadSurgery(draft.hadSurgery ?? null);
    setSurgeryNote(draft.surgeryNote ?? '');
    setAdoptionStory(draft.adoptionStory ?? '');
    setSocializationNotes(draft.socializationNotes ?? '');
    setFeedingSchedule(draft.feedingSchedule ?? '');
    setPlayRoutine(draft.playRoutine ?? '');
    setEliminationRoutine(draft.eliminationRoutine ?? '');
    setEducationExperience(draft.educationExperience ?? '');
    setTemperamentMemo(draft.temperamentMemo ?? '');
    setEnvReaction(draft.envReaction ?? null);
    setPersonReaction(draft.personReaction ?? null);
    setDogReaction(draft.dogReaction ?? null);
    setNoiseReaction(draft.noiseReaction ?? null);
    setFocusLevel(draft.focusLevel ?? null);
    setAttachLevel(draft.attachLevel ?? null);
    setEnergyLevel(draft.energyLevel ?? null);
    setRewards(draft.rewards ?? []);
    setWalkMinutes(draft.walkMinutes ?? '');
  }, []);

  useEffect(() => {
    if (didHydrate) return;
    if (loadedDraft) {
      applyDraft(loadedDraft);
      setDidHydrate(true);
      return;
    }

    const saved = dogEnvQuery.data?.onboarding_survey?.stage3_response;
    if (!saved) return;
    const intake = saved.case_intake;
    const sections = intake?.sections;
    const grooming = sections?.grooming_handling;
    applyDraft({
      primaryConcern: sections?.case_summary ?? '',
      ownerGoal: sections?.owner_goals?.join('\n') ?? '',
      protectiveFactorsText: sections?.protective_factors?.join('\n') ?? '',
      episodes: intake?.behavior_episodes?.length
        ? intake.behavior_episodes.map((episode, index) => ({
          ...episode,
          localId: episode.id ?? `saved_${index}`,
        }))
        : [blankEpisode(1)],
      groomingContext: grooming?.grooming_context ?? '',
      handlingSensitiveAreas: grooming?.handling_sensitive_areas ?? [],
      groomingTools: grooming?.grooming_tools ?? [],
      handlingNotes: grooming?.handling_notes ?? '',
      noiseSources: grooming?.noise_sources ?? [],
      noiseReactionDetail: grooming?.noise_reaction ?? '',
      recoveryPattern: grooming?.recovery_pattern ?? '',
      healthIssues: saved.health_meta?.chronic_issues ?? [],
      healthNote: saved.health_meta?.vet_notes ?? '',
      envReaction: saved.temperament?.env_reaction as EnvReaction | null,
      personReaction: saved.temperament?.person_reaction as PersonReaction | null,
      dogReaction: saved.temperament?.dog_reaction as DogReaction | null,
      focusLevel: saved.temperament?.focus_level as FocusLevel | null,
      attachLevel: saved.temperament?.attach_level as AttachLevel | null,
      energyLevel: saved.temperament?.energy_level ?? null,
      rewards: saved.rewards_meta?.ids ?? [],
      walkMinutes: saved.activity_meta?.daily_walk_minutes
        ? String(saved.activity_meta.daily_walk_minutes)
        : '',
    });
    setDidHydrate(true);
  }, [applyDraft, didHydrate, dogEnvQuery.data, loadedDraft]);

  const toggleValue = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  const toggleIssue = (id: string) => toggleValue(id, setHealthIssues);

  const toggleReward = (id: string) => {
    setRewards((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    ));
  };

  const updateEpisode = (localId: string, field: keyof EpisodeDraft, value: string | number) => {
    setEpisodes((prev) => prev.map((episode) => (
      episode.localId === localId ? { ...episode, [field]: value } : episode
    )));
  };

  const coreChecklist = [
    Boolean(primaryConcern.trim() && ownerGoal.trim()),
    episodes.some(hasEpisodeContent),
    Boolean(groomingContext.trim() || handlingNotes.trim() || noiseReactionDetail.trim() || noiseSources.length),
  ];
  const coreCompleted = coreChecklist.filter(Boolean).length;
  const isCoreComplete = coreCompleted === coreChecklist.length;

  const buildChronicIssues = (): string[] => {
    const issues = [...healthIssues];
    if (healthNote.trim()) issues.push(healthNote.trim());
    if (hadSurgery && surgeryNote.trim()) issues.push(`수술: ${surgeryNote.trim()}`);
    return issues;
  };

  const handleSubmit = useCallback(() => {
    if (!targetDogId) {
      Alert.alert('반려견 정보가 필요해요', '먼저 반려견 프로필을 등록한 뒤 다시 시도해주세요.', [
        { text: '확인', onPress: () => navigation.navigate('/onboarding/stage1-form' as never) },
      ]);
      return;
    }

    const filteredEpisodes = episodes.filter(hasEpisodeContent).map((episode, index) => ({
      id: episode.id ?? `episode_${index + 1}`,
      title: episode.title,
      situation: episode.situation,
      antecedent: episode.antecedent,
      behavior: episode.behavior,
      consequence: episode.consequence,
      duration: episode.duration,
      intensity: episode.intensity,
      recovery: episode.recovery,
      owner_response: episode.owner_response,
    }));

    const payload: SurveyStage3Request = {
      temperament: {
        sensitivity_score: noiseReaction === 'prolonged' ? 5 : noiseReaction === 'recover' ? 3 : 1,
        energy_level: energyLevel ?? undefined,
        env_reaction: envReaction ?? undefined,
        person_reaction: personReaction ?? undefined,
        dog_reaction: dogReaction ?? undefined,
        focus_level: focusLevel ?? undefined,
        attach_level: attachLevel ?? undefined,
      },
      health_meta: {
        chronic_issues: buildChronicIssues(),
        medications: [],
        vet_notes: healthStatus === 'healthy' ? undefined : healthNote || undefined,
      },
      activity_meta: {
        daily_walk_minutes: walkMinutes ? parseInt(walkMinutes, 10) : 0,
        exercise_level: energyLevel && energyLevel >= 4 ? 'high' : energyLevel && energyLevel <= 2 ? 'low' : 'medium',
      },
      rewards_meta: { ids: rewards },
      case_intake: {
        status: isCoreComplete ? 'submitted' : 'draft',
        source_context: params.mode === 'edit' ? 'profile_edit' : 'pro_intake',
        sections: {
          case_summary: primaryConcern.trim(),
          owner_goals: splitLines(ownerGoal),
          priority_concerns: splitLines(primaryConcern).slice(0, 3),
          protective_factors: splitLines(protectiveFactorsText),
          grooming_handling: {
            grooming_context: groomingContext.trim(),
            handling_sensitive_areas: handlingSensitiveAreas,
            grooming_tools: groomingTools,
            handling_notes: handlingNotes.trim(),
            noise_sources: noiseSources,
            noise_reaction: noiseReactionDetail.trim(),
            recovery_pattern: recoveryPattern.trim(),
          },
          health_context: { healthStatus, healthIssues, healthNote, hadSurgery, surgeryNote },
          adoption_socialization: { adoptionStory, socializationNotes },
          nutrition: { feedingSchedule },
          walk_play_elimination: { walkMinutes, playRoutine, eliminationRoutine },
          training_history: { educationExperience, rewards },
          temperament_detail: {
            envReaction,
            personReaction,
            dogReaction,
            noiseReaction,
            focusLevel,
            attachLevel,
            energyLevel,
            temperamentMemo,
          },
          trainer_notes: temperamentMemo.trim(),
        },
        behavior_episodes: filteredEpisodes,
      },
    };

    submitStage3.mutate({ dogId: targetDogId, data: payload }, {
      onSuccess: async () => {
        await clearDraft();
        navigation.navigate('/dog/profile');
      },
      onError: (err) => {
        Alert.alert('저장 실패', err.message.slice(0, 200));
      },
    });
  }, [
    targetDogId,
    navigation,
    episodes,
    noiseReaction,
    energyLevel,
    envReaction,
    personReaction,
    dogReaction,
    focusLevel,
    attachLevel,
    healthStatus,
    healthIssues,
    healthNote,
    hadSurgery,
    surgeryNote,
    walkMinutes,
    rewards,
    isCoreComplete,
    params.mode,
    primaryConcern,
    ownerGoal,
    protectiveFactorsText,
    groomingContext,
    handlingSensitiveAreas,
    groomingTools,
    handlingNotes,
    noiseSources,
    noiseReactionDetail,
    recoveryPattern,
    adoptionStory,
    socializationNotes,
    feedingSchedule,
    playRoutine,
    eliminationRoutine,
    educationExperience,
    temperamentMemo,
    submitStage3,
    clearDraft,
  ]);

  return (
    <FormLayout
      title={`${displayDogName} Pro 상담지`}
      onBack={() => navigation.goBack()}
      bottomCTA={{
        label: submitStage3.isPending ? '저장하고 있어요' : params.mode === 'edit' ? '저장하기' : '상담지 저장',
        onPress: handleSubmit,
        disabled: submitStage3.isPending,
      }}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>정밀 코칭 준비 {coreCompleted}/3</Text>
          <Text style={styles.summaryText}>
            꼭 필요한 정보만 먼저 저장해도 코칭 전에 확인할 수 있어요. 나머지는 생각날 때 천천히 더해도 좋아요.
          </Text>
        </View>

        <SectionHeader iconSource={ICONS['ic-training']} title="행동 고민/목표" />
        <Section label="가장 먼저 다루고 싶은 고민과 목표">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={primaryConcern}
            onChangeText={setPrimaryConcern}
            placeholder="예: 보호자 일시 이탈 시 짖고 따라가려 해요."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <TextInput
            style={[styles.input, styles.textArea, styles.mt8]}
            value={ownerGoal}
            onChangeText={setOwnerGoal}
            placeholder="목표를 줄바꿈으로 입력 (예: 편의점 앞에서 1분 기다리기)"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <TextInput
            style={[styles.input, styles.mt8]}
            value={protectiveFactorsText}
            onChangeText={setProtectiveFactorsText}
            placeholder="강점/보호요인 (예: 간식 보상 반응 좋음, 회복 빠름)"
            placeholderTextColor={colors.textSecondary}
          />
        </Section>

        <SectionHeader iconSource={ICONS['ic-idea']} title="상황별 행동 에피소드" />
        {episodes.map((episode, index) => (
          <EpisodeEditor
            key={episode.localId}
            episode={episode}
            index={index}
            canRemove={episodes.length > 1}
            onChange={updateEpisode}
            onRemove={() => setEpisodes((prev) => prev.filter((item) => item.localId !== episode.localId))}
          />
        ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setEpisodes((prev) => [...prev, blankEpisode(prev.length + 1)])}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>에피소드 추가</Text>
        </TouchableOpacity>

        <SectionHeader iconSource={ICONS['ic-health']} title="미용·핸들링·소리 민감도" />
        <Section label="미용/핸들링 상황">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={groomingContext}
            onChangeText={setGroomingContext}
            placeholder="예: 목욕 위탁 시 보호자가 나가면 문을 오래 바라봐요."
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <ChipGroup wrap>
            {HANDLING_AREAS.map((item) => (
              <Chip key={item} label={item} selected={handlingSensitiveAreas.includes(item)} onPress={() => toggleValue(item, setHandlingSensitiveAreas)} />
            ))}
          </ChipGroup>
          <ChipGroup wrap>
            {GROOMING_TOOLS.map((item) => (
              <Chip key={item} label={item} selected={groomingTools.includes(item)} onPress={() => toggleValue(item, setGroomingTools)} />
            ))}
          </ChipGroup>
          <TextInput
            style={[styles.input, styles.textArea, styles.mt8]}
            value={handlingNotes}
            onChangeText={setHandlingNotes}
            placeholder="핸들링/미용에서 실제 보이는 반응"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </Section>

        <Section label="소리 민감도">
          <ChipGroup wrap>
            {NOISE_SOURCES.map((item) => (
              <Chip key={item} label={item} selected={noiseSources.includes(item)} onPress={() => toggleValue(item, setNoiseSources)} />
            ))}
          </ChipGroup>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={noiseReactionDetail}
            onChangeText={setNoiseReactionDetail}
            placeholder="예: 윗집 발소리, 화장실 문 닫힘에 으르렁/짖음"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <TextInput
            style={[styles.input, styles.mt8]}
            value={recoveryPattern}
            onChangeText={setRecoveryPattern}
            placeholder="회복 패턴 (예: 오래 짖지는 않지만 빈도 증가)"
            placeholderTextColor={colors.textSecondary}
          />
        </Section>

        <OptionalSection
          id="health"
          title="건강"
          open={openOptional.health}
          onToggle={() => setOpenOptional((prev) => ({ ...prev, health: !prev.health }))}
        >
          <Section label="지금 건강 상태가 어때요?">
            <ChipGroup wrap>
              <Chip label="튼튼해요" iconSource={ICONS['ic-health']} selected={healthStatus === 'healthy'} onPress={() => setHealthStatus('healthy')} />
              <Chip label="신경 쓰이는 게 있어요" iconSource={ICONS['ic-idea']} selected={healthStatus === 'concern'} onPress={() => setHealthStatus('concern')} />
              <Chip label="치료 중이에요" iconSource={ICONS['ic-bolt']} selected={healthStatus === 'treatment'} onPress={() => setHealthStatus('treatment')} />
            </ChipGroup>
          </Section>
          <Section label="건강 이슈">
            <ChipGroup wrap>
              {HEALTH_ISSUES.map((item) => (
                <Chip
                  key={item.id}
                  label={item.label}
                  iconSource={item.iconSource}
                  selected={healthIssues.includes(item.id)}
                  onPress={() => toggleIssue(item.id)}
                />
              ))}
            </ChipGroup>
            <TextInput
              style={[styles.input, styles.mt8]}
              value={healthNote}
              onChangeText={setHealthNote}
              placeholder="직접 입력"
              placeholderTextColor={colors.textSecondary}
            />
          </Section>
          <Section label="수술 경험이 있나요? (중성화 제외)">
            <ChipGroup>
              <Chip label="있어요" iconSource={ICONS['ic-health']} selected={hadSurgery === true} onPress={() => setHadSurgery(true)} />
              <Chip label="없어요" iconSource={ICONS['ic-none']} selected={hadSurgery === false} onPress={() => setHadSurgery(false)} />
            </ChipGroup>
            {hadSurgery ? (
              <TextInput
                style={[styles.input, styles.mt8]}
                value={surgeryNote}
                onChangeText={setSurgeryNote}
                placeholder="예: 슬개골 수술"
                placeholderTextColor={colors.textSecondary}
              />
            ) : null}
          </Section>
        </OptionalSection>

        <OptionalSection
          id="history"
          title="입양/사회화"
          open={openOptional.history}
          onToggle={() => setOpenOptional((prev) => ({ ...prev, history: !prev.history }))}
        >
          <Section label="입양 스토리">
            <TextInput style={[styles.input, styles.textArea]} value={adoptionStory} onChangeText={setAdoptionStory} placeholder="입양 경로와 초반 적응 이야기" placeholderTextColor={colors.textSecondary} multiline />
          </Section>
          <Section label="사회화 시기 특이 경험">
            <TextInput style={[styles.input, styles.textArea]} value={socializationNotes} onChangeText={setSocializationNotes} placeholder="3~16주 사이 기억나는 경험" placeholderTextColor={colors.textSecondary} multiline />
          </Section>
        </OptionalSection>

        <OptionalSection
          id="daily"
          title="영양·산책·놀이·배변"
          open={openOptional.daily}
          onToggle={() => setOpenOptional((prev) => ({ ...prev, daily: !prev.daily }))}
        >
          <Section label="식사 일정">
            <TextInput style={[styles.input, styles.textArea]} value={feedingSchedule} onChangeText={setFeedingSchedule} placeholder="예: 30g씩 4회, 5/8/17/19시" placeholderTextColor={colors.textSecondary} multiline />
          </Section>
          <Section label="하루 총 산책 시간 (분)">
            <TextInput style={[styles.input, styles.inputNarrow]} value={walkMinutes} onChangeText={setWalkMinutes} placeholder="30" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" />
          </Section>
          <Section label="놀이/배변 루틴">
            <TextInput style={[styles.input, styles.textArea]} value={playRoutine} onChangeText={setPlayRoutine} placeholder="터그, 페치, 노즈워크 등" placeholderTextColor={colors.textSecondary} multiline />
            <TextInput style={[styles.input, styles.textArea, styles.mt8]} value={eliminationRoutine} onChangeText={setEliminationRoutine} placeholder="실내/실외 배변 루틴" placeholderTextColor={colors.textSecondary} multiline />
          </Section>
        </OptionalSection>

        <OptionalSection
          id="temperament"
          title="교육 경험·기질 세부"
          open={openOptional.temperament}
          onToggle={() => setOpenOptional((prev) => ({ ...prev, temperament: !prev.temperament }))}
        >
          <Section label="교육 경험">
            <TextInput style={[styles.input, styles.textArea]} value={educationExperience} onChangeText={setEducationExperience} placeholder="기본 교육, 퍼피클래스, 피어프리 등" placeholderTextColor={colors.textSecondary} multiline />
          </Section>

          <Section label="낯선 곳/사람/개 반응">
            <ChipGroup wrap>
              <Chip label="탐험해요" iconSource={ICONS['ic-search']} selected={envReaction === 'explore'} onPress={() => setEnvReaction('explore')} />
              <Chip label="천천히 적응" iconSource={ICONS['ic-calm']} selected={envReaction === 'adapt'} onPress={() => setEnvReaction('adapt')} />
              <Chip label="불안해요" iconSource={ICONS['ic-cat-anxiety']} selected={envReaction === 'anxious'} onPress={() => setEnvReaction('anxious')} />
              <Chip label="관심 없음" iconSource={ICONS['ic-none']} selected={envReaction === 'indifferent'} onPress={() => setEnvReaction('indifferent')} />
            </ChipGroup>
            <ChipGroup wrap>
              <Chip label="사람 반김" iconSource={ICONS['ic-bolt']} selected={personReaction === 'rush'} onPress={() => setPersonReaction('rush')} />
              <Chip label="관찰 후 접근" iconSource={ICONS['ic-search']} selected={personReaction === 'observe'} onPress={() => setPersonReaction('observe')} />
              <Chip label="회피" iconSource={ICONS['ic-cat-fear']} selected={personReaction === 'hide'} onPress={() => setPersonReaction('hide')} />
              <Chip label="무관심" iconSource={ICONS['ic-calm']} selected={personReaction === 'indifferent'} onPress={() => setPersonReaction('indifferent')} />
            </ChipGroup>
            <ChipGroup wrap>
              <Chip label="개에게 접근" iconSource={ICONS['ic-bolt']} selected={dogReaction === 'approach'} onPress={() => setDogReaction('approach')} />
              <Chip label="탐색" iconSource={ICONS['ic-search']} selected={dogReaction === 'sniff'} onPress={() => setDogReaction('sniff')} />
              <Chip label="짖음" iconSource={ICONS['ic-cat-barking']} selected={dogReaction === 'bark'} onPress={() => setDogReaction('bark')} />
              <Chip label="무관심" iconSource={ICONS['ic-none']} selected={dogReaction === 'indifferent'} onPress={() => setDogReaction('indifferent')} />
            </ChipGroup>
          </Section>

          <Section label="집중/애착/에너지">
            <ChipGroup wrap>
              <Chip label="간식 집중" iconSource={ICONS['ic-cat-meal']} selected={focusLevel === 'treat_only'} onPress={() => setFocusLevel('treat_only')} />
              <Chip label="집중 좋아요" iconSource={ICONS['ic-training']} selected={focusLevel === 'good'} onPress={() => setFocusLevel('good')} />
              <Chip label="산만해요" iconSource={ICONS['ic-puzzle']} selected={focusLevel === 'distracted'} onPress={() => setFocusLevel('distracted')} />
              <Chip label="관심 적음" iconSource={ICONS['ic-none']} selected={focusLevel === 'uninterested'} onPress={() => setFocusLevel('uninterested')} />
            </ChipGroup>
            <ChipGroup wrap>
              <Chip label="껌딱지" iconSource={ICONS['ic-praise']} selected={attachLevel === 'velcro'} onPress={() => setAttachLevel('velcro')} />
              <Chip label="적당히 가까움" iconSource={ICONS['ic-dog']} selected={attachLevel === 'moderate'} onPress={() => setAttachLevel('moderate')} />
              <Chip label="독립적" iconSource={ICONS['ic-cat-walk']} selected={attachLevel === 'independent'} onPress={() => setAttachLevel('independent')} />
            </ChipGroup>
            <View style={styles.energyRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.energyBtn, energyLevel === n && styles.energyBtnSelected]}
                  onPress={() => setEnergyLevel(n)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.energyText, energyLevel === n && styles.energyTextSelected]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Section label="큰 소리 반응과 보상">
            <ChipGroup wrap>
              <Chip label="차분" iconSource={ICONS['ic-calm']} selected={noiseReaction === 'calm'} onPress={() => setNoiseReaction('calm')} />
              <Chip label="금방 회복" iconSource={ICONS['ic-bolt']} selected={noiseReaction === 'recover'} onPress={() => setNoiseReaction('recover')} />
              <Chip label="오래 불안" iconSource={ICONS['ic-cat-anxiety']} selected={noiseReaction === 'prolonged'} onPress={() => setNoiseReaction('prolonged')} />
            </ChipGroup>
            <ChipGroup wrap>
              {REWARDS.map((item) => (
                <Chip
                  key={item.id}
                  label={item.label}
                  iconSource={item.iconSource}
                  selected={rewards.includes(item.id)}
                  onPress={() => toggleReward(item.id)}
                />
              ))}
            </ChipGroup>
            <TextInput style={[styles.input, styles.textArea]} value={temperamentMemo} onChangeText={setTemperamentMemo} placeholder="기질이나 행동을 더 적어주세요" placeholderTextColor={colors.textSecondary} multiline />
          </Section>
        </OptionalSection>
      </ScrollView>
    </FormLayout>
  );
}

function EpisodeEditor({
  episode,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  episode: EpisodeDraft;
  index: number;
  canRemove: boolean;
  onChange: (localId: string, field: keyof EpisodeDraft, value: string | number) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.episodeBox}>
      <View style={styles.episodeHeader}>
        <Text style={styles.episodeTitle}>에피소드 {index + 1}</Text>
        {canRemove ? (
          <TouchableOpacity onPress={onRemove} activeOpacity={0.7}>
            <Text style={styles.removeText}>삭제</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TextInput style={styles.input} value={episode.title} onChangeText={(text) => onChange(episode.localId, 'title', text)} placeholder="상황 이름 (예: 편의점 앞 이탈)" placeholderTextColor={colors.textSecondary} />
      <TextInput style={[styles.input, styles.textArea, styles.mt8]} value={episode.situation} onChangeText={(text) => onChange(episode.localId, 'situation', text)} placeholder="발생 상황" placeholderTextColor={colors.textSecondary} multiline />
      <TextInput style={[styles.input, styles.textArea, styles.mt8]} value={episode.antecedent} onChangeText={(text) => onChange(episode.localId, 'antecedent', text)} placeholder="직전 단서/전조" placeholderTextColor={colors.textSecondary} multiline />
      <TextInput style={[styles.input, styles.textArea, styles.mt8]} value={episode.behavior} onChangeText={(text) => onChange(episode.localId, 'behavior', text)} placeholder="구체 행동" placeholderTextColor={colors.textSecondary} multiline />
      <TextInput style={[styles.input, styles.textArea, styles.mt8]} value={episode.consequence} onChangeText={(text) => onChange(episode.localId, 'consequence', text)} placeholder="이후 결과/보호자 반응" placeholderTextColor={colors.textSecondary} multiline />
      <TextInput style={[styles.input, styles.mt8]} value={episode.recovery} onChangeText={(text) => onChange(episode.localId, 'recovery', text)} placeholder="회복 시간/패턴" placeholderTextColor={colors.textSecondary} />
      <View style={styles.energyRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.energyBtn, episode.intensity === n && styles.energyBtnSelected]}
            onPress={() => onChange(episode.localId, 'intensity', n)}
            activeOpacity={0.7}
          >
            <Text style={[styles.energyText, episode.intensity === n && styles.energyTextSelected]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SectionHeader({ iconSource, title }: { iconSource?: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      {iconSource ? <Image source={{ uri: iconSource }} style={styles.sectionHeaderIcon} /> : null}
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function OptionalSection({
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.optionalShell}>
      <TouchableOpacity style={styles.optionalHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.optionalTitle}>{title}</Text>
        <Text style={styles.optionalToggle}>{open ? '접기' : '열기'}</Text>
      </TouchableOpacity>
      {open ? <View style={styles.optionalBody}>{children}</View> : null}
    </View>
  );
}

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function ChipGroup({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) {
  return <View style={[styles.chipGroup, wrap && styles.chipGroupWrap]}>{children}</View>;
}

function Chip({
  label,
  iconSource,
  selected,
  onPress,
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
  scroll: { padding: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  summaryBox: {
    padding: spacing.lg,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBlueLight,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.lg,
  },
  summaryTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  summaryText: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderIcon: { width: 24, height: 24 },
  sectionHeaderText: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary },
  section: { marginBottom: spacing.xl },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary },
  chipGroup: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chipGroupWrap: { flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.xs,
  },
  chipSelected: { borderColor: colors.primaryBlue, backgroundColor: colors.primaryBlueLight },
  chipIcon: { width: 18, height: 18 },
  chipText: { ...typography.bodySmall, color: colors.textSecondary },
  chipTextSelected: { color: colors.primaryBlue, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
  },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  inputNarrow: { width: 120 },
  mt8: { marginTop: spacing.sm },
  episodeBox: {
    padding: spacing.lg,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  episodeTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary },
  removeText: { ...typography.caption, color: colors.red600, fontWeight: '700' },
  addButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    marginBottom: spacing.lg,
  },
  addButtonText: { ...typography.bodySmall, color: colors.primaryBlue, fontWeight: '700' },
  optionalShell: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  optionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  optionalTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  optionalToggle: { ...typography.bodySmall, color: colors.primaryBlue, fontWeight: '700' },
  optionalBody: { paddingTop: spacing.sm },
  energyRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  energyBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  energyBtnSelected: {
    borderColor: colors.primaryBlue,
    backgroundColor: colors.primaryBlueLight,
  },
  energyText: { ...typography.body, color: colors.textSecondary, fontWeight: '700' },
  energyTextSelected: { color: colors.primaryBlue },
});

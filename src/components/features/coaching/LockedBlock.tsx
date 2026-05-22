/**
 * LockedBlock — PRO 잠금 블록 ④⑤⑥ (next_7_days, risk_signals, consultation_questions)
 * Skeleton 블러 + RewardedAdButton으로 해제
 * 인터랙티브 카드: 수평 타임라인, 게이지 바, 프로필 카드
 * Parity: AI-001
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { Next7DaysBlock, RiskSignalsBlock, ConsultationQuestionsBlock, DayPlan } from 'types/coaching';
import { colors, typography, spacing } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';
import { ModalLayout } from 'components/shared/layouts/ModalLayout';
import {
  formatLocalizedList,
  localizeCurriculum,
  localizeStructuredText,
  localizeTool,
} from 'lib/data/coachingLocalization';

const BLOCK_META: Record<string, {
  label: string;
  iconSource: string;
  teaser: string;
  previewItems: string[];
}> = {
  next_7_days: {
    label: '7일 맞춤 플랜',
    iconSource: ICONS['ic-training']!,
    teaser: '다음 7일 동안 해볼 훈련 계획을 확인해요',
    previewItems: [
      '날짜별 초점·목표',
      '구체적 연습 (시간·빈도)',
      '장소·준비물',
      '성공 기준·다음 단계',
    ],
  },
  risk_signals: {
    label: '위험 신호 분석',
    iconSource: ICONS['ic-bolt']!,
    teaser: '놓치기 쉬운 행동 신호를 AI가 살펴봤어요',
    previewItems: [
      '경고 신호 식별',
      '심각도 평가',
      '즉시 대응법',
      '전문가 상담 기준',
    ],
  },
  consultation_questions: {
    label: '전문가 상담 질문',
    iconSource: ICONS['ic-trainer']!,
    teaser: '수의사나 훈련사에게 물어볼 질문을 준비했어요',
    previewItems: [
      '기질·성향 확인',
      '건강상 원인',
      '실전 기법·장비',
    ],
  },
};

interface LockedBlockProps {
  blockKey: 'next_7_days' | 'risk_signals' | 'consultation_questions';
}

export function LockedBlock({ blockKey }: LockedBlockProps) {
  const meta = BLOCK_META[blockKey]!;

  return (
    <View style={styles.card}>
      <Text style={styles.blockLabel}>{meta.label}</Text>
      <View style={styles.lockOverlay}>
        <Image source={{ uri: meta.iconSource }} style={styles.lockIconImg} />
        <Text style={styles.lockTitle}>{meta.label}</Text>
        <Text style={styles.lockTeaser}>{meta.teaser}</Text>

        {/* Phase 5: 카테고리 + 1줄 힌트 미리보기 — PRO 가치 명시 */}
        <View style={styles.previewSection} testID="locked-block-preview">
          <Text style={styles.previewLabel}>이 블록에서 확인할 수 있어요</Text>
          {meta.previewItems.map((item) => (
            <View key={item} style={styles.previewItem}>
              <Text style={styles.previewBullet}>{'•'}</Text>
              <Text style={styles.previewItemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Skeleton 블러 효과 */}
        <View style={styles.skeletonGroup}>
          <View style={[styles.skeleton, { width: '90%' }]} />
          <View style={[styles.skeleton, { width: '75%' }]} />
          <View style={[styles.skeleton, { width: '85%' }]} />
          <View style={[styles.skeleton, { width: '60%' }]} />
        </View>

        <View style={styles.blurOverlay}>
          <Image source={{ uri: ICONS['badge-pro'] }} style={styles.blurIconImg} />
          <Text style={styles.blurText}>PRO 전용 콘텐츠</Text>
        </View>
      </View>
    </View>
  );
}

/** 잠금 해제된 PRO 블록 렌더링 */
export function UnlockedBlock({
  blockKey,
  children,
  defaultCollapsed = false,
}: {
  blockKey: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const meta = BLOCK_META[blockKey];
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.unlockedHeader}
        onPress={() => setIsCollapsed((prev) => !prev)}
        activeOpacity={0.75}
      >
        <Text style={styles.blockLabel}>{meta?.label ?? blockKey}</Text>
        {defaultCollapsed && (
          <Text style={styles.drawerToggleText}>{isCollapsed ? '열기' : '접기'}</Text>
        )}
      </TouchableOpacity>
      {isCollapsed ? (
        <Text style={styles.drawerPreview}>{meta?.teaser ?? '자세한 내용을 접어두었어요.'}</Text>
      ) : children}
    </View>
  );
}

// ──────────────────────────────────────
// PRO 블록 ④: 7일 맞춤 플랜 — Swipeable Carousel + dots indicator (Phase 6)
// ──────────────────────────────────────

const TIMELINE_CARD_WIDTH = 184;
const TIMELINE_GAP = 12; // spacing.md
const TIMELINE_SNAP = TIMELINE_CARD_WIDTH + TIMELINE_GAP;

export function Next7DaysView({
  data,
  generatedAt,
}: {
  data: Next7DaysBlock;
  generatedAt?: string;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeDayNumber = getGeneratedPlanDayNumber(generatedAt);

  // 초기 진입 시 오늘 day로 자동 스크롤 — Phase 6 발견성 개선
  useEffect(() => {
    if (
      activeDayNumber !== null &&
      activeDayNumber >= 1 &&
      activeDayNumber <= data.days.length
    ) {
      const idx = activeDayNumber - 1;
      setCurrentIndex(idx);
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: idx * TIMELINE_SNAP, animated: false });
      }, 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [activeDayNumber, data.days.length]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / TIMELINE_SNAP);
    setCurrentIndex(Math.max(0, Math.min(idx, data.days.length - 1)));
  };

  const jumpToIndex = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * TIMELINE_SNAP, animated: true });
    setCurrentIndex(idx);
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroll}
        snapToInterval={TIMELINE_SNAP}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {data.days.map((day) => {
          const isActiveDay = day.day_number === activeDayNumber;
          return (
            <TouchableOpacity
              key={day.day_number}
              activeOpacity={0.82}
              onPress={() => setSelectedDay(day)}
              style={[styles.timelineCard, isActiveDay && styles.timelineCardToday]}
            >
              <View style={styles.timelineHeader}>
                <View style={[styles.dayBadge, isActiveDay && styles.dayBadgeToday]}>
                  <Text style={[styles.dayNumber, isActiveDay && styles.dayNumberToday]}>
                    {day.day_number}일차
                  </Text>
                </View>
                {isActiveDay && <Text style={styles.todayLabel}>오늘</Text>}
              </View>
              <Text style={styles.dayFocus} numberOfLines={2}>{localizeStructuredText(day.focus)}</Text>
              {day.tasks.slice(0, 2).map((task, i) => (
                <View key={i} style={styles.taskRow}>
                  <Text style={styles.taskBullet}>{'•'}</Text>
                  <Text style={styles.dayTask} numberOfLines={2}>{localizeStructuredText(task)}</Text>
                </View>
              ))}
              <DayPlanMeta day={day} compact />
              <Text style={styles.openDetailText}>자세히 보기</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Phase 6: dots indicator — 수평 스크롤 발견성 명시 */}
      <View style={styles.dotsRow} testID="next-7-days-dots">
        {data.days.map((day, idx) => (
          <TouchableOpacity
            key={day.day_number}
            onPress={() => jumpToIndex(idx)}
            style={styles.dotTouch}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`${day.day_number}일차로 이동`}
          >
            <View style={[styles.dot, idx === currentIndex && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={!!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <ModalLayout
          title={selectedDay ? `${selectedDay.day_number}일차 자세히 보기` : '7일 플랜'}
          onClose={() => setSelectedDay(null)}
        >
          {selectedDay && <DayPlanDetail day={selectedDay} />}
        </ModalLayout>
      </Modal>
    </>
  );
}

function DayPlanMeta({ day, compact = false }: { day: DayPlan; compact?: boolean }) {
  const rows: Array<{ label: string; value: string }> = [];
  if (day.session_duration_minutes) rows.push({ label: '시간', value: `${day.session_duration_minutes}분` });
  if (day.environment) rows.push({ label: '장소', value: localizeStructuredText(day.environment) });
  if (!compact && day.tools?.length) rows.push({ label: '준비물', value: formatLocalizedList(day.tools, localizeTool) });
  if (day.progression_rule) rows.push({ label: '다음 기준', value: localizeStructuredText(day.progression_rule) });
  if (!compact && day.reference_curriculum_ids?.length) rows.push({ label: '참고 훈련', value: formatLocalizedList(day.reference_curriculum_ids, localizeCurriculum) });

  if (rows.length === 0) return null;

  return (
    <View style={styles.dayMetaBox}>
      {rows.map((row) => (
        <View key={row.label} style={styles.dayMetaRow}>
          <Text style={styles.dayMetaLabel}>{row.label}</Text>
          <Text style={styles.dayMetaText} numberOfLines={2}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

function DayPlanDetail({ day }: { day: DayPlan }) {
  const toolText = formatLocalizedList(day.tools, localizeTool);
  const curriculumText = formatLocalizedList(day.reference_curriculum_ids, localizeCurriculum);

  return (
    <View>
      <Text style={styles.detailFocus}>{localizeStructuredText(day.focus)}</Text>
      <Text style={styles.detailSectionTitle}>할 일</Text>
      {day.tasks.map((task, index) => (
        <View key={`${day.day_number}-${index}`} style={styles.detailTaskRow}>
          <View style={styles.detailTaskBadge}>
            <Text style={styles.detailTaskBadgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.detailTaskText}>{localizeStructuredText(task)}</Text>
        </View>
      ))}

      <View style={styles.detailMetaGroup}>
        {day.session_duration_minutes ? (
          <DetailRow label="시간" value={`${day.session_duration_minutes}분`} />
        ) : null}
        {day.environment ? <DetailRow label="장소" value={localizeStructuredText(day.environment)} /> : null}
        {toolText ? <DetailRow label="준비물" value={toolText} /> : null}
        {day.progression_rule ? <DetailRow label="다음 단계 기준" value={localizeStructuredText(day.progression_rule)} /> : null}
        {curriculumText ? <DetailRow label="참고 훈련" value={curriculumText} /> : null}
      </View>
    </View>
  );
}

function getGeneratedPlanDayNumber(generatedAt?: string): number | null {
  if (!generatedAt) return null;
  const generated = new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) return null;
  const generatedDate = new Date(generated.getFullYear(), generated.getMonth(), generated.getDate());
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((todayDate.getTime() - generatedDate.getTime()) / 86_400_000);
  if (diffDays < 0 || diffDays > 6) return null;
  return diffDays + 1;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailMetaRow}>
      <Text style={styles.detailMetaLabel}>{label}</Text>
      <Text style={styles.detailMetaText}>{value}</Text>
    </View>
  );
}

// ──────────────────────────────────────
// PRO 블록 ⑤: 위험 신호 분석 — 게이지 바 + 아이콘 카드
// ──────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  low: colors.green500,
  medium: colors.orange500,
  high: colors.red500,
  critical: colors.red700,
};

const RISK_GAUGE: Record<string, number> = {
  low: 0.2,
  medium: 0.5,
  high: 0.75,
  critical: 0.95,
};

const RISK_LABEL: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '심각',
};

export function RiskSignalsView({ data }: { data: RiskSignalsBlock }) {
  const gaugeWidth = RISK_GAUGE[data.overall_risk] ?? 0.5;

  return (
    <View>
      {/* 게이지 바 */}
      <View style={styles.gaugeContainer}>
        <Text style={styles.gaugeTitle}>전체 위험도</Text>
        <View style={styles.gaugeBar}>
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${gaugeWidth * 100}%`,
                backgroundColor: SEVERITY_COLOR[data.overall_risk],
              },
            ]}
          />
        </View>
        <Text style={[styles.gaugeLabel, { color: SEVERITY_COLOR[data.overall_risk] }]}>
          {RISK_LABEL[data.overall_risk]}
        </Text>
      </View>

      {/* 위험 신호 카드 */}
      {data.signals.map((signal, idx) => (
        <View key={idx} style={styles.signalCard}>
          <View style={styles.signalHeader}>
            <View style={[styles.signalDot, { backgroundColor: SEVERITY_COLOR[signal.severity] ?? colors.grey400 }]} />
            <Text style={styles.signalType}>{localizeStructuredText(signal.type)}</Text>
          </View>
          <Text style={styles.signalDesc}>{localizeStructuredText(signal.description)}</Text>
          <View style={styles.signalRecBox}>
            <Text style={styles.signalRecLabel}>권장사항</Text>
            <Text style={styles.signalRec}>{localizeStructuredText(signal.recommendation)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ──────────────────────────────────────
// PRO 블록 ⑥: 전문가 상담 질문 — 프로필 카드 + 복사 가능 질문
// ──────────────────────────────────────

const SPECIALIST_META: Record<string, { iconSource: string; label: string; desc: string }> = {
  behaviorist: { iconSource: ICONS['ic-idea']!, label: '행동 전문가', desc: '동물행동학 기반 문제행동 분석' },
  trainer: { iconSource: ICONS['ic-trainer']!, label: '전문 훈련사', desc: '실전 행동교정 및 사회화 훈련' },
  vet: { iconSource: ICONS['ic-paw']!, label: '수의사', desc: '건강 원인 행동 문제 진단' },
};

export function ConsultationView({ data }: { data: ConsultationQuestionsBlock }) {
  const specialist = data.recommended_specialist
    ? SPECIALIST_META[data.recommended_specialist]
    : null;

  return (
    <View>
      {/* 전문가 프로필 카드 */}
      {specialist && (
        <View style={styles.specialistCard}>
          <Image source={{ uri: specialist.iconSource }} style={styles.specialistIconImg} />
          <View style={styles.specialistInfo}>
            <Text style={styles.specialistTitle}>
              추천: {specialist.label}
            </Text>
            <Text style={styles.specialistDesc}>{specialist.desc}</Text>
          </View>
        </View>
      )}

      {/* 질문 리스트 */}
      <Text style={styles.questionSectionTitle}>상담 시 질문 리스트</Text>
      {data.questions.map((q, idx) => (
        <View key={idx} style={styles.questionCard}>
          <View style={styles.questionBadge}>
            <Text style={styles.questionBadgeText}>Q{idx + 1}</Text>
          </View>
          <Text style={styles.questionText}>{localizeStructuredText(q)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  blockLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  lockOverlay: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  lockIconImg: {
    width: 40,
    height: 40,
    marginBottom: spacing.sm,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerToggleText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  drawerPreview: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  lockTitle: {
    ...typography.label,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  lockTeaser: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  previewSection: {
    width: '100%',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  previewLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  previewBullet: {
    ...typography.caption,
    color: colors.textTertiary,
    marginRight: spacing.xs,
    marginTop: 2,
  },
  previewItemText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  skeletonGroup: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  skeleton: {
    height: 14,
    backgroundColor: colors.divider,
    borderRadius: 7,
  },
  blurOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  blurIconImg: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  blurText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // ── 7일 플랜 타임라인 ──
  timelineScroll: {
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  // ── Phase 6: dots indicator ──
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  dotTouch: {
    padding: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grey200,
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryBlue,
  },
  timelineCard: {
    width: 184,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  timelineCardToday: {
    borderColor: colors.primaryBlue,
    borderWidth: 2,
    backgroundColor: colors.blue50,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dayBadge: {
    backgroundColor: colors.primaryBlueLight,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dayBadgeToday: {
    backgroundColor: colors.primaryBlue,
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  dayNumberToday: {
    color: colors.white,
  },
  todayLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  dayFocus: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  taskBullet: {
    ...typography.caption,
    color: colors.grey500,
    marginRight: 4,
  },
  dayTask: {
    ...typography.caption,
    lineHeight: 18,
    color: colors.grey600,
    flex: 1,
  },
  dayMetaBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  dayMetaLabel: {
    ...typography.caption,
    width: 52,
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  dayMetaText: {
    ...typography.caption,
    flex: 1,
    color: colors.grey700,
  },
  openDetailText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  detailFocus: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  detailTaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailTaskBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  detailTaskBadgeText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  detailTaskText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 22,
    flex: 1,
  },
  detailMetaGroup: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  detailMetaRow: {
    gap: spacing.xs,
  },
  detailMetaLabel: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  detailMetaText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  // ── 위험 게이지 ──
  gaugeContainer: {
    marginBottom: spacing.lg,
  },
  gaugeTitle: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  gaugeBar: {
    height: 8,
    backgroundColor: colors.grey100,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeLabel: {
    ...typography.caption,
    fontWeight: '700',
    textAlign: 'right',
  },
  // ── 위험 신호 카드 ──
  signalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  signalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  signalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  signalType: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textDark,
  },
  signalDesc: {
    ...typography.caption,
    color: colors.grey600,
    marginBottom: spacing.sm,
  },
  signalRecBox: {
    backgroundColor: colors.blue50,
    borderRadius: 8,
    padding: spacing.md,
  },
  signalRecLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primaryBlue,
    marginBottom: 2,
  },
  signalRec: {
    ...typography.caption,
    color: colors.grey700,
  },
  // ── 전문가 프로필 ──
  specialistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  specialistIconImg: {
    width: 36,
    height: 36,
    marginRight: spacing.lg,
  },
  specialistInfo: {
    flex: 1,
  },
  specialistTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  specialistDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // ── 질문 ──
  questionSectionTitle: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: spacing.md,
  },
  questionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  questionBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  questionText: {
    flex: 1,
    ...typography.detail,
    lineHeight: 21,
    color: colors.textDark,
  },
});

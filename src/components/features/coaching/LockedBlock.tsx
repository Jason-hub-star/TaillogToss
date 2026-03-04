/**
 * LockedBlock — PRO 잠금 블록 ④⑤⑥ (next_7_days, risk_signals, consultation_questions)
 * Skeleton 블러 + RewardedAdButton으로 해제
 * 인터랙티브 카드: 수평 타임라인, 게이지 바, 프로필 카드
 * Parity: AI-001
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { Next7DaysBlock, RiskSignalsBlock, ConsultationQuestionsBlock } from 'types/coaching';
import { colors, typography, spacing } from 'styles/tokens';

const BLOCK_META: Record<string, { label: string; icon: string; teaser: string }> = {
  next_7_days: {
    label: '7일 맞춤 플랜',
    icon: '📅',
    teaser: '다음 7일간 해야 할 구체적인 훈련 계획을 확인하세요',
  },
  risk_signals: {
    label: '위험 신호 분석',
    icon: '⚠️',
    teaser: '놓치고 있는 행동 위험 신호를 AI가 분석했습니다',
  },
  consultation_questions: {
    label: '전문가 상담 질문',
    icon: '👨‍⚕️',
    teaser: '수의사/훈련사에게 꼭 물어볼 맞춤 질문을 준비했습니다',
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
        <Text style={styles.lockIcon}>{meta.icon}</Text>
        <Text style={styles.lockTitle}>{meta.label}</Text>
        <Text style={styles.lockTeaser}>{meta.teaser}</Text>

        {/* Skeleton 블러 효과 */}
        <View style={styles.skeletonGroup}>
          <View style={[styles.skeleton, { width: '90%' }]} />
          <View style={[styles.skeleton, { width: '75%' }]} />
          <View style={[styles.skeleton, { width: '85%' }]} />
          <View style={[styles.skeleton, { width: '60%' }]} />
        </View>

        <View style={styles.blurOverlay}>
          <Text style={styles.blurIcon}>🔒</Text>
          <Text style={styles.blurText}>PRO 전용 콘텐츠</Text>
        </View>
      </View>
    </View>
  );
}

/** 잠금 해제된 PRO 블록 렌더링 */
export function UnlockedBlock({ blockKey, children }: { blockKey: string; children: React.ReactNode }) {
  const meta = BLOCK_META[blockKey];
  return (
    <View style={styles.card}>
      <Text style={styles.blockLabel}>{meta?.label ?? blockKey}</Text>
      {children}
    </View>
  );
}

// ──────────────────────────────────────
// PRO 블록 ④: 7일 맞춤 플랜 — 수평 스크롤 타임라인 카드
// ──────────────────────────────────────

export function Next7DaysView({
  data,
}: {
  data: Next7DaysBlock;
}) {
  const today = new Date().getDay(); // 0=Sun
  const todayIndex = today === 0 ? 6 : today - 1; // 0=Mon

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.timelineScroll}
    >
      {data.days.map((day) => {
        const isToday = day.day_number - 1 === todayIndex;
        return (
          <View
            key={day.day_number}
            style={[styles.timelineCard, isToday && styles.timelineCardToday]}
          >
            <View style={styles.timelineHeader}>
              <View style={[styles.dayBadge, isToday && styles.dayBadgeToday]}>
                <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                  Day {day.day_number}
                </Text>
              </View>
              {isToday && <Text style={styles.todayLabel}>오늘</Text>}
            </View>
            <Text style={styles.dayFocus} numberOfLines={2}>{day.focus}</Text>
            {day.tasks.map((task, i) => (
              <View key={i} style={styles.taskRow}>
                <Text style={styles.taskBullet}>{'•'}</Text>
                <Text style={styles.dayTask} numberOfLines={2}>{task}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
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

const SEVERITY_ICON: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
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
            <Text style={styles.signalIcon}>
              {SEVERITY_ICON[signal.severity]}
            </Text>
            <Text style={styles.signalType}>{signal.type}</Text>
          </View>
          <Text style={styles.signalDesc}>{signal.description}</Text>
          <View style={styles.signalRecBox}>
            <Text style={styles.signalRecLabel}>💡 권장사항</Text>
            <Text style={styles.signalRec}>{signal.recommendation}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ──────────────────────────────────────
// PRO 블록 ⑥: 전문가 상담 질문 — 프로필 카드 + 복사 가능 질문
// ──────────────────────────────────────

const SPECIALIST_META: Record<string, { icon: string; label: string; desc: string }> = {
  behaviorist: { icon: '🧠', label: '행동 전문가', desc: '동물행동학 기반 문제행동 분석' },
  trainer: { icon: '🎓', label: '전문 훈련사', desc: '실전 행동교정 및 사회화 훈련' },
  vet: { icon: '🏥', label: '수의사', desc: '건강 원인 행동 문제 진단' },
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
          <Text style={styles.specialistIcon}>{specialist.icon}</Text>
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
          <Text style={styles.questionText}>{q}</Text>
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
  lockIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
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
  blurIcon: {
    ...typography.detail,
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
  timelineCard: {
    width: 160,
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
  signalIcon: {
    fontSize: 14,
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
  specialistIcon: {
    fontSize: 36,
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

/**
 * AI 맞춤 추천 커리큘럼 카드 — 점수 분해 + 로그 기반 근거 + PRO 잠금
 * Parity: UI-TRAINING-PERSONALIZATION-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { CURRICULUMS } from 'lib/data/published/runtime';
import { ICONS } from 'lib/data/iconSources';
import type { CurriculumId } from 'types/training';
import type { ScoreBand } from 'lib/data/recommendation/engine';
import { colors, typography, spacing } from 'styles/tokens';

interface Props {
  curriculumId: CurriculumId;
  reasoning: string;
  scoreBand?: ScoreBand;
  logCount: number;
  isPro: boolean;
  onPress: () => void;
  contextTags?: string[];
  isFromRecentCoaching?: boolean; // Phase 7: 최근 코칭 추천 배지
}

export function RecommendedCurriculumCard({
  curriculumId,
  reasoning,
  scoreBand,
  logCount,
  isPro,
  onPress,
  contextTags,
  isFromRecentCoaching,
}: Props) {
  const curriculum = CURRICULUMS.find((c) => c.id === curriculumId);
  if (!curriculum) return null;

  const difficultyLabel: Record<string, string> = {
    beginner: '초급',
    intermediate: '중급',
    advanced: '고급',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI 추천</Text>
          </View>
          {/* Phase 7: 최근 코칭 추천에서 boost된 항목 표시 */}
          {isFromRecentCoaching && (
            <View style={styles.coachingBadge} testID="recommended-from-coaching-badge">
              <Text style={styles.coachingBadgeText}>최근 코칭 추천</Text>
            </View>
          )}
        </View>
        <Text style={styles.difficulty}>
          {difficultyLabel[curriculum.difficulty] ?? curriculum.difficulty}
        </Text>
      </View>

      <Text style={styles.title}>{curriculum.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{curriculum.description}</Text>

      <View style={styles.reasonRow}>
        <Image source={{ uri: ICONS['ic-idea'] }} style={styles.reasonIcon} resizeMode="contain" />
        <Text style={styles.reasonText}>{reasoning}</Text>
      </View>

      {/* 메모 기반 상황 태그 (최대 2개) */}
      {contextTags && contextTags.length > 0 && (
        <View style={styles.tagRow}>
          {contextTags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.contextTag}>
              <Text style={styles.contextTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 로그 기반 근거 (5개 이상일 때만) */}
      {logCount >= 5 ? (
        <View style={styles.logBadge}>
          <Text style={styles.logBadgeText}>최근 기록 {logCount}개 분석 결과</Text>
        </View>
      ) : (
        <View style={styles.coldStartBadge}>
          <Text style={styles.coldStartText}>기록 5개 이상이면 AI 분석이 시작돼요</Text>
        </View>
      )}

      {/* Phase 8: 종합 점수 게이지 — 무료/PRO 모두 표시 */}
      {scoreBand && (
        <View style={styles.totalScoreBlock} testID="recommended-total-score">
          <ScoreBandRow
            label="추천 점수"
            value={scoreBand.total}
            max={100}
            color={colors.primaryBlue}
          />
        </View>
      )}

      {/* ScoreBand v3 상세 분해 — PRO만 표시 */}
      {isPro && scoreBand && (
        <View style={styles.scoreBandContainer}>
          <ScoreBandRow label="행동 일치" value={scoreBand.behaviorScore} max={40} color={colors.primaryBlue} />
          <ScoreBandRow label="강도 분석" value={scoreBand.logIntensityScore} max={35} color={colors.orange500} />
          {scoreBand.progressBonus > 0 && (
            <ScoreBandRow label="진도 보너스" value={scoreBand.progressBonus} max={15} color={colors.green500 ?? colors.primaryBlue} />
          )}
          {scoreBand.memoKeywordScore !== undefined && scoreBand.memoKeywordScore > 0 && (
            <ScoreBandRow label="메모 매칭" value={scoreBand.memoKeywordScore} max={15} color={colors.purple500} />
          )}
          {scoreBand.coachingBonus !== undefined && scoreBand.coachingBonus > 0 && (
            <ScoreBandRow label="최근 코칭" value={scoreBand.coachingBonus} max={20} color={colors.primaryBlue} />
          )}
        </View>
      )}
      {!isPro && scoreBand && (
        <View style={styles.proLock}>
          <Text style={styles.proLockText}>상세 점수 분석은 PRO에서 →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ScoreBandRow({
  label, value, max, color,
}: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <View style={scoreStyles.row}>
      <Text style={scoreStyles.label}>{label}</Text>
      <View style={scoreStyles.track}>
        <View style={[scoreStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={scoreStyles.value}>{value}/{max}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primaryBlue,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  coachingBadge: {
    backgroundColor: colors.blue50,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
  },
  coachingBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryBlue,
    fontSize: 11,
  },
  difficulty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  title: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  description: {
    ...typography.detail,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reasonIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
    marginTop: 1,
  },
  reasonText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  contextTag: {
    backgroundColor: `${colors.orange500}18`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contextTagText: {
    ...typography.badge,
    color: colors.orange500,
    fontWeight: '600',
  },
  logBadge: {
    backgroundColor: `${colors.primaryBlue}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  logBadgeText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  coldStartBadge: {
    backgroundColor: colors.grey50,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  coldStartText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  totalScoreBlock: {
    marginTop: 4,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  scoreBandContainer: {
    marginTop: 4,
    gap: 6,
  },
  proLock: {
    marginTop: 8,
    paddingVertical: 6,
  },
  proLockText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

const scoreStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 56,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: colors.grey100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  value: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 36,
    textAlign: 'right',
  },
});

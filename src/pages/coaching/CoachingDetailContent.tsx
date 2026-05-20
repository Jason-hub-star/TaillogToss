/**
 * CoachingDetailContent — 코칭 상세 콘텐츠 (최신/히스토리 공용)
 * result.tsx에서 분리. 6블록 + 인사이트 CTA + 피드백 + 재생성 + 상황 입력
 * Parity: AI-001
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from 'styles/tokens';
import { CoachingBlockList } from 'components/features/coaching/CoachingBlockList';
import { UsageLimitBanner } from 'components/features/coaching/UsageLimitBanner';
import { CoachingPersonalizationBadge } from 'components/features/coaching/CoachingPersonalizationBadge';
import { CoachingContextInput } from 'components/features/coaching/CoachingContextInput';
import { RewardedAdButton } from 'components/shared/ads/RewardedAdButton';
import { ICONS } from 'lib/data/iconSources';
import type { CoachingResult } from 'types/coaching';

const TREND_LABEL: Record<string, string> = {
  improving: '개선 중',
  stable: '유지 중',
  worsening: '주의 필요',
};

const TREND_ICON_SOURCE: Record<string, string> = {
  improving: ICONS['ic-analysis']!,
  stable: ICONS['ic-target']!,
  worsening: ICONS['ic-bolt']!,
};

export interface CoachingDetailContentProps {
  coaching: CoachingResult;
  isPro: boolean;
  activeDog: { id: string; name: string; profile_image_url?: string | null } | null;
  onToggleActionItem: (itemId: string) => void;
  onNavigateToTraining: () => void;
  onNavigateToSubscription: () => void;
  onStarPress: (score: 1 | 2 | 3 | 4 | 5) => void;
  selectedScore: number;
  feedbackSubmitted: boolean;
  isSubmittingFeedback: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  generateError: string | null;
  usage?: { used: number; limit: number } | null;
  selectedSituations: string[];
  onSituationToggle: (id: string) => void;
  userContext: string;
  onUserContextChange: (text: string) => void;
}

export function CoachingDetailContent({
  coaching,
  isPro,
  activeDog,
  onToggleActionItem,
  onNavigateToTraining,
  onNavigateToSubscription,
  onStarPress,
  selectedScore,
  feedbackSubmitted,
  isSubmittingFeedback,
  onGenerate,
  isGenerating,
  generateError,
  usage,
  selectedSituations,
  onSituationToggle,
  userContext,
  onUserContextChange,
}: CoachingDetailContentProps) {
  const completedCount = (coaching.blocks.action_plan?.items ?? []).filter((i) => i.is_completed).length;
  const totalCount = coaching.blocks.action_plan?.items?.length ?? 0;
  const trend = coaching.blocks.insight.trend;
  const existingFeedback = coaching.feedback_score;
  const isLimitReached = usage != null && usage.used >= usage.limit;

  return (
    <>
      {/* 인사이트 요약 헤더 카드 */}
      <View style={styles.insightSummary}>
        <View style={styles.insightSummaryLeft}>
          <Image source={{ uri: TREND_ICON_SOURCE[trend] ?? ICONS['ic-coaching'] }} style={styles.insightSummaryIcon} />
          <View style={styles.insightSummaryTextWrap}>
            <Text style={styles.insightSummaryTitle} numberOfLines={1}>
              {coaching.blocks.insight.title}
            </Text>
            <Text style={styles.insightSummaryTrend}>
              {TREND_LABEL[trend]} · {formatReportType(coaching.report_type)} 코칭
            </Text>
          </View>
        </View>
        <Text style={styles.dateTextCompact}>{formatDate(coaching.created_at)}</Text>
      </View>

      {/* 진행률 */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${(completedCount / totalCount) * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{completedCount}/{totalCount} 완료</Text>
        </View>
      )}

      {/* R3 광고 — 무료 유저만 */}
      {!isPro && (
        <View style={styles.adBanner}>
          <RewardedAdButton
            placement="R3"
            label="광고 보고 코칭 결과 확인하기"
            onRewarded={() => {}}
          />
        </View>
      )}

      {/* 6블록 */}
      <CoachingBlockList
        blocks={coaching.blocks}
        onToggleActionItem={onToggleActionItem}
        onNavigateToTraining={onNavigateToTraining}
        dogName={activeDog?.name}
        dogImageUrl={activeDog?.profile_image_url}
        isPro={isPro}
      />

      {/* Pro 업그레이드 유도 CTA — 무료 유저만 */}
      {!isPro && (
        <TouchableOpacity
          style={styles.insightCTA}
          onPress={onNavigateToSubscription}
          activeOpacity={0.8}
        >
          <View style={styles.insightCTACopy}>
            <Text style={styles.insightCTATitle}>PRO로 더 정밀하게 보기</Text>
            <Text style={styles.insightCTADesc}>
              무료 코칭은 일반 설문과 기록 기반이에요. 상담지까지 반영하면 7일 플랜, 위험신호, 전문가 질문을 함께 볼 수 있어요.
            </Text>
          </View>
          <Text style={styles.insightCTAArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* AI 생성물 명시 */}
      <View style={styles.aiDisclaimer}>
        <Text style={styles.aiDisclaimerText}>
          이 코칭 결과는 AI가 생성한 내용으로, 전문 수의사 또는 훈련사의 조언을 대체하지 않습니다.
        </Text>
      </View>

      {/* 피드백 */}
      {existingFeedback != null ? (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackDoneText}>
            {'★'.repeat(existingFeedback)}{'☆'.repeat(5 - existingFeedback)} 평가 완료
          </Text>
        </View>
      ) : feedbackSubmitted ? (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackThankTitle}>피드백 감사합니다!</Text>
          <Text style={styles.feedbackThankDesc}>
            {'★'.repeat(selectedScore)}{'☆'.repeat(5 - selectedScore)} 더 나은 코칭을 위해 반영할게요
          </Text>
        </View>
      ) : (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>이 코칭이 도움이 되었나요?</Text>
          <View style={styles.feedbackStars}>
            {([1, 2, 3, 4, 5] as const).map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => onStarPress(star)}
                activeOpacity={0.7}
                disabled={isSubmittingFeedback}
              >
                <Text style={[styles.star, star <= selectedScore && styles.starSelected]}>
                  {star <= selectedScore ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 새 코칭 생성 */}
      <View style={styles.regenerateSection}>
        {/* 오늘의 상황 입력 (한도 미도달 시에만 표시) */}
        {!isLimitReached && (
          <>
            <CoachingPersonalizationBadge
              dogName={activeDog?.name ?? '강아지'}
              hasUserContext={selectedSituations.length > 0 || userContext.trim().length > 0}
            />
            <CoachingContextInput
              isPro={isPro}
              selectedSituations={selectedSituations}
              onSituationToggle={onSituationToggle}
              userContext={userContext}
              onUserContextChange={onUserContextChange}
              disabled={isGenerating}
            />
          </>
        )}

        {/* 한도 배너 */}
        {isLimitReached && (
          <UsageLimitBanner isPro={isPro} limit={usage!.limit} />
        )}

        {/* 버튼: 한도 초과 무료 → Pro CTA / 한도 초과 Pro → 안내 / 정상 → 새 코칭 받기 */}
        {isLimitReached && !isPro ? (
          <TouchableOpacity
            style={styles.proCtaButton}
            onPress={onNavigateToSubscription}
            activeOpacity={0.7}
          >
            <Text style={styles.proCtaButtonText}>✨ PRO로 무제한 코칭 받기</Text>
            <Text style={styles.proCtaButtonSub}>하루 최대 10회</Text>
          </TouchableOpacity>
        ) : !isLimitReached ? (
          <TouchableOpacity
            style={[styles.regenerateButton, isGenerating && styles.regenerateButtonDisabled]}
            onPress={onGenerate}
            activeOpacity={0.7}
            disabled={isGenerating}
          >
            <Text style={styles.regenerateButtonText}>
              {isGenerating ? '생성 중...' : '새 코칭 받기'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {usage && (
          <Text style={styles.usageTextSmall}>
            오늘 {usage.used}/{usage.limit}회 사용
          </Text>
        )}
        {generateError && (
          <Text style={styles.generateErrorText}>{generateError}</Text>
        )}
      </View>
    </>
  );
}

function formatReportType(type: string): string {
  const labels: Record<string, string> = {
    DAILY: '일간',
    WEEKLY: '주간',
    INSIGHT: '인사이트',
  };
  return labels[type] ?? type;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  insightSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  insightSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  insightSummaryIcon: {
    width: 32,
    height: 32,
    marginRight: spacing.md,
  },
  insightSummaryTextWrap: {
    flex: 1,
  },
  insightSummaryTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  insightSummaryTrend: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateTextCompact: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.grey100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green500,
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    minWidth: 55,
    textAlign: 'right',
  },
  adBanner: {
    marginBottom: spacing.md,
  },
  insightCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue50,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightCTACopy: {
    flex: 1,
  },
  insightCTATitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  insightCTADesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  insightCTAArrow: {
    ...typography.sectionTitle,
    color: colors.primaryBlue,
    marginLeft: spacing.sm,
  },
  aiDisclaimer: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.grey100,
    borderRadius: 8,
  },
  aiDisclaimerText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  feedbackSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  feedbackTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  feedbackStars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  star: {
    ...typography.heroTitle,
    color: colors.grey300,
  },
  starSelected: {
    color: colors.orange500,
  },
  feedbackThankTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.green500,
    marginBottom: spacing.xs,
  },
  feedbackThankDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  feedbackDoneText: {
    ...typography.caption,
    color: colors.orange500,
    fontWeight: '500',
  },
  regenerateSection: {
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  regenerateButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  regenerateButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.grey300,
  },
  regenerateButtonText: {
    ...typography.bodySmall,
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  proCtaButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  proCtaButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
  },
  proCtaButtonSub: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  usageTextSmall: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  generateErrorText: {
    ...typography.caption,
    color: colors.red500,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

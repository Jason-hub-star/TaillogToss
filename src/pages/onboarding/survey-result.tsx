/**
 * 설문 결과 화면 — AI 분석 티저 + 행동 유형 뱃지 + R1 RewardedAd
 * Skeleton 블러 잠금 영역: 광고 시청 또는 no-fill 시 해제
 * Parity: AUTH-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import {
  BehaviorTypeBadge,
  classifyBehaviorType,
  estimateRiskLevel,
} from 'components/features/survey/BehaviorTypeBadge';
import { RewardedAdButton } from 'components/shared/ads/RewardedAdButton';
import type { BehaviorType } from 'types/dog';
import { useSurvey } from 'stores/SurveyContext';
import { useAuth } from 'stores/AuthContext';
import { usePageGuard } from 'lib/hooks/usePageGuard';
import { generateSurveyAnalysis } from 'lib/data/analysis/engine';
import { colors, typography } from 'styles/tokens';

export const Route = createRoute('/onboarding/survey-result', {
  component: SurveyResultPage,
});

function SurveyResultPage() {
  const navigation = useNavigation();
  const { hasCompletedOnboarding } = useAuth();
  const { surveyData } = useSurvey();
  const { isReady } = usePageGuard({
    currentPath: '/onboarding/survey-result',
    skipOnboarding: true,
  });

  useEffect(() => {
    if (!surveyData) {
      const fallbackRoute = hasCompletedOnboarding ? '/dashboard' : '/onboarding/survey';
      if (__DEV__) {
        console.log('[APP-001][onboarding/survey-result] missing surveyData redirect', {
          hasCompletedOnboarding,
          fallbackRoute,
        });
      }
      navigation.navigate(fallbackRoute);
    }
  }, [hasCompletedOnboarding, navigation, surveyData]);

  const behaviors = useMemo<BehaviorType[]>(
    () => surveyData?.step3_behavior.primary_behaviors ?? ['other'],
    [surveyData]
  );
  const dogName = surveyData?.step1_basic.name ?? '우리 강아지';

  const behaviorType = classifyBehaviorType(behaviors);
  const riskLevel = estimateRiskLevel(behaviors);
  const riskScore = riskLevel === 'critical' ? 90 : riskLevel === 'high' ? 70 : riskLevel === 'medium' ? 50 : 25;

  const analysis = useMemo(
    () => surveyData ? generateSurveyAnalysis(surveyData) : null,
    [surveyData]
  );

  const [isDetailUnlocked, setIsDetailUnlocked] = useState(false);

  const handleStartRecording = () => {
    navigation.navigate('/onboarding/notification');
  };

  if (!isReady || !surveyData) return null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>분석 결과</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {/* AI 분석 헤더 */}
        <View style={styles.aiHeader}>
          <View style={styles.aiIcon}>
            <Text style={styles.aiEmoji}>🤖</Text>
          </View>
          <Text style={styles.resultTitle}>{dogName}의 행동 분석{'\n'}결과입니다</Text>
        </View>

        {/* 행동 유형 + 위험도 */}
        <View style={styles.card}>
          <BehaviorTypeBadge
            behaviorType={behaviorType}
            riskLevel={riskLevel}
            riskScore={riskScore}
          />

          <Text style={styles.summaryText}>
            설문 기반 초기 분석입니다.{'\n'}
            기록이 쌓이면 더 정확한 분석이 가능해요.
          </Text>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 상세 리포트 (잠금 영역) */}
        <View style={styles.detailSection}>
          <Text style={styles.detailHeader}>📋 상세 리포트</Text>

          {isDetailUnlocked && analysis ? (
            <View style={styles.unlockedContent}>
              <Text style={styles.detailText}>
                {analysis.summaryParagraph}
                {'\n'}꾸준한 기록과 맞춤 훈련을 통해 개선할 수 있습니다.
              </Text>
              <Text style={styles.detailText}>
                추천 커리큘럼: {analysis.recommendedCurriculum}{'\n'}
                예상 개선 기간: {analysis.estimatedDuration}
              </Text>
              {analysis.keyInsights.map((insight, i) => (
                <Text key={i} style={styles.insightText}>• {insight}</Text>
              ))}
            </View>
          ) : (
            <View style={styles.lockedContent}>
              {/* Skeleton 블러 영역 */}
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: '80%' }]} />
              <View style={[styles.skeletonLine, { width: '60%' }]} />
              <View style={[styles.skeletonLine, { width: '90%' }]} />
              <View style={[styles.skeletonLine, { width: '70%' }]} />

              {/* R1 RewardedAd */}
              <RewardedAdButton
                placement="R1"
                label="광고 보고 전체 분석 보기"
                onRewarded={() => setIsDetailUnlocked(true)}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.ctaButton} onPress={handleStartRecording} activeOpacity={0.8}>
          <Text style={styles.ctaText}>기록 시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
  },
  headerTitle: { ...typography.subtitle, fontWeight: '600', color: colors.textPrimary },
  body: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },
  aiHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aiIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  aiEmoji: { ...typography.heroTitle },
  resultTitle: {
    ...typography.pageTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
  },
  summaryText: {
    ...typography.detail,
    color: colors.grey500,
    lineHeight: 22,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  detailSection: {},
  detailHeader: {
    ...typography.label,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 16,
  },
  unlockedContent: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
  },
  detailText: {
    ...typography.detail,
    color: colors.grey700,
    lineHeight: 22,
    marginBottom: 12,
  },
  insightText: {
    ...typography.detail,
    color: colors.grey600,
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 4,
  },
  lockedContent: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 20,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 10,
    width: '100%',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.white,
  },
  ctaButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, ...typography.label, fontWeight: '700' },
});

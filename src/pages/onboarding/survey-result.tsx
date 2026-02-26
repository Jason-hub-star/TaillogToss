/**
 * 설문 결과 화면 — AI 분석 티저 + 행동 유형 뱃지 + R1 RewardedAd
 * Skeleton 블러 잠금 영역: 광고 시청 또는 no-fill 시 해제
 * Parity: AUTH-001
 */
import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import {
  BehaviorTypeBadge,
  classifyBehaviorType,
  estimateRiskLevel,
} from 'components/features/survey/BehaviorTypeBadge';
import { RewardedAdButton } from 'components/shared/ads/RewardedAdButton';
import type { BehaviorType } from 'types/dog';

export const Route = createRoute('/onboarding/survey-result', {
  component: SurveyResultPage,
});

function SurveyResultPage() {
  // TODO: route params에서 설문 데이터 수신 (Phase 10)
  const mockBehaviors: BehaviorType[] = ['barking', 'anxiety'];
  const dogName = '뽀삐';

  const behaviorType = classifyBehaviorType(mockBehaviors);
  const riskLevel = estimateRiskLevel(mockBehaviors);
  const riskScore = riskLevel === 'critical' ? 90 : riskLevel === 'high' ? 70 : riskLevel === 'medium' ? 50 : 25;

  const [isDetailUnlocked, setIsDetailUnlocked] = useState(false);

  const handleStartRecording = () => {
    // TODO: navigation.push('/dashboard') — Phase 10 가드
  };

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

          {isDetailUnlocked ? (
            <View style={styles.unlockedContent}>
              <Text style={styles.detailText}>
                {dogName}의 행동 패턴을 분석한 결과, 불안 관련 행동이 주요 패턴으로 나타납니다.
                낯선 환경이나 소리에 민감하게 반응할 가능성이 높으며,
                꾸준한 기록과 맞춤 훈련을 통해 개선할 수 있습니다.
              </Text>
              <Text style={styles.detailText}>
                추천 커리큘럼: 분리불안 극복 프로그램{'\n'}
                예상 개선 기간: 4~6주
              </Text>
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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#202632' },
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
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  aiEmoji: { fontSize: 28 },
  resultTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#202632',
    textAlign: 'center',
    lineHeight: 32,
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
  },
  summaryText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E8EB',
    marginVertical: 24,
  },
  detailSection: {},
  detailHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333D4B',
    marginBottom: 16,
  },
  unlockedContent: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  lockedContent: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#E5E8EB',
    borderRadius: 4,
    marginBottom: 10,
    width: '100%',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
    backgroundColor: '#FFFFFF',
  },
  ctaButton: {
    backgroundColor: '#0064FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

/**
 * CoachingGenerationLoader — 코칭 생성 전용 로딩 컴포넌트
 * 단계 표시: 기록 확인 → 패턴 탐색 → 코칭 작성
 * Parity: AI-001, UIUX-005
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LottieAnimation } from 'components/shared/LottieAnimation';
import { colors, typography, spacing } from 'styles/tokens';

const STEPS = [
  '최근 기록 확인 중',
  '반복 패턴 찾는 중',
  '맞춤 코칭 작성 중',
];

interface CoachingGenerationLoaderProps {
  dogName?: string | null;
}

export function CoachingGenerationLoader({ dogName }: CoachingGenerationLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const displayName = dogName?.trim() || '우리 강아지';

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrentStep(1), 2000),
      setTimeout(() => setCurrentStep(2), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.container}>
      <LottieAnimation asset="perrito-corriendo" size={132} />
      <Text style={styles.title}>{displayName}의 기록을 분석하고 있어요</Text>
      <Text style={styles.subtitle}>
        보통 10~30초 정도 걸려요. 결과가 나올 때까지 이 화면을 유지해주세요.
      </Text>
      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>화면을 나가면 생성 완료를 보장하기 어려워요.</Text>
      </View>

      {/* 단계 표시 */}
      <View style={styles.stepsContainer}>
        {STEPS.map((label, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                idx <= currentStep && styles.stepDotActive,
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                idx <= currentStep && styles.stepLabelActive,
                idx === currentStep && styles.stepLabelCurrent,
              ]}
            >
              {label}
            </Text>
            {idx < currentStep && <Text style={styles.stepCheck}>✓</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xxxl,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  noticeBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xxxl,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  stepsContainer: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.grey300,
  },
  stepDotActive: {
    backgroundColor: colors.primaryBlue,
  },
  stepLabel: {
    ...typography.bodySmall,
    color: colors.grey400,
  },
  stepLabelActive: {
    color: colors.textSecondary,
  },
  stepLabelCurrent: {
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  stepCheck: {
    ...typography.caption,
    color: colors.green500,
    fontWeight: '700',
  },
});

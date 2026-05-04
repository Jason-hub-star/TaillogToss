/**
 * Stage2InterceptModal — Stage 1 유저가 코칭 결과 진입 시 바텀시트
 * "지금 완료" → stage2-form 이동
 * "나중에" → 규칙 기반 코칭 그대로 보기
 * Parity: APP-001
 */
import React from 'react';
import {
  Modal, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from 'styles/tokens';

interface Stage2InterceptModalProps {
  visible: boolean;
  dogName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function Stage2InterceptModal({
  visible, dogName, onConfirm, onDismiss,
}: Stage2InterceptModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <SafeAreaProvider>
        <InterceptSheet
          dogName={dogName}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

function InterceptSheet({
  dogName, onConfirm, onDismiss,
}: Omit<Stage2InterceptModalProps, 'visible'>) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity style={styles.overlay} onPress={onDismiss} activeOpacity={1}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => undefined}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
      >
        <View style={styles.handle} />

        <Text style={styles.emoji}>🐾</Text>
        <Text style={styles.title}>{dogName}의 AI 코칭을 활성화해요</Text>
        <Text style={styles.desc}>
          생활 환경 정보를 입력하면{'\n'}
          AI가 맞춤 행동 분석 코칭을 제공해요.{'\n'}
          2~3분이면 충분해요!
        </Text>

        <View style={styles.benefits}>
          {[
            '✅ AI 맞춤 6블록 코칭 활성화',
            '✅ 고민·트리거 기반 정밀 분석',
            '✅ 7일 훈련 플랜 자동 생성',
          ].map((item) => (
            <Text key={item} style={styles.benefitItem}>{item}</Text>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={onConfirm} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>지금 입력하기 (2~3분)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={styles.secondaryBtnText}>나중에 할게요 — 기본 결과 먼저 볼게요</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.grey300,
    borderRadius: 2,
    marginBottom: spacing.xl,
  },
  emoji: { fontSize: 48, lineHeight: 56, marginBottom: spacing.md },
  title: {
    ...typography.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  desc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  benefits: {
    alignSelf: 'stretch',
    backgroundColor: colors.blue50,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  benefitItem: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

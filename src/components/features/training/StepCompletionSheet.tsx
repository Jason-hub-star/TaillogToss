/**
 * StepCompletionSheet — 스텝 완료 후 강아지 반응 피드백 바텀시트
 * ModalLayout 패턴 재사용. REACTION_OPTIONS 기반 렌더링.
 * Parity: UI-001
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, StyleSheet, Modal } from 'react-native';
import { ModalLayout } from 'components/shared/layouts/ModalLayout';
import { REACTION_OPTIONS } from 'types/training';
import type { DogReaction } from 'types/training';
import { colors, typography, spacing } from 'styles/tokens';

const REACTION_COLOR_MAP: Record<string, string> = {
  successGreen: colors.green500,
  warningAmber: colors.orange500,
  errorRed: colors.red500,
};

const REACTION_BG_MAP: Record<string, string> = {
  successGreen: colors.green50,
  warningAmber: '#FFF8E1',
  errorRed: colors.red50,
};

interface Props {
  visible: boolean;
  dogName: string;
  onSubmit: (reaction: DogReaction, memo: string | null) => void;
  onSkip: () => void;
}

export function StepCompletionSheet({ visible, dogName, onSubmit, onSkip }: Props) {
  const [selected, setSelected] = useState<DogReaction | null>(null);
  const [memo, setMemo] = useState('');
  const [saved, setSaved] = useState(false);
  const savedOpacity = useRef(new Animated.Value(0)).current;

  // visible이 false로 바뀌면 내부 상태 초기화
  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setMemo('');
      setSaved(false);
      savedOpacity.setValue(0);
    }
  }, [visible, savedOpacity]);

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit(selected, memo.trim() || null);
    setSaved(true);
    Animated.timing(savedOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleSkip = () => {
    setSelected(null);
    setMemo('');
    onSkip();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalLayout
        title={saved ? '' : `훈련 중 ${dogName}의 반응은?`}
        onClose={saved ? undefined : handleSkip}
      >
        {saved ? (
          <Animated.View style={[styles.savedContainer, { opacity: savedOpacity }]}>
            <Text style={styles.savedCheck}>{'\u2705'}</Text>
            <Text style={styles.savedText}>반응이 저장됐어요</Text>
          </Animated.View>
        ) : (
          <>
            <View style={styles.options}>
              {REACTION_OPTIONS.map((option) => {
                const isSelected = selected === option.value;
                const accent = REACTION_COLOR_MAP[option.color] ?? colors.grey500;
                const bg = REACTION_BG_MAP[option.color] ?? colors.grey50;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionCard,
                      isSelected && { borderColor: accent, backgroundColor: bg },
                    ]}
                    onPress={() => setSelected(option.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={styles.emoji}>{option.emoji}</Text>
                      <Text style={[styles.optionLabel, isSelected && { color: accent }]}>
                        {option.label}
                      </Text>
                    </View>
                    <Text style={styles.effectText}>{option.effect}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selected && (
              <TextInput
                style={styles.memoInput}
                placeholder="메모 입력 (선택)"
                placeholderTextColor={colors.placeholder}
                value={memo}
                onChangeText={setMemo}
                multiline
                maxLength={200}
              />
            )}

            <View style={styles.actions}>
              {selected && (
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
                  <Text style={styles.submitText}>저장하기</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
                <Text style={styles.skipText}>건너뛰기</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ModalLayout>
    </Modal>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  optionCard: {
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: 14,
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  emoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  optionLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  effectText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 32,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.detail,
    color: colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  savedContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  savedCheck: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  savedText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.green500,
  },
  actions: {
    gap: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    ...typography.label,
    fontWeight: '600',
    color: colors.white,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    ...typography.detail,
    color: colors.textSecondary,
  },
});

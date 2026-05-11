/**
 * 시도 이력 바텀시트 — Modal 래퍼 + StepAttemptHistory
 * Parity: UI-001
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from '@granite-js/native/react-native-safe-area-context';
import { StepAttemptHistory } from 'components/features/training/StepAttemptHistory';
import { colors, typography, spacing } from 'styles/tokens';
import type { StepAttempt } from 'types/training';

interface Props {
  visible: boolean;
  attempts: StepAttempt[];
  onClose: () => void;
}

function AttemptHistorySheetInner({ visible, attempts, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => undefined} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>시도 이력</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <StepAttemptHistory attempts={attempts} />
          <View style={{ height: insets.bottom }} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function AttemptHistorySheet(props: Props) {
  return (
    <SafeAreaProvider>
      <AttemptHistorySheetInner {...props} />
    </SafeAreaProvider>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  close: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
});

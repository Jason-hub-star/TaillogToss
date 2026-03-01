/**
 * Toast — 간단한 피드백 메시지 (자동 사라짐)
 * Parity: UI-001
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../styles/tokens';

interface ToastProps {
  message: string;
  visible: boolean;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, visible, duration = 2000, onDismiss }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          onDismiss();
        });
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, duration, onDismiss, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: spacing.screenHorizontal,
    right: spacing.screenHorizontal,
    backgroundColor: colors.grey900,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '500',
  },
});

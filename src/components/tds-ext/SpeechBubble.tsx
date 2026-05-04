/**
 * SpeechBubble — TDS 갭 보완, 강아지 시점 메시지 (코칭 Block 3)
 * View + Shadow + Border 커스텀
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../styles/tokens';

export interface SpeechBubbleProps {
  message: string;
  emotion?: 'happy' | 'anxious' | 'confused' | 'hopeful' | 'tired';
}

const EMOTION_EMOJI: Record<string, string> = {
  happy: '\uD83D\uDE0A',
  anxious: '\uD83D\uDE1F',
  confused: '\uD83E\uDD14',
  hopeful: '\uD83D\uDE4F',
  tired: '\uD83D\uDE34',
};

export function SpeechBubble({ message, emotion = 'happy' }: SpeechBubbleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <View style={styles.row}>
          <Text style={styles.emoji}>{EMOTION_EMOJI[emotion]}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginVertical: spacing.sm,
  },
  bubble: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: spacing.lg,
    maxWidth: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textDark,
    flex: 1,
  },
  tail: {
    width: 12,
    height: 12,
    backgroundColor: colors.surfaceSecondary,
    transform: [{ rotate: '45deg' }],
    marginTop: -6,
    marginLeft: spacing.lg,
  },
});

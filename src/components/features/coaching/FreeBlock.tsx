/**
 * FreeBlock — 무료 코칭 블록 ①②③ (insight, action_plan, dog_voice)
 * 인터랙티브 카드 UX: 트렌드 배지, 체크박스, 감정 말풍선
 * Parity: AI-001
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import type { InsightBlock, ActionPlanBlock, DogVoiceBlock } from 'types/coaching';
import { SpeechBubble } from 'components/tds-ext/SpeechBubble';
import { colors, typography, spacing } from 'styles/tokens';

// ──────────────────────────────────────
// Block ①: 행동 분석 인사이트 — 트렌드 배지 + 카테고리 아이콘
// ──────────────────────────────────────

const TREND_LABEL: Record<string, string> = {
  improving: '개선 중',
  stable: '유지 중',
  worsening: '주의 필요',
};

const TREND_COLOR: Record<string, string> = {
  improving: colors.green500,
  stable: colors.textSecondary,
  worsening: colors.red500,
};

const TREND_ICON: Record<string, string> = {
  improving: '📈',
  stable: '➡️',
  worsening: '📉',
};

const PATTERN_ICONS = ['🔍', '🎯', '💡', '⚡', '🧩'];

export function InsightBlockView({ data }: { data: InsightBlock }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.blockLabel}>행동 분석</Text>
        <View style={[styles.trendBadge, { backgroundColor: TREND_COLOR[data.trend] + '1A' }]}>
          <Text style={styles.trendIcon}>{TREND_ICON[data.trend]}</Text>
          <Text style={[styles.trendText, { color: TREND_COLOR[data.trend] }]}>
            {TREND_LABEL[data.trend]}
          </Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{data.title}</Text>
      <Text style={styles.cardBody}>{data.summary}</Text>
      {data.key_patterns.length > 0 && (
        <View style={styles.patternList}>
          {data.key_patterns.map((pattern, idx) => (
            <View key={idx} style={styles.patternItem}>
              <Text style={styles.patternIcon}>
                {PATTERN_ICONS[idx % PATTERN_ICONS.length]}
              </Text>
              <Text style={styles.patternText}>{pattern}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────
// Block ②: 실행 계획 — 인터랙티브 체크박스 + 진행률
// ──────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  high: colors.red500,
  medium: colors.orange500,
  low: colors.green500,
};

const PRIORITY_LABEL: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

function CheckboxItem({
  description,
  priority,
  isCompleted,
  onToggle,
}: {
  description: string;
  priority: string;
  isCompleted: boolean;
  onToggle?: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // scale bounce 애니메이션
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start();
    onToggle?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.actionItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.checkboxOuter, isCompleted && styles.checkboxChecked]}>
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionText, isCompleted && styles.completed]}>
            {description}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLOR[priority] + '1A' }]}>
            <Text style={[styles.priorityText, { color: PRIORITY_COLOR[priority] }]}>
              {PRIORITY_LABEL[priority]}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ActionPlanBlockView({
  data,
  onToggleItem,
}: {
  data: ActionPlanBlock;
  onToggleItem?: (itemId: string) => void;
}) {
  const completedCount = data.items.filter((i) => i.is_completed).length;
  const totalCount = data.items.length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.blockLabel}>실행 계획</Text>
        {totalCount > 0 && (
          <Text style={styles.progressLabel}>
            {completedCount}/{totalCount} 완료
          </Text>
        )}
      </View>
      <Text style={styles.cardTitle}>{data.title}</Text>

      {/* 진행률 바 */}
      {totalCount > 0 && (
        <View style={styles.miniProgressBar}>
          <View
            style={[
              styles.miniProgressFill,
              { width: `${(completedCount / totalCount) * 100}%` },
            ]}
          />
        </View>
      )}

      {data.items.map((item) => (
        <CheckboxItem
          key={item.id}
          description={item.description}
          priority={item.priority}
          isCompleted={item.is_completed}
          onToggle={() => onToggleItem?.(item.id)}
        />
      ))}
    </View>
  );
}

// ──────────────────────────────────────
// Block ③: 강아지 시점 메시지 — 감정별 배경 + 아바타
// ──────────────────────────────────────

const EMOTION_BG: Record<string, string> = {
  happy: colors.green50,
  anxious: colors.orange500 + '0D',
  confused: colors.blue50,
  hopeful: colors.green50,
  tired: colors.grey50,
};

const EMOTION_LABEL: Record<string, string> = {
  happy: '행복해요',
  anxious: '불안해요',
  confused: '혼란스러워요',
  hopeful: '희망적이에요',
  tired: '피곤해요',
};

export function DogVoiceBlockView({
  data,
  dogName,
}: {
  data: DogVoiceBlock;
  dogName?: string;
  dogImageUrl?: string | null;
}) {
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const typingRef = useRef(false);

  // 타이핑 효과 (세션 1회)
  useEffect(() => {
    if (typingRef.current) return;
    typingRef.current = true;

    const text = data.message;
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      setDisplayedText(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(interval);
        setIsTypingDone(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [data.message]);

  return (
    <View style={[styles.card, { backgroundColor: EMOTION_BG[data.emotion] || colors.white }]}>
      <View style={styles.dogVoiceHeader}>
        <Text style={styles.blockLabel}>
          {dogName ? `${dogName}의 마음` : '강아지의 마음'}
        </Text>
        <View style={styles.emotionBadge}>
          <Text style={styles.emotionBadgeText}>
            {EMOTION_LABEL[data.emotion]}
          </Text>
        </View>
      </View>
      <SpeechBubble
        message={isTypingDone ? data.message : displayedText}
        emotion={data.emotion}
      />
    </View>
  );
}

// ──────────────────────────────────────
// Styles
// ──────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  blockLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardBody: {
    ...typography.bodySmall,
    color: colors.grey700,
  },
  // Trend badge
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendIcon: {
    fontSize: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Pattern list
  patternList: {
    marginTop: spacing.md,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  patternIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  patternText: {
    ...typography.detail,
    color: colors.grey700,
    flex: 1,
  },
  // Action plan
  progressLabel: {
    ...typography.caption,
    color: colors.green500,
    fontWeight: '600',
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: colors.grey100,
    borderRadius: 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: colors.green500,
    borderRadius: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.grey300,
    marginRight: spacing.md,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.textDark,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Dog voice
  dogVoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emotionBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emotionBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

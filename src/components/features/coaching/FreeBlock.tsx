/**
 * FreeBlock — 무료 코칭 블록 ①②③ (insight, action_plan, dog_voice)
 * 인터랙티브 카드 UX: 트렌드 배지, 체크박스, 감정 말풍선
 * Parity: AI-001
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import type { InsightBlock, ActionPlanBlock, DogVoiceBlock, ActionItem } from 'types/coaching';
import type { CurriculumId } from 'types/training';
import { SpeechBubble } from 'components/tds-ext/SpeechBubble';
import { colors, typography, spacing } from 'styles/tokens';
import { ICONS } from 'lib/data/iconSources';
import {
  firstKnownCurriculumId,
  formatLocalizedList,
  localizeCurriculum,
  localizeStructuredText,
  localizeTool,
} from 'lib/data/coachingLocalization';

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

const TREND_ICON_SOURCE: Record<string, string> = {
  improving: ICONS['ic-analysis']!,
  stable: ICONS['ic-target']!,
  worsening: ICONS['ic-bolt']!,
};

const PATTERN_ICONS: string[] = [
  ICONS['ic-search']!,
  ICONS['ic-target']!,
  ICONS['ic-idea']!,
  ICONS['ic-bolt']!,
  ICONS['ic-puzzle']!,
];

export function InsightBlockView({ data }: { data: InsightBlock }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.blockLabel}>행동 분석</Text>
        <View style={[styles.trendBadge, { backgroundColor: TREND_COLOR[data.trend] + '1A' }]}>
          <Image source={{ uri: TREND_ICON_SOURCE[data.trend] ?? ICONS['ic-coaching'] }} style={styles.trendIconImg} />
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
              <Image
                source={{ uri: PATTERN_ICONS[idx % PATTERN_ICONS.length] }}
                style={styles.patternIconImg}
              />
              <Text style={styles.patternText}>{localizeStructuredText(pattern)}</Text>
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
  item,
  onToggle,
  isPro,
}: {
  item: ActionItem;
  onToggle?: () => void;
  isPro?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const detailRows = buildActionDetailRows(item);
  const hasDeepDetails = isPro && detailRows.length > 0;

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
      <View
        style={styles.actionItem}
      >
        <TouchableOpacity
          style={styles.actionTapRow}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={[styles.checkboxOuter, item.is_completed && styles.checkboxChecked]}>
            {item.is_completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionText, item.is_completed && styles.completed]}>
              {localizeStructuredText(item.description)}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLOR[item.priority] + '1A' }]}>
              <Text style={[styles.priorityText, { color: PRIORITY_COLOR[item.priority] }]}>
                {PRIORITY_LABEL[item.priority]}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {hasDeepDetails && (
          <View style={styles.deepSection}>
            <TouchableOpacity
              style={styles.deepToggle}
              onPress={() => setIsExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.deepToggleText}>
                {isExpanded ? '자세히 접기' : '자세히 보기'}
              </Text>
            </TouchableOpacity>
            {isExpanded && (
              <View style={styles.deepDetailBox}>
                {detailRows.map((row) => (
                  <View key={row.label} style={styles.deepDetailRow}>
                    <Text style={styles.deepDetailLabel}>{row.label}</Text>
                    <Text style={styles.deepDetailText}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function buildActionDetailRows(item: ActionItem): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const append = (
    label: string,
    value?: string | string[],
    formatter: (value: string) => string = localizeStructuredText,
  ) => {
    if (Array.isArray(value)) {
      const compact = formatLocalizedList(value, formatter);
      if (compact) rows.push({ label, value: compact });
      return;
    }
    if (value) rows.push({ label, value: formatter(value) });
  };

  append('방법', item.technique);
  append('이유', item.psychological_principle);
  append('준비물', item.tools, localizeTool);
  append('장소', item.environment_setup);
  append('순서', item.steps?.map((step, idx) => `${idx + 1}. ${localizeStructuredText(step)}`).join('\n'), (value) => value);
  append('잘 된 기준', item.success_criteria);
  append('멈출 신호', item.stop_criteria);
  append('다른 방법', item.plan_b);
  append('더 쉽게', item.plan_c);
  append('상담지 근거', item.evidence_from_intake);
  append('참고 훈련', item.reference_curriculum_ids, localizeCurriculum);

  return rows;
}

export function ActionPlanBlockView({
  data,
  onToggleItem,
  onNavigateToTraining,
  isPro,
}: {
  data: ActionPlanBlock;
  onToggleItem?: (itemId: string) => void;
  onNavigateToTraining?: (curriculumId?: CurriculumId | null) => void;
  isPro?: boolean;
}) {
  const completedCount = data.items.filter((i) => i.is_completed).length;
  const totalCount = data.items.length;
  const primaryCurriculumId = firstKnownCurriculumId(
    data.items.flatMap((item) => item.reference_curriculum_ids ?? []),
  );

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
          item={item}
          isPro={isPro}
          onToggle={() => onToggleItem?.(item.id)}
        />
      ))}

      {/* 관련 훈련 시작 버튼 */}
      {onNavigateToTraining && (
        <TouchableOpacity
          style={styles.trainingLink}
          onPress={() => onNavigateToTraining(primaryCurriculumId)}
          activeOpacity={0.7}
        >
          <Text style={styles.trainingLinkText}>
            {primaryCurriculumId ? '관련 훈련 바로 시작하기' : '맞춤 훈련 찾기'}
          </Text>
        </TouchableOpacity>
      )}
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
  defaultCollapsed = true,
}: {
  data: DogVoiceBlock;
  dogName?: string;
  dogImageUrl?: string | null;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const typingRef = useRef(false);
  const dogVoiceMessage =
    typeof data.message === 'string' && data.message.trim().length > 0
      ? data.message.trim()
      : '지금 제 마음을 천천히 읽어보고 있어요.';

  // 타이핑 효과 (세션 1회)
  useEffect(() => {
    if (isCollapsed) return;
    setIsTypingDone(false);
    setDisplayedText('');
    typingRef.current = false;
    if (typingRef.current) return;
    typingRef.current = true;

    const text = dogVoiceMessage;
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
  }, [dogVoiceMessage, isCollapsed]);

  return (
    <View style={[styles.card, { backgroundColor: EMOTION_BG[data.emotion] || colors.white }]}>
      <TouchableOpacity
        style={styles.dogVoiceHeader}
        onPress={() => setIsCollapsed((prev) => !prev)}
        activeOpacity={0.75}
      >
        <Text style={styles.blockLabel}>
          {dogName ? `${dogName}의 마음` : '강아지의 마음'}
        </Text>
        <View style={styles.dogVoiceHeaderRight}>
          <View style={styles.emotionBadge}>
            <Text style={styles.emotionBadgeText}>
              {EMOTION_LABEL[data.emotion]}
            </Text>
          </View>
          <Text style={styles.drawerToggleText}>{isCollapsed ? '열기' : '접기'}</Text>
        </View>
      </TouchableOpacity>
      {isCollapsed ? (
        <Text style={styles.drawerPreview}>강아지 입장에서 느끼는 신호를 접어두었어요.</Text>
      ) : (
        <SpeechBubble
          message={isTypingDone ? dogVoiceMessage : displayedText}
          emotion={data.emotion}
        />
      )}
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
  trendIconImg: {
    width: 14,
    height: 14,
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
  patternIconImg: {
    width: 16,
    height: 16,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  actionTapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  deepSection: {
    marginLeft: 22 + spacing.md,
    marginTop: spacing.sm,
  },
  deepToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.blue50,
  },
  deepToggleText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  deepDetailBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  deepDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  deepDetailLabel: {
    ...typography.caption,
    width: 68,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  deepDetailText: {
    ...typography.caption,
    flex: 1,
    color: colors.grey700,
  },
  // Dog voice
  dogVoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dogVoiceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  drawerToggleText: {
    ...typography.caption,
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  drawerPreview: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Training link
  trainingLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  trainingLinkText: {
    ...typography.bodySmall,
    color: colors.primaryBlue,
    fontWeight: '600',
  },
});

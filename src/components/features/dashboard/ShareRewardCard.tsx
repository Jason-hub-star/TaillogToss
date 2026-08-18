/**
 * ShareRewardCard — 친구 초대 양방향 보상 카드 (Phase 5)
 * 출처: /Users/family/.claude/plans/unified-finding-yao.md §3.7 (C5.5)
 *
 * 양방향 500pt × 2 = 1쌍당 1,000원 비용 (사용자 합의)
 * 조건: 피초대자 가입 후 7일 + 행동기록 3건 + 자가초대 차단
 *
 * 위치: dashboard 기록 탭 최하단
 */

import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useState } from 'react';
import { colors, typography, spacing } from 'styles/tokens';
import { tracker } from 'lib/analytics/tracker';

interface ShareRewardCardProps {
  shareCode: string | null | undefined;
  earnedPoints?: number;
}

export function ShareRewardCard({ shareCode, earnedPoints = 0 }: ShareRewardCardProps) {
  const [copied, setCopied] = useState(false);

  if (!shareCode) return null;

  const inviteUrl = `https://tailog.kr/invite/${shareCode}`;
  const inviteMessage =
    '강아지 행동 코칭, 토스에서 같이 받아볼래요?\n' +
    '내 초대 코드로 가입하고 7일 안에 3건 기록하면 양쪽 500P 받아요.\n' +
    inviteUrl;

  const handleShare = async () => {
    try {
      tracker.shareRewardSent();
    } catch {
      // tracker 호출 실패는 비치명적
    }
    try {
      await Share.share({ message: inviteMessage, url: inviteUrl, title: '테일로그 친구 초대' });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 공유 취소 — 조용히 처리
    }
  };

  return (
    <View style={styles.card} accessible accessibilityLabel="친구 초대하고 양쪽 500포인트 받기">
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>🐾</Text>
        <Text style={styles.title}>친구 초대 · 양쪽 500P</Text>
      </View>

      <Text style={styles.subtitle}>
        가족·이웃 강아지 보호자에게 공유하세요. 친구가 가입 후 7일 안에 행동
        기록 3건을 남기면 초대한 분과 받은 분 모두 500P씩 받아요.
      </Text>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>내 초대 코드</Text>
        <Text style={styles.code} accessibilityLabel={`초대 코드 ${shareCode}`}>
          {shareCode}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="초대 메시지 공유"
      >
        <Text style={styles.shareButtonText}>{copied ? '✓ 공유 완료' : '초대 메시지 공유'}</Text>
      </TouchableOpacity>

      {earnedPoints > 0 && (
        <Text style={styles.earned}>지금까지 받은 보상: {earnedPoints.toLocaleString()}P</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.blue50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.blue200,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  codeBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  code: {
    ...typography.t3,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 4,
  },
  shareButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  shareButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  earned: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

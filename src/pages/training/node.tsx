/**
 * 훈련 노드 상세 — tailtree 스킬 원자 하나를 그린다
 *
 * 레거시 `/training/detail`(커리큘럼 Day 탭 + Plan A/B/C)과 별개 화면이다.
 * 그쪽 640줄을 건드리지 않고, 그래프 기반 경로가 착지할 자리를 새로 만든다.
 *
 * 이 화면의 존재 이유는 **막힘 처방(stuck)** 이다. 현행 커리큘럼 108스텝에는
 * "안 되면 뭘 하라"가 0건이었고(실측), 그게 그래프 이식의 최대 이점이다.
 *
 * Parity: UIUX-002, UIUX-003, UI-TRAINING-DETAIL-001
 */
import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DetailLayout } from 'components/shared/layouts/DetailLayout';
import { EmptyState } from 'components/tds-ext/EmptyState';
import { useActiveDog } from 'stores/ActiveDogContext';
import { fillName, getHow, getLadder, getNode } from 'lib/data/graph';
import { colors, typography, spacing } from 'styles/tokens';

function TrainingNodePage() {
  const navigation = useNavigation();
  const { activeDog } = useActiveDog();
  const params = Route.useParams() as { node_id?: string } | undefined;
  const nodeId = params?.node_id ?? '';

  const dogName = activeDog?.name ?? '우리 아이';
  const node = getNode(nodeId);
  const how = getHow(nodeId);

  /** 이 노드 바로 앞 단계 — "딛고 서는 것" */
  const previous = useMemo(() => {
    const ladder = getLadder(nodeId);
    return ladder.length > 1 ? ladder[ladder.length - 2] : null;
  }, [nodeId]);

  const goToNode = useCallback(
    (id: string) => {
      navigation.navigate('/training/node', { node_id: id });
    },
    [navigation],
  );

  if (!node || !how) {
    return (
      <DetailLayout title="훈련" onBack={() => navigation.goBack()}>
        <EmptyState
          title="훈련을 찾지 못했어요"
          description="다른 훈련을 골라 보시겠어요?"
          action={
            <TouchableOpacity
              style={styles.emptyCTA}
              onPress={() => navigation.navigate('/training/academy')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyCTAText}>훈련 목록 보기</Text>
            </TouchableOpacity>
          }
        />
      </DetailLayout>
    );
  }

  return (
    <DetailLayout title={node.label} onBack={() => navigation.goBack()}>
      <Text style={styles.oneline}>{fillName(how.oneline, dogName)}</Text>

      {node.mastery ? (
        <View style={styles.masteryBox}>
          <Text style={styles.masteryLabel}>이만큼 되면 성공이에요</Text>
          <Text style={styles.masteryText}>{fillName(node.mastery, dogName)}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>이렇게 해요</Text>
      {how.steps.map((step, i) => (
        <View key={`${nodeId}-step-${i}`} style={styles.stepRow}>
          <View style={styles.stepIndex}>
            <Text style={styles.stepIndexText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{fillName(step, dogName)}</Text>
        </View>
      ))}

      {how.stuck?.length ? (
        <>
          <Text style={styles.sectionTitle}>잘 안 되나요?</Text>
          {how.stuck.map((s, i) => {
            const target = s.node && getHow(s.node) ? s.node : null;
            return (
              <View key={`${nodeId}-stuck-${i}`} style={styles.stuckCard}>
                <Text style={styles.stuckWhen}>{fillName(s.when, dogName)}</Text>
                <Text style={styles.stuckThen}>{fillName(s.then, dogName)}</Text>
                {/* 점프 대상에 콘텐츠가 없으면 CTA 를 감춘다.
                    KE-T4 실측: stuck 점프 대상 82종 중 17종은 how 가 없다. */}
                {target ? (
                  <TouchableOpacity
                    style={styles.stuckCTA}
                    onPress={() => goToNode(target)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stuckCTAText}>
                      {getNode(target)?.label ?? '앞 단계'} 먼저 하기
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}

      {previous ? (
        <TouchableOpacity
          style={styles.prevLink}
          onPress={() => goToNode(previous)}
          activeOpacity={0.7}
        >
          <Text style={styles.prevLabel}>딛고 서는 것</Text>
          <Text style={styles.prevText}>{getNode(previous)?.label ?? previous}</Text>
        </TouchableOpacity>
      ) : null}
    </DetailLayout>
  );
}

export const Route = createRoute('/training/node', {
  component: TrainingNodePage,
});

const styles = StyleSheet.create({
  oneline: {
    ...typography.body,
    color: colors.grey800,
    marginBottom: spacing.lg,
  },
  masteryBox: {
    backgroundColor: colors.green50,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  masteryLabel: {
    ...typography.caption,
    color: colors.grey600,
    marginBottom: 4,
  },
  masteryText: {
    ...typography.detail,
    color: colors.grey800,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.grey900,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepIndexText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.blue500,
  },
  stepText: {
    ...typography.detail,
    color: colors.grey800,
    flex: 1,
  },
  stuckCard: {
    backgroundColor: colors.grey50,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stuckWhen: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.grey900,
    marginBottom: 4,
  },
  stuckThen: {
    ...typography.detail,
    color: colors.grey700,
  },
  stuckCTA: {
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  stuckCTAText: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.blue500,
  },
  prevLink: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.grey100,
    minHeight: 44,
  },
  prevLabel: {
    ...typography.caption,
    color: colors.grey600,
    marginBottom: 4,
  },
  prevText: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.grey800,
  },
  emptyCTA: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyCTAText: {
    ...typography.detail,
    fontWeight: '600',
    color: colors.blue500,
  },
});

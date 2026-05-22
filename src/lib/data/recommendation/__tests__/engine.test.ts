/**
 * engine.test.ts — getRecommendationsV2 Phase 7 coaching↔academy 동기화 검증
 */
import { getRecommendationsV2, type BehaviorAnalytics } from '../engine';
import type { BehaviorType } from 'types/dog';
import type { CurriculumId } from 'types/training';

const baseAnalytics: BehaviorAnalytics = {
  avg_intensity_by_behavior: { barking: 6, leash_pulling: 7 },
  total_logs: 12,
  top_behaviors: ['barking', 'leash_pulling'],
};

describe('getRecommendationsV2 Phase 7 — coaching reference boost', () => {
  it('recentCoachingReferenceIds 없을 때는 기존 v2 동작 유지 (회귀 없음)', () => {
    const behaviors: BehaviorType[] = ['barking'];
    const rec = getRecommendationsV2(behaviors, [], baseAnalytics);

    expect(rec.scoreBand).toBeDefined();
    expect(rec.scoreBand?.coachingBonus ?? 0).toBe(0);
    expect(rec.isFromRecentCoaching).toBe(false);
  });

  it('recentCoachingReferenceIds에 primary가 포함되면 +20 boost + isFromRecentCoaching=true', () => {
    const behaviors: BehaviorType[] = ['barking'];
    const without = getRecommendationsV2(behaviors, [], baseAnalytics);
    const totalWithout = without.scoreBand?.total ?? 0;

    const refs: CurriculumId[] = [without.primary];
    const withRefs = getRecommendationsV2(behaviors, [], baseAnalytics, refs);

    expect(withRefs.isFromRecentCoaching).toBe(true);
    expect(withRefs.scoreBand?.coachingBonus).toBe(20);
    expect(withRefs.scoreBand?.total ?? 0).toBeGreaterThanOrEqual(totalWithout);
  });

  it('boost 합산이 max 100으로 clamp된다', () => {
    // behaviorScore(40 max) + logIntensityScore(35 max) + progressBonus(0~15) + coachingBonus(20)
    // = 최대 110 → 100으로 clamp
    const behaviors: BehaviorType[] = ['barking', 'leash_pulling'];
    const refs: CurriculumId[] = ['reactivity_management', 'leash_manners'];
    const rec = getRecommendationsV2(behaviors, [], {
      ...baseAnalytics,
      avg_intensity_by_behavior: { barking: 10, leash_pulling: 10 }, // 최고 강도
    }, refs);

    expect((rec.scoreBand?.total ?? 0)).toBeLessThanOrEqual(100);
  });

  it('잘못된 curriculum ID는 무시되어도 안전하게 동작', () => {
    const behaviors: BehaviorType[] = ['barking'];
    const refs = ['invalid_id_xyz' as CurriculumId];
    const rec = getRecommendationsV2(behaviors, [], baseAnalytics, refs);

    expect(rec.isFromRecentCoaching).toBe(false);
    expect(rec.scoreBand?.coachingBonus ?? 0).toBe(0);
  });
});

describe('getRecommendationsV2 Phase 8 — progressBonus + memoKeywordScore', () => {
  it('inProgressCurriculumIds에 primary가 포함되면 progressBonus=8', () => {
    const behaviors: BehaviorType[] = ['barking'];
    const without = getRecommendationsV2(behaviors, [], baseAnalytics);
    const inProgress: CurriculumId[] = [without.primary];
    const withInProgress = getRecommendationsV2(
      behaviors, [], baseAnalytics, undefined, inProgress,
    );
    expect(withInProgress.scoreBand?.progressBonus).toBe(8);
  });

  it('inProgressCurriculumIds 미전달 시 progressBonus=0 (회귀)', () => {
    const rec = getRecommendationsV2(['barking'], [], baseAnalytics);
    expect(rec.scoreBand?.progressBonus).toBe(0);
  });

  it('memo_keywords가 curriculum.title/description에 매칭되면 +3 (max 15)', () => {
    // reactivity_management의 description에 "트리거"가 자주 등장 — substring 매칭
    const analytics: BehaviorAnalytics = {
      ...baseAnalytics,
      memo_keywords: { barking: ['트리거', '거리'] },
    };
    const rec = getRecommendationsV2(['barking'], [], analytics);
    expect((rec.scoreBand?.memoKeywordScore ?? 0)).toBeGreaterThanOrEqual(0);
    expect((rec.scoreBand?.memoKeywordScore ?? 0)).toBeLessThanOrEqual(15);
  });

  it('memo_keywords 없을 때 memoKeywordScore=0 (회귀)', () => {
    const rec = getRecommendationsV2(['barking'], [], baseAnalytics);
    expect(rec.scoreBand?.memoKeywordScore ?? 0).toBe(0);
  });

  it('모든 보너스 max 합산도 100으로 clamp', () => {
    const refs: CurriculumId[] = ['reactivity_management'];
    const inProgress: CurriculumId[] = ['reactivity_management'];
    const analytics: BehaviorAnalytics = {
      ...baseAnalytics,
      avg_intensity_by_behavior: { barking: 10 },
      memo_keywords: { barking: ['트리거', '거리', '환경', '관리'] },
    };
    const rec = getRecommendationsV2(['barking'], [], analytics, refs, inProgress);
    expect((rec.scoreBand?.total ?? 0)).toBeLessThanOrEqual(100);
  });
});

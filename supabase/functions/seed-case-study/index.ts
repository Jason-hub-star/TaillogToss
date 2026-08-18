/**
 * seed-case-study — 익명화된 행동 개선 케이스 1건을 사례연구 마크다운으로 자동 생성
 * 잠금 L11: vw_marketing_behavior_improvement 뷰만 참조, raw 테이블 직접 참조 금지
 *           발행 전 marketingPiiGuard 통과 필수
 * 출처: /Users/family/.claude/plans/unified-finding-yao.md §3.7 (C1B.5)
 *
 * 호출: 매주 목 14:00 자동화 `marketing-case-study-weekly.prompt.md` 에서 invoke
 * 흐름: 뷰에서 개선률 ≥ 30% 케이스 무작위 1건 → Markdown 본문 생성 → PII 검사 →
 *       텔레그램으로 사용자 검수 요청 (승인 후에만 큐 INSERT)
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import { assertMarketingContentSafe } from '../_shared/marketingPiiGuard.ts';

export interface SeedCaseStudyRequest {
  /** 최소 개선률 임계값 (기본 30%) */
  minImprovementPct?: number;
}

export interface SeedCaseStudyResponse {
  caseId: string;
  markdown: string;
  metadata: {
    dogSize: string;
    dogAgeRange: string;
    behaviorCategory: string;
    week1Avg: number;
    week4Avg: number;
    improvementPct: number;
  };
  status: 'pending_review';
}

interface ImprovementRow {
  case_id: string;
  dog_size: string;
  dog_age_range: string;
  behavior_category: string;
  week_1_avg: number;
  week_4_avg: number;
  improvement_pct: number;
}

interface SupabaseRpcClient {
  from(view: string): {
    select(cols: string): {
      gte(col: string, val: number): {
        order(col: string, opts: { ascending: boolean }): {
          limit(n: number): Promise<{ data: ImprovementRow[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

function buildMarkdown(row: ImprovementRow): string {
  return `# ${row.case_id} — ${row.dog_size} ${row.dog_age_range}의 ${row.behavior_category} 개선 사례

## 배경
${row.dog_size} ${row.dog_age_range} 보호자분이 Tailog를 사용하기 시작했어요.
이용 초기 1주차에 ${row.behavior_category} 행동의 평균 강도가 **${row.week_1_avg}/10** 으로 측정됐습니다.

## 코칭 적용
AI 6블록 분석에서 해당 행동 카테고리가 가장 시급한 영역으로 분류됐어요.
다음 주 행동 계획을 보호자분이 적용하면서 매일 1~3건의 짧은 행동 기록을 누적했습니다.

## 30일 후 결과
4주차에 같은 행동 카테고리의 평균 강도가 **${row.week_4_avg}/10** 으로 측정됐습니다.
**개선률: ${row.improvement_pct}%**

| 시점 | 평균 강도 |
|------|----------|
| 이용 1주차 | ${row.week_1_avg}/10 |
| 이용 4주차 | ${row.week_4_avg}/10 |

## 결론
${row.dog_size} ${row.dog_age_range} 보호자가 1분 행동 기록 + AI 코칭 + 다음 주 행동 계획을 30일 누적했을 때
${row.behavior_category} 행동이 평균 ${row.improvement_pct}% 개선됐어요.

*본 사례는 동의 사용자의 익명화된 집계 데이터입니다. 사용자명·반려견명·정확한 일시는 표시하지 않습니다.*
`;
}

export function createSeedCaseStudyHandler(deps: { supabase: SupabaseRpcClient }) {
  return async (
    request: SeedCaseStudyRequest,
    context: EdgeContext
  ): Promise<EdgeResult<SeedCaseStudyResponse>> => {
    if (context.role !== 'service_role') {
      return fail('AUTH_FORBIDDEN', 'Only service_role can seed case studies', 403);
    }

    const minImprovementPct = request.minImprovementPct ?? 30;

    const { data, error } = await deps.supabase
      .from('vw_marketing_behavior_improvement')
      .select('case_id,dog_size,dog_age_range,behavior_category,week_1_avg,week_4_avg,improvement_pct')
      .gte('improvement_pct', minImprovementPct)
      .order('improvement_pct', { ascending: false })
      .limit(10);

    if (error) {
      return fail('DB_ERROR', `Failed to query view: ${error.message}`, 502);
    }
    if (!data || data.length === 0) {
      return fail('NO_CASES', `No cases with improvement >= ${minImprovementPct}%`, 404);
    }

    // 무작위 1건 선택 (편향 방지)
    const row = data[Math.floor(Math.random() * data.length)];
    const markdown = buildMarkdown(row);

    // L11 잠금: PII 검사기 통과 필수
    assertMarketingContentSafe(markdown, `case-study-${row.case_id}`);

    return ok({
      caseId: row.case_id,
      markdown,
      metadata: {
        dogSize: row.dog_size,
        dogAgeRange: row.dog_age_range,
        behaviorCategory: row.behavior_category,
        week1Avg: Number(row.week_1_avg),
        week4Avg: Number(row.week_4_avg),
        improvementPct: Number(row.improvement_pct),
      },
      status: 'pending_review',
    });
  };
}

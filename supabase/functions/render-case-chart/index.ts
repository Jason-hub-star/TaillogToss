/**
 * render-case-chart — 익명화된 사례연구 데이터를 텍스트 차트(ASCII + Markdown 표)로 렌더
 * 출처: /Users/family/.claude/plans/unified-finding-yao.md §3.7 (C1B.4)
 *       잠금 L11: 익명화된 입력만 받아 처리, PII 검사 후 반환
 *
 * v1 (현재): 텍스트만 — Threads/블로그 본문에 바로 삽입 가능
 * v2 (계획): satori/puppeteer로 PNG 렌더 후 Supabase Storage 업로드
 *
 * 호출:
 *   - seed-case-study 가 사례 본문 생성 시 차트 블록을 본 함수에서 받아옴
 *   - 또는 marketing-case-study-weekly 자동화에서 직접 호출
 */
import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import { assertMarketingContentSafe } from '../_shared/marketingPiiGuard.ts';

export interface RenderCaseChartRequest {
  chartType: 'bar_before_after' | 'line_trend' | 'comparison_table';
  caseId: string;
  behaviorCategory: string;
  dogSize: string;
  dogAgeRange: string;
  /** before/after 차트용 */
  week1Avg?: number;
  week4Avg?: number;
  /** line trend 용 — 4주치 평균 */
  weeklyAverages?: number[];
  /** comparison_table 용 — 카테고리별 개선률 */
  rows?: Array<{ label: string; week1: number; week4: number; improvementPct: number }>;
}

export interface RenderCaseChartResponse {
  caseId: string;
  chartType: RenderCaseChartRequest['chartType'];
  /** Markdown 본문에 삽입 가능한 텍스트 차트 */
  markdown: string;
  /** Threads 500자 제약용 압축 버전 */
  oneLineSummary: string;
}

function bar(value: number, max: number, width = 20): string {
  const filled = Math.max(0, Math.min(width, Math.round((value / max) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function buildBarBeforeAfter(req: RenderCaseChartRequest): RenderCaseChartResponse {
  const before = req.week1Avg ?? 0;
  const after = req.week4Avg ?? 0;
  const max = Math.max(before, after, 10);
  const improvement = before > 0 ? ((before - after) / before) * 100 : 0;

  const markdown =
    `### ${req.caseId} — ${req.dogSize} ${req.dogAgeRange} / ${req.behaviorCategory}\n\n` +
    '```\n' +
    `이용 1주차  ${bar(before, max)}  ${before.toFixed(1)}/10\n` +
    `이용 4주차  ${bar(after, max)}  ${after.toFixed(1)}/10\n` +
    '```\n' +
    `**개선률: ${improvement.toFixed(1)}%**\n`;

  const oneLineSummary =
    `${req.dogSize} ${req.behaviorCategory}: ` +
    `1주차 ${before.toFixed(1)} → 4주차 ${after.toFixed(1)} (${improvement.toFixed(0)}% 개선)`;

  return { caseId: req.caseId, chartType: req.chartType, markdown, oneLineSummary };
}

function buildLineTrend(req: RenderCaseChartRequest): RenderCaseChartResponse {
  const data = req.weeklyAverages ?? [];
  if (data.length === 0) {
    return {
      caseId: req.caseId,
      chartType: req.chartType,
      markdown: `_데이터 부족 — ${req.caseId}_\n`,
      oneLineSummary: `${req.caseId}: 데이터 부족`,
    };
  }
  const max = Math.max(...data, 10);
  const labels = data.map((_, i) => `${i + 1}주차`);
  const lines = data.map((v, i) => `${labels[i].padEnd(6)} ${bar(v, max)}  ${v.toFixed(1)}/10`);

  const first = data[0];
  const last = data[data.length - 1];
  const improvement = first > 0 ? ((first - last) / first) * 100 : 0;

  const markdown =
    `### ${req.caseId} — ${req.dogSize} ${req.dogAgeRange} / ${req.behaviorCategory}\n\n` +
    '```\n' +
    lines.join('\n') +
    '\n```\n' +
    `**4주 누적 개선률: ${improvement.toFixed(1)}%**\n`;

  return {
    caseId: req.caseId,
    chartType: req.chartType,
    markdown,
    oneLineSummary: `${req.dogSize} ${req.behaviorCategory}: 4주 ${improvement.toFixed(0)}% 개선`,
  };
}

function buildComparisonTable(req: RenderCaseChartRequest): RenderCaseChartResponse {
  const rows = req.rows ?? [];
  if (rows.length === 0) {
    return {
      caseId: req.caseId,
      chartType: req.chartType,
      markdown: `_데이터 부족_\n`,
      oneLineSummary: `${req.caseId}: 데이터 부족`,
    };
  }
  const lines = [
    '| 행동 카테고리 | 1주차 | 4주차 | 개선률 |',
    '|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} | ${r.week1.toFixed(1)}/10 | ${r.week4.toFixed(1)}/10 | ${r.improvementPct.toFixed(1)}% |`
    ),
  ];

  const top = [...rows].sort((a, b) => b.improvementPct - a.improvementPct)[0];
  const oneLineSummary = top
    ? `TOP 개선: ${top.label} ${top.improvementPct.toFixed(0)}%`
    : '데이터 부족';

  return {
    caseId: req.caseId,
    chartType: req.chartType,
    markdown: `### ${req.caseId} — TOP 개선 행동\n\n${lines.join('\n')}\n`,
    oneLineSummary,
  };
}

export function createRenderCaseChartHandler() {
  return async (
    request: RenderCaseChartRequest,
    context: EdgeContext
  ): Promise<EdgeResult<RenderCaseChartResponse>> => {
    if (context.role !== 'service_role') {
      return fail('AUTH_FORBIDDEN', 'Only service_role can render case charts', 403);
    }

    // L11 — case_id 형식 검증 (해시만 허용)
    if (!/^사례 #[a-f0-9]{8}$/.test(request.caseId)) {
      return fail('INVALID_CASE_ID', 'case_id must be "사례 #<8-hex>"', 400);
    }

    let response: RenderCaseChartResponse;
    switch (request.chartType) {
      case 'bar_before_after':
        response = buildBarBeforeAfter(request);
        break;
      case 'line_trend':
        response = buildLineTrend(request);
        break;
      case 'comparison_table':
        response = buildComparisonTable(request);
        break;
      default:
        return fail('UNKNOWN_CHART_TYPE', `chartType ${request.chartType} not supported`, 400);
    }

    // L11 — 출력에 PII 가 섞이지 않았는지 최종 검증
    assertMarketingContentSafe(response.markdown, `case-chart-${request.caseId}`);
    assertMarketingContentSafe(response.oneLineSummary, `case-chart-summary-${request.caseId}`);

    return ok(response);
  };
}

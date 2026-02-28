/**
 * generate-report — AI 리포트 생성 Edge Function (mock AI, staff only)
 * 실 AI 연동은 사업자등록 후 교체. 현재는 규칙 기반 요약 생성 + 권한 가드 적용.
 * Parity: B2B-001
 */

import { type EdgeContext, fail, ok, type EdgeResult } from '../_shared/contracts.ts';
import {
  buildEdgeContext,
  methodNotAllowed,
  parseRequestJson,
  toJsonResponse,
} from '../_shared/httpAdapter.ts';

export interface GenerateReportRequest {
  report_id: string;
  dog_id: string;
  report_date: string;
}

type EnvGetter = (key: string) => string | undefined;

interface GenerateReportDeps {
  fetchImpl: typeof fetch;
  now: () => Date;
  getEnv: EnvGetter;
}

type ReportAiMode = 'mock' | 'real';

interface GeneratedReportContent {
  behaviorSummary: string;
  conditionNotes: string;
  coachingOneliner: string;
  aiModel: string;
  aiCostUsd: number;
}

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_INPUT_PRICE_PER_M = 0.15;
const OPENAI_OUTPUT_PRICE_PER_M = 0.6;

function defaultDeps(): GenerateReportDeps {
  return {
    fetchImpl: fetch,
    now: () => new Date(),
    getEnv: (key: string) => {
      const denoWithEnv = globalThis as { Deno?: { env?: { get: (name: string) => string | undefined } } };
      return denoWithEnv.Deno?.env?.get(key);
    },
  };
}

function isAdminRole(role: EdgeContext['role']): boolean {
  return role === 'trainer' || role === 'org_owner' || role === 'org_staff' || role === 'service_role';
}

function resolveReportAiMode(getEnv: EnvGetter): ReportAiMode {
  const mode = (getEnv('REPORT_AI_MODE') ?? 'mock').trim().toLowerCase();
  return mode === 'real' ? 'real' : 'mock';
}

function parseJsonPayload(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const candidate = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed;

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mockReportContent(reportDate: string): GeneratedReportContent {
  return {
    behaviorSummary: `${reportDate} 하루 동안의 행동 기록을 분석한 결과, 전반적으로 양호한 상태를 유지했습니다.`,
    conditionNotes: '특이사항 없음. 식사와 산책 모두 정상적으로 진행되었습니다.',
    coachingOneliner: '꾸준한 산책과 긍정적 강화를 유지하면 더욱 안정적인 행동 패턴을 기대할 수 있습니다.',
    aiModel: 'mock_rule_v1',
    aiCostUsd: 0,
  };
}

async function generateReportContent(
  request: GenerateReportRequest,
  deps: GenerateReportDeps
): Promise<EdgeResult<GeneratedReportContent>> {
  const mode = resolveReportAiMode(deps.getEnv);
  if (mode === 'mock') {
    return ok(mockReportContent(request.report_date));
  }

  const openAiKey = deps.getEnv('OPENAI_API_KEY') ?? '';
  const openAiModel = deps.getEnv('OPENAI_MODEL') ?? 'gpt-4o-mini';
  if (!openAiKey) {
    return fail('CONFIG_MISSING', 'OPENAI_API_KEY is missing for REPORT_AI_MODE=real', 500);
  }

  const prompt = [
    '반려견 일일 리포트 요약을 생성하라.',
    `report_date: ${request.report_date}`,
    `dog_id: ${request.dog_id}`,
    '반드시 아래 JSON만 반환하라:',
    '{"behavior_summary":"...","condition_notes":"...","ai_coaching_oneliner":"..."}',
  ].join('\n');

  const aiRes = await deps.fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: openAiModel,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content: '당신은 반려견 행동 기록을 간결하게 요약하는 코치다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return fail('AI_UPSTREAM_FAILED', errText, 502);
  }

  const aiPayload = (await aiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const rawContent = aiPayload.choices?.[0]?.message?.content ?? '';
  const parsed = parseJsonPayload(rawContent);
  if (!parsed) {
    return fail('AI_PARSE_FAILED', 'OpenAI response is not valid JSON object', 502);
  }

  const behaviorSummary = typeof parsed.behavior_summary === 'string' ? parsed.behavior_summary : '';
  const conditionNotes = typeof parsed.condition_notes === 'string' ? parsed.condition_notes : '';
  const coachingOneliner =
    typeof parsed.ai_coaching_oneliner === 'string' ? parsed.ai_coaching_oneliner : '';
  if (!behaviorSummary || !conditionNotes || !coachingOneliner) {
    return fail('AI_PARSE_FAILED', 'OpenAI response is missing required fields', 502);
  }

  const promptTokens = aiPayload.usage?.prompt_tokens ?? 0;
  const completionTokens = aiPayload.usage?.completion_tokens ?? 0;
  const aiCostUsd = Number(
    (
      (promptTokens * OPENAI_INPUT_PRICE_PER_M + completionTokens * OPENAI_OUTPUT_PRICE_PER_M) /
      1_000_000
    ).toFixed(6)
  );

  return ok({
    behaviorSummary,
    conditionNotes,
    coachingOneliner,
    aiModel: openAiModel,
    aiCostUsd,
  });
}

export function createGenerateReportHandler(overrides?: Partial<GenerateReportDeps>) {
  const deps = { ...defaultDeps(), ...(overrides ?? {}) };

  return async (
    request: GenerateReportRequest,
    context: EdgeContext
  ): Promise<EdgeResult<unknown>> => {
    if (!isAdminRole(context.role)) {
      return fail('AUTH_FORBIDDEN', 'Only staff roles can generate reports', 403);
    }

    const { report_id, dog_id, report_date } = request;
    if (!report_id || !dog_id || !report_date) {
      return fail('INVALID_PARAMS', 'report_id, dog_id, report_date 필수', 400);
    }

    const supabaseUrl = deps.getEnv('SUPABASE_URL') ?? '';
    const serviceKey = deps.getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return fail('CONFIG_MISSING', 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing', 500);
    }

    try {
      const generated = await generateReportContent(request, deps);
      if (!generated.ok || !generated.data) {
        return generated;
      }

      const updateRes = await deps.fetchImpl(`${supabaseUrl}/rest/v1/daily_reports?id=eq.${report_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          behavior_summary: generated.data.behaviorSummary,
          condition_notes: generated.data.conditionNotes,
          ai_coaching_oneliner: generated.data.coachingOneliner,
          generation_status: 'generated',
          ai_model: generated.data.aiModel,
          ai_cost_usd: generated.data.aiCostUsd,
          generated_at: deps.now().toISOString(),
        }),
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return fail('UPDATE_FAILED', errText, 500);
      }

      const updated = (await updateRes.json()) as unknown;
      return ok(Array.isArray(updated) ? (updated[0] ?? updated) : updated);
    } catch (err) {
      return fail('INTERNAL', String(err), 500);
    }
  };
}

export const handleGenerateReport = createGenerateReportHandler();

const edgeRuntime = (globalThis as {
  Deno?: { serve: (handler: (request: Request) => Promise<Response> | Response) => void };
}).Deno;

if (edgeRuntime?.serve) {
  edgeRuntime.serve(async (request: Request) => {
    if (request.method !== 'POST') {
      return methodNotAllowed(request.method);
    }

    const body = await parseRequestJson<GenerateReportRequest>(request);
    if (!body) {
      return toJsonResponse(fail('INVALID_PARAMS', 'Invalid JSON body', 400));
    }

    const context = buildEdgeContext(request);
    const result = await handleGenerateReport(body, context);
    return toJsonResponse(result);
  });
}

/**
 * generate-report — AI 리포트 생성 Edge Function (mock AI)
 * 실 AI 연동은 사업자등록 후 교체. 현재는 규칙 기반 요약 생성.
 * Parity: B2B-001
 */

import { fail, ok } from '../_shared/contracts.ts';

interface GenerateReportRequest {
  report_id: string;
  dog_id: string;
  report_date: string;
}

Deno.serve(async (req: Request) => {
  try {
    const body: GenerateReportRequest = await req.json();
    const { report_id, dog_id, report_date } = body;

    if (!report_id || !dog_id || !report_date) {
      return new Response(
        JSON.stringify(fail('INVALID_PARAMS', 'report_id, dog_id, report_date 필수')),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mock AI: 규칙 기반 요약 생성
    const mockSummary = `${report_date} 하루 동안의 행동 기록을 분석한 결과, 전반적으로 양호한 상태를 유지했습니다.`;
    const mockNotes = '특이사항 없음. 식사와 산책 모두 정상적으로 진행되었습니다.';
    const mockCoaching = '꾸준한 산책과 긍정적 강화를 유지하면 더욱 안정적인 행동 패턴을 기대할 수 있습니다.';

    // Supabase 업데이트 (service_role 필요)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/daily_reports?id=eq.${report_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        behavior_summary: mockSummary,
        condition_notes: mockNotes,
        ai_coaching_oneliner: mockCoaching,
        generation_status: 'generated',
        ai_model: 'mock_rule_v1',
        ai_cost_usd: 0,
        generated_at: new Date().toISOString(),
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return new Response(
        JSON.stringify(fail('UPDATE_FAILED', errText)),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updated = await updateRes.json();
    return new Response(
      JSON.stringify(ok(updated[0] ?? updated)),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify(fail('INTERNAL', String(err))),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * 리포트 API — 일일 리포트 생성/조회/발송
 * Parity: B2B-001
 */
import { supabase } from './supabase';
import { requestBackend, withBackendFallback } from './backend';
import type { DailyReport, ParentInteraction, ReportTemplateType } from 'types/b2b';

/** 리포트 목록 (조직 기준, 날짜 필터) */
export async function getOrgReports(orgId: string, date?: string): Promise<DailyReport[]> {
  return withBackendFallback(
    () => {
      const qs = date ? `?date=${encodeURIComponent(date)}` : '';
      return requestBackend<DailyReport[]>(`/api/v1/report/org/${orgId}${qs}`);
    },
    async () => {
      let query = supabase
        .from('daily_reports')
        .select('*')
        .eq('created_by_org_id', orgId)
        .order('report_date', { ascending: false });
      if (date) {
        query = query.eq('report_date', date);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as DailyReport[];
    },
  );
}

/** 리포트 목록 (강아지 기준) */
export async function getDogReports(dogId: string): Promise<DailyReport[]> {
  return withBackendFallback(
    () => requestBackend<DailyReport[]>(`/api/v1/report/dog/${dogId}`),
    async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('dog_id', dogId)
        .order('report_date', { ascending: false });
      if (error) throw error;
      return data as DailyReport[];
    },
  );
}

/** 리포트 상세 조회 */
export async function getReport(reportId: string): Promise<DailyReport> {
  return withBackendFallback(
    () => requestBackend<DailyReport>(`/api/v1/report/${reportId}`),
    async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
  );
}

/** 공유 토큰으로 리포트 조회 (비인증 보호자) */
export async function getReportByShareToken(token: string): Promise<DailyReport> {
  return withBackendFallback(
    () => requestBackend<DailyReport>(`/api/v1/report/share/${encodeURIComponent(token)}`),
    async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('share_token', token)
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
  );
}

/** 리포트 생성 요청 (Edge Function 호출) */
export async function generateReport(input: {
  dog_id: string;
  report_date: string;
  template_type: ReportTemplateType;
  created_by_org_id?: string;
  created_by_trainer_id?: string;
}): Promise<DailyReport> {
  return withBackendFallback(
    () =>
      requestBackend<DailyReport, typeof input>('/api/v1/report/', {
        method: 'POST',
        body: input,
      }),
    async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .insert({
          dog_id: input.dog_id,
          report_date: input.report_date,
          template_type: input.template_type,
          created_by_org_id: input.created_by_org_id ?? null,
          created_by_trainer_id: input.created_by_trainer_id ?? null,
          generation_status: 'pending',
          highlight_photo_urls: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
  );
}

/** 리포트 발송 (share_token 생성 + sent_at 업데이트) */
export async function sendReport(reportId: string): Promise<DailyReport> {
  return withBackendFallback(
    () => requestBackend<DailyReport>(`/api/v1/report/${reportId}/send`, { method: 'PATCH' }),
    async () => {
      const shareToken = crypto.randomUUID();
      const { data, error } = await supabase
        .from('daily_reports')
        .update({
          share_token: shareToken,
          generation_status: 'sent',
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일
        })
        .eq('id', reportId)
        .select()
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
  );
}

/** 리포트 업데이트 (편집) */
export async function updateReport(
  reportId: string,
  updates: Partial<Pick<DailyReport, 'behavior_summary' | 'condition_notes' | 'ai_coaching_oneliner'>>
): Promise<DailyReport> {
  return withBackendFallback(
    () =>
      requestBackend<DailyReport, typeof updates>(`/api/v1/report/${reportId}`, {
        method: 'PATCH',
        body: updates,
      }),
    async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
  );
}

/** 보호자 인터랙션 생성 */
export async function createInteraction(input: {
  report_id: string;
  parent_user_id?: string;
  parent_identifier?: string;
  interaction_type: ParentInteraction['interaction_type'];
  content?: string;
}): Promise<ParentInteraction> {
  return withBackendFallback(
    () =>
      requestBackend<ParentInteraction, typeof input>('/api/v1/report/interactions', {
        method: 'POST',
        body: input,
      }),
    async () => {
      const { data, error } = await supabase
        .from('parent_interactions')
        .insert({
          report_id: input.report_id,
          parent_user_id: input.parent_user_id ?? null,
          parent_identifier: input.parent_identifier ?? null,
          interaction_type: input.interaction_type,
          content: input.content ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ParentInteraction;
    },
  );
}

/** 리포트 인터랙션 목록 조회 */
export async function getReportInteractions(reportId: string): Promise<ParentInteraction[]> {
  return withBackendFallback(
    () => requestBackend<ParentInteraction[]>(`/api/v1/report/${reportId}/interactions`),
    async () => {
      const { data, error } = await supabase
        .from('parent_interactions')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ParentInteraction[];
    },
  );
}

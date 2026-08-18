/**
 * 리포트 API — 일일 리포트 생성/조회/발송
 * Parity: B2B-001
 */
import { getTossShareLink, share } from '@apps-in-toss/framework';
import { supabase } from './supabase';
import { requestBackend, requestBackendPublic } from './backend';
import type { DailyReport, ParentInteraction, PublicDailyReport, ReportTemplateType } from 'types/b2b';

interface EdgeResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

const REPORT_APP_DEEP_LINK_BASE = 'intoss://taillog-app';

function isJwtLike(token: string): boolean {
  return token.split('.').length === 3;
}

async function clearInvalidSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Local cleanup is best-effort; protected Edge calls still fail closed.
  }
}

async function getVerifiedAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('NO_SESSION');
  if (!isJwtLike(accessToken)) {
    await clearInvalidSession();
    throw new Error('INVALID_SESSION');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    await clearInvalidSession();
    throw new Error('INVALID_SESSION');
  }

  return accessToken;
}

export function buildReportDeepLink(shareToken: string): string {
  return `${REPORT_APP_DEEP_LINK_BASE}/parent/reports?token=${encodeURIComponent(shareToken)}`;
}

function buildReportShareMessage(tossShareUrl: string): string {
  return `테일로그 일일 리포트가 도착했어요.\n${tossShareUrl}`;
}

async function persistReportShareUrl(reportId: string, tossShareUrl: string): Promise<DailyReport> {
  return requestBackend<DailyReport, { toss_share_url: string }>(`/api/v1/report/${reportId}`, {
    method: 'PATCH',
    body: { toss_share_url: tossShareUrl },
  });
}

/** 리포트 목록 (조직 기준, 날짜 필터) */
export async function getOrgReports(orgId: string, date?: string): Promise<DailyReport[]> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return requestBackend<DailyReport[]>(`/api/v1/report/org/${orgId}${qs}`);
}

/** 리포트 목록 (강아지 기준) */
export async function getDogReports(dogId: string): Promise<DailyReport[]> {
  return requestBackend<DailyReport[]>(`/api/v1/report/dog/${dogId}`);
}

/** 리포트 상세 조회 */
export async function getReport(reportId: string): Promise<DailyReport> {
  return requestBackend<DailyReport>(`/api/v1/report/${reportId}`);
}

/** 공유 토큰으로 리포트 조회 (비인증 보호자) */
export async function getReportByShareToken(token: string, last4: string): Promise<PublicDailyReport> {
  const normalizedLast4 = last4.replace(/[^0-9]/g, '').slice(0, 4);
  if (normalizedLast4.length !== 4) {
    throw new Error('REPORT_SHARE_PHONE_VERIFICATION_REQUIRED');
  }

  return requestBackendPublic<PublicDailyReport>(
    `/api/v1/report/share/${encodeURIComponent(token)}?last4=${encodeURIComponent(normalizedLast4)}`,
  );
}

export async function verifyParentPhoneLast4(input: {
  share_token: string;
  last4: string;
}): Promise<boolean> {
  const last4 = input.last4.replace(/[^0-9]/g, '').slice(0, 4);
  if (last4.length !== 4) return false;

  const result = await requestBackendPublic<{ verified: boolean }, { share_token: string; last4: string }>(
    '/api/v1/report/share/verify-parent-phone',
    {
      method: 'POST',
      body: {
        share_token: input.share_token,
        last4,
      },
    },
  );
  return result.verified;
}

async function createPendingReport(input: {
  dog_id: string;
  report_date: string;
  template_type: ReportTemplateType;
  created_by_org_id?: string;
  created_by_trainer_id?: string;
}): Promise<DailyReport> {
  return requestBackend<DailyReport, typeof input>('/api/v1/report/', {
    method: 'POST',
    body: input,
  });
}

async function generateReportViaEdge(report: DailyReport): Promise<DailyReport> {
  const accessToken = await getVerifiedAccessToken();
  const { data, error } = await supabase.functions.invoke<EdgeResult<DailyReport>>(
    'generate-report',
    {
      body: {
        report_id: report.id,
        dog_id: report.dog_id,
        report_date: report.report_date,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error(data?.error?.message ?? '리포트 AI 생성에 실패했어요.');
  }

  return data.data ?? getReport(report.id);
}

/** 리포트 생성 요청 (FastAPI pending row 생성 후 Edge Function 호출) */
export async function generateReport(input: {
  dog_id: string;
  report_date: string;
  template_type: ReportTemplateType;
  created_by_org_id?: string;
  created_by_trainer_id?: string;
}): Promise<DailyReport> {
  const pendingReport = await createPendingReport(input);
  return generateReportViaEdge(pendingReport);
}

async function finalizeReportShare(report: DailyReport): Promise<DailyReport> {
  const shareToken = report.share_token;
  if (!shareToken) {
    throw new Error('공유 토큰이 없어 리포트 링크를 만들 수 없어요.');
  }

  const tossShareUrl = report.toss_share_url ?? await getTossShareLink(buildReportDeepLink(shareToken));
  const updatedReport = report.toss_share_url === tossShareUrl
    ? report
    : await persistReportShareUrl(report.id, tossShareUrl);

  await share({ message: buildReportShareMessage(tossShareUrl) });
  return updatedReport;
}

/** 리포트 발송 (share_token 생성 + toss_share_url 저장 + 공유시트 호출) */
export async function sendReport(reportId: string): Promise<DailyReport> {
  const report = await requestBackend<DailyReport>(`/api/v1/report/${reportId}/send`, { method: 'PATCH' });
  return finalizeReportShare(report);
}

/** 리포트 업데이트 (편집) */
export async function updateReport(
  reportId: string,
  updates: Partial<Pick<DailyReport, 'behavior_summary' | 'condition_notes' | 'ai_coaching_oneliner'>>
): Promise<DailyReport> {
  return requestBackend<DailyReport, typeof updates>(`/api/v1/report/${reportId}`, {
    method: 'PATCH',
    body: updates,
  });
}

/** 보호자 인터랙션 생성 */
export async function createInteraction(input: {
  report_id: string;
  parent_user_id?: string;
  parent_identifier?: string;
  share_token?: string;
  last4?: string;
  interaction_type: ParentInteraction['interaction_type'];
  content?: string;
}): Promise<ParentInteraction> {
  return requestBackendPublic<ParentInteraction, typeof input>('/api/v1/report/interactions', {
    method: 'POST',
    body: input,
  });
}

/** 리포트 인터랙션 목록 조회 */
export async function getReportInteractions(reportId: string): Promise<ParentInteraction[]> {
  return requestBackend<ParentInteraction[]>(`/api/v1/report/${reportId}/interactions`);
}

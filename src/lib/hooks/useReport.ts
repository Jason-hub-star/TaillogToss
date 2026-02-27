/**
 * useReport 훅 — 일일 리포트 조회/생성/발송 TanStack Query 래퍼
 * Parity: B2B-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'lib/api/queryKeys';
import * as reportApi from 'lib/api/report';
import type { ReportTemplateType, ParentInteraction } from 'types/b2b';

export function useOrgReports(orgId: string | undefined, date?: string) {
  return useQuery({
    queryKey: queryKeys.reports.byOrg(orgId ?? '', date),
    queryFn: () => reportApi.getOrgReports(orgId!, date),
    enabled: !!orgId,
  });
}

export function useDogReports(dogId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reports.byDog(dogId ?? ''),
    queryFn: () => reportApi.getDogReports(dogId!),
    enabled: !!dogId,
  });
}

export function useReportDetail(reportId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reports.detail(reportId ?? ''),
    queryFn: () => reportApi.getReport(reportId!),
    enabled: !!reportId,
  });
}

export function useReportByShareToken(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reports.byShareToken(token ?? ''),
    queryFn: () => reportApi.getReportByShareToken(token!),
    enabled: !!token,
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      dog_id: string;
      report_date: string;
      template_type: ReportTemplateType;
      created_by_org_id?: string;
      created_by_trainer_id?: string;
    }) => reportApi.generateReport(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useSendReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => reportApi.sendReport(reportId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      reportId: string;
      updates: Parameters<typeof reportApi.updateReport>[1];
    }) => reportApi.updateReport(input.reportId, input.updates),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      report_id: string;
      parent_user_id?: string;
      parent_identifier?: string;
      interaction_type: ParentInteraction['interaction_type'];
      content?: string;
    }) => reportApi.createInteraction(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.reports.detail(variables.report_id) });
    },
  });
}

export function useReportInteractions(reportId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.reports.detail(reportId ?? ''), 'interactions'] as const,
    queryFn: () => reportApi.getReportInteractions(reportId!),
    enabled: !!reportId,
  });
}

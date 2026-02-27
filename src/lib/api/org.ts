/**
 * 조직(B2B) API — 조직/멤버/강아지/배정 CRUD
 * Parity: B2B-001
 */
import { supabase } from './supabase';
import type { Organization, OrgMember, OrgDog, DogAssignment } from 'types/b2b';

/** 조직 상세 조회 */
export async function getOrg(orgId: string): Promise<Organization> {
  const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
  if (error) throw error;
  return data as Organization;
}

/** 조직 멤버 목록 */
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .order('invited_at', { ascending: true });
  if (error) throw error;
  return data as OrgMember[];
}

/** 조직 소속 강아지 목록 (today 상태 포함) */
export interface OrgDogWithStatus extends OrgDog {
  dogs?: { name: string; breed?: string };
  today_log_count: number;
  has_today_report: boolean;
  last_log_time: string | null;
  trainer_name: string | null;
}

export async function getOrgDogs(orgId: string): Promise<OrgDogWithStatus[]> {
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = `${today}T00:00:00`;
  const todayEnd = `${today}T23:59:59`;

  // 1) org_dogs + dogs JOIN
  const { data: orgDogs, error: dogsErr } = await supabase
    .from('org_dogs')
    .select('*, dogs(*)')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: true });
  if (dogsErr) throw dogsErr;
  if (!orgDogs || orgDogs.length === 0) return [];

  const dogIds = orgDogs.map((od: any) => od.dog_id as string);

  // 2) 오늘 기록 집계 (behavior_logs)
  const { data: logCounts, error: logErr } = await supabase
    .from('behavior_logs')
    .select('dog_id, occurred_at')
    .eq('org_id', orgId)
    .in('dog_id', dogIds)
    .gte('occurred_at', todayStart)
    .lte('occurred_at', todayEnd);
  if (logErr) throw logErr;

  const logCountMap = new Map<string, { count: number; lastTime: string | null }>();
  for (const log of logCounts ?? []) {
    const prev = logCountMap.get(log.dog_id) ?? { count: 0, lastTime: null };
    prev.count++;
    if (!prev.lastTime || log.occurred_at > prev.lastTime) prev.lastTime = log.occurred_at;
    logCountMap.set(log.dog_id, prev);
  }

  // 3) 오늘 리포트 존재 여부 (daily_reports)
  const { data: todayReports, error: reportErr } = await supabase
    .from('daily_reports')
    .select('dog_id')
    .eq('created_by_org_id', orgId)
    .eq('report_date', today)
    .in('dog_id', dogIds);
  if (reportErr) throw reportErr;

  const reportedDogIds = new Set((todayReports ?? []).map((r: any) => r.dog_id as string));

  // 4) 담당자 배정 (dog_assignments)
  const { data: assignments, error: assignErr } = await supabase
    .from('dog_assignments')
    .select('dog_id, trainer_user_id')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .in('dog_id', dogIds);
  if (assignErr) throw assignErr;

  const trainerMap = new Map<string, string>();
  for (const a of assignments ?? []) {
    trainerMap.set(a.dog_id, a.trainer_user_id);
  }

  // 5) 병합
  return orgDogs.map((od: any) => {
    const logInfo = logCountMap.get(od.dog_id) ?? { count: 0, lastTime: null };
    return {
      ...od,
      today_log_count: logInfo.count,
      has_today_report: reportedDogIds.has(od.dog_id),
      last_log_time: logInfo.lastTime,
      trainer_name: trainerMap.get(od.dog_id) ?? null,
    } as OrgDogWithStatus;
  });
}

/** 활성 강아지 수 카운트 */
export async function getActiveOrgDogCount(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from('org_dogs')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'active');
  if (error) throw error;
  return count ?? 0;
}

/** 활성 멤버 수 카운트 */
export async function getActiveOrgMemberCount(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from('org_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('status', ['active', 'pending']);
  if (error) throw error;
  return count ?? 0;
}

/** 강아지 등록 (센터에 입소) + PII 저장 */
export async function enrollDog(input: {
  org_id: string;
  dog_id: string;
  parent_user_id?: string;
  parent_name?: string;
  group_tag?: string;
  parent_phone_enc?: string; // 이미 암호화된 base64
  parent_email_enc?: string; // 이미 암호화된 base64
}): Promise<OrgDog> {
  const { data, error } = await supabase
    .from('org_dogs')
    .insert({
      org_id: input.org_id,
      dog_id: input.dog_id,
      parent_user_id: input.parent_user_id ?? null,
      parent_name: input.parent_name ?? null,
      group_tag: input.group_tag ?? 'default',
    })
    .select()
    .single();
  if (error) throw error;

  // PII 별도 테이블 저장 (암호화된 상태)
  if (input.parent_phone_enc || input.parent_email_enc) {
    const { error: piiError } = await supabase
      .from('org_dogs_pii')
      .upsert({
        org_dog_id: data.id,
        parent_phone_enc: input.parent_phone_enc ?? null,
        parent_email_enc: input.parent_email_enc ?? null,
        encryption_key_version: 1,
      });
    if (piiError) {
      // PII 저장 실패해도 등록은 유지 (fail-open)
      console.warn('PII save failed:', piiError.message);
    }
  }

  return data as OrgDog;
}

/** 강아지 퇴소 */
export async function dischargeDog(orgDogId: string): Promise<void> {
  const { error } = await supabase
    .from('org_dogs')
    .update({ status: 'discharged', discharged_at: new Date().toISOString() })
    .eq('id', orgDogId);
  if (error) throw error;
}

/** 멤버 초대 */
export async function inviteMember(input: {
  org_id: string;
  user_id: string;
  role: OrgMember['role'];
}): Promise<OrgMember> {
  const { data, error } = await supabase
    .from('org_members')
    .insert({
      org_id: input.org_id,
      user_id: input.user_id,
      role: input.role,
    })
    .select()
    .single();
  if (error) throw error;
  return data as OrgMember;
}

/** 담당자 배정 */
export async function assignDog(input: {
  dog_id: string;
  org_id?: string;
  trainer_user_id: string;
  role: DogAssignment['role'];
}): Promise<DogAssignment> {
  const { data, error } = await supabase
    .from('dog_assignments')
    .insert({
      dog_id: input.dog_id,
      org_id: input.org_id ?? null,
      trainer_user_id: input.trainer_user_id,
      role: input.role,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DogAssignment;
}

/** 담당자 배정 목록 (조직 기준) */
export async function getOrgAssignments(orgId: string): Promise<DogAssignment[]> {
  const { data, error } = await supabase
    .from('dog_assignments')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active');
  if (error) throw error;
  return data as DogAssignment[];
}

/** 내 담당 강아지 목록 (훈련사 기준) */
export async function getMyAssignments(trainerId: string): Promise<DogAssignment[]> {
  const { data, error } = await supabase
    .from('dog_assignments')
    .select('*')
    .eq('trainer_user_id', trainerId)
    .eq('status', 'active');
  if (error) throw error;
  return data as DogAssignment[];
}

/** 조직 오늘의 통계 조회 */
export async function getOrgTodayStats(orgId: string): Promise<import('types/b2b').OrgAnalyticsDaily | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('org_analytics_daily')
    .select('*')
    .eq('org_id', orgId)
    .eq('analytics_date', today)
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data as import('types/b2b').OrgAnalyticsDaily | null;
}

/** 조직 설정 업데이트 */
export async function updateOrg(
  orgId: string,
  updates: Partial<Pick<Organization, 'name' | 'phone' | 'address' | 'settings'>>
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', orgId)
    .select()
    .single();
  if (error) throw error;
  return data as Organization;
}

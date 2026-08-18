/**
 * 조직(B2B) API — 조직/멤버/강아지/배정 CRUD
 * Parity: B2B-001
 */
import { supabase } from './supabase';
import { requestBackend } from './backend';
import { uploadImageToPublicStorage } from './storageImage';
import type { Organization, OrgMember, OrgDog, DogAssignment } from 'types/b2b';

/**
 * 조직 생성 + owner 멤버 자동 등록 (SECURITY DEFINER RPC)
 * RLS INSERT 정책 없는 organizations 테이블을 RPC로 원자적 처리
 */
export async function createOrganization(
  name: string,
  type: string = 'daycare',
): Promise<Organization> {
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_type: type,
  });
  if (error) throw error;
  return data as Organization;
}

/** 조직 상세 조회 */
export async function getOrg(orgId: string): Promise<Organization> {
  return requestBackend<Organization>(`/api/v1/org/${orgId}`);
}

/** 조직 멤버 목록 */
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  return requestBackend<OrgMember[]>(`/api/v1/org/${orgId}/members`);
}

/** 조직 소속 강아지 목록 (today 상태 포함) */
export interface OrgDogWithStatus extends OrgDog {
  dogs?: { name: string; breed?: string };
  today_log_count: number;
  has_today_report: boolean;
  last_log_time: string | null;
  trainer_name: string | null;
  needs_attention: boolean;
  attention_reason: string | null;
}

interface BackendOrgDogWithStatus {
  id: string;
  org_id: string;
  dog_id: string;
  parent_user_id?: string | null;
  parent_name?: string | null;
  group_tag?: string;
  enrolled_at: string;
  discharged_at?: string | null;
  status: string;
  dog_name?: string | null;
  dog_breed?: string | null;
  today_log_count?: number;
  has_today_report?: boolean;
  last_log_time?: string | null;
  trainer_name?: string | null;
  needs_attention?: boolean;
  attention_reason?: string | null;
}

function mapBackendOrgDog(row: BackendOrgDogWithStatus): OrgDogWithStatus {
  return {
    id: row.id,
    org_id: row.org_id,
    dog_id: row.dog_id,
    parent_user_id: row.parent_user_id ?? null,
    parent_name: row.parent_name ?? null,
    parent_phone_last4: null,
    group_tag: row.group_tag ?? 'default',
    enrolled_at: row.enrolled_at,
    discharged_at: row.discharged_at ?? null,
    status: row.status as OrgDog['status'],
    dogs: {
      name: row.dog_name ?? '',
      breed: row.dog_breed ?? undefined,
    },
    today_log_count: row.today_log_count ?? 0,
    has_today_report: row.has_today_report ?? false,
    last_log_time: row.last_log_time ?? null,
    trainer_name: row.trainer_name ?? null,
    needs_attention: row.needs_attention ?? false,
    attention_reason: row.attention_reason ?? null,
  };
}

export async function getOrgDogs(orgId: string): Promise<OrgDogWithStatus[]> {
  const rows = await requestBackend<BackendOrgDogWithStatus[]>(`/api/v1/org/${orgId}/dogs`);
  return rows.map(mapBackendOrgDog);
}

/** 활성 강아지 수 카운트 */
export async function getActiveOrgDogCount(orgId: string): Promise<number> {
  const { count } = await requestBackend<{ count: number }>(`/api/v1/org/${orgId}/dogs/count`);
  return count;
}

/** 활성 멤버 수 카운트 */
export async function getActiveOrgMemberCount(orgId: string): Promise<number> {
  const { count } = await requestBackend<{ count: number }>(`/api/v1/org/${orgId}/members/count`);
  return count;
}

/** 강아지 등록 (센터에 입소) + PII 저장 */
export async function enrollDog(input: {
  org_id: string;
  dog_id: string;
  parent_user_id?: string;
  parent_name?: string;
  group_tag?: string;
  parent_phone_last4?: string; // 인증용 명문 뒷 4자리
  parent_phone_enc?: string;   // 서버 저장용 암호화/인코딩 전화번호
  parent_email_enc?: string;   // btoa/암호화된 이메일
}): Promise<OrgDog> {
  return requestBackend<OrgDog, typeof input>('/api/v1/org/dogs/enroll', {
    method: 'POST',
    body: {
      ...input,
      parent_user_id: input.parent_user_id ?? undefined,
      parent_name: input.parent_name ?? undefined,
      group_tag: input.group_tag ?? 'default',
      parent_phone_last4: input.parent_phone_last4 ?? undefined,
      parent_phone_enc: input.parent_phone_enc ?? undefined,
      parent_email_enc: input.parent_email_enc ?? undefined,
    },
  });
}

/** 강아지 퇴소 */
export async function dischargeDog(orgDogId: string): Promise<void> {
  await requestBackend<{ success: boolean }>(`/api/v1/org/dogs/${orgDogId}/discharge`, {
    method: 'PATCH',
  });
}

/** 멤버 초대 */
export async function inviteMember(input: {
  org_id: string;
  user_id: string;
  role: OrgMember['role'];
}): Promise<OrgMember> {
  return requestBackend<OrgMember, typeof input>('/api/v1/org/members/invite', {
    method: 'POST',
    body: input,
  });
}

/** 담당자 배정 */
export async function assignDog(input: {
  dog_id: string;
  org_id?: string;
  trainer_user_id: string;
  role: DogAssignment['role'];
}): Promise<DogAssignment> {
  return requestBackend<DogAssignment, typeof input>('/api/v1/org/assignments', {
    method: 'POST',
    body: input,
  });
}

/** 담당자 배정 해제 */
export async function unassignDog(input: {
  dog_id: string;
  org_id?: string;
  trainer_user_id: string;
}): Promise<void> {
  await requestBackend<{ success: boolean }, typeof input>('/api/v1/org/assignments/unassign', {
    method: 'PATCH',
    body: input,
  });
}

/** 담당자 배정 목록 (조직 기준) */
export async function getOrgAssignments(orgId: string): Promise<DogAssignment[]> {
  return requestBackend<DogAssignment[]>(`/api/v1/org/${orgId}/assignments`);
}

/** 내 담당 강아지 목록 (훈련사 기준) */
export async function getMyAssignments(trainerId: string): Promise<DogAssignment[]> {
  void trainerId;
  return requestBackend<DogAssignment[]>('/api/v1/org/assignments/mine');
}

/** 조직 오늘의 통계 조회 */
export async function getOrgTodayStats(orgId: string): Promise<import('types/b2b').OrgAnalyticsDaily | null> {
  return requestBackend<import('types/b2b').OrgAnalyticsDaily | null>(`/api/v1/org/${orgId}/stats/today`);
}

/**
 * 센터 강아지 등록 — dogs 레코드 생성 후 org_dogs에 입소 처리
 * 서버가 현재 JWT 사용자와 조직 manager/owner 권한을 검증한 뒤 처리한다.
 */
export async function createOrgDog(input: {
  org_id: string;
  trainer_user_id: string; // dogs.user_id 임시 owner
  dog_name: string;
  dog_breed?: string;
  dog_sex: 'MALE' | 'FEMALE';
  parent_name?: string;
  parent_phone?: string;  // 선택 — 서버가 org_dogs_pii + last4로 분리 저장
  parent_address?: string; // 선택 — dogs.parent_address 저장
  vet_name?: string;       // 선택 — dogs.vet_name 저장
  animal_reg_no?: string;  // 선택 — dogs.animal_reg_no 저장
  group_tag?: string;
}): Promise<OrgDog> {
  void input.trainer_user_id;
  return requestBackend<OrgDog>('/api/v1/org/dogs/create', {
    method: 'POST',
    body: {
      org_id: input.org_id,
      dog_name: input.dog_name.trim(),
      dog_breed: input.dog_breed?.trim() || undefined,
      dog_sex: input.dog_sex,
      parent_name: input.parent_name?.trim() || undefined,
      parent_phone: input.parent_phone?.trim() || undefined,
      parent_address: input.parent_address?.trim() || undefined,
      vet_name: input.vet_name?.trim() || undefined,
      animal_reg_no: input.animal_reg_no?.trim() || undefined,
      group_tag: input.group_tag?.trim() || 'default',
    },
  });
}

/**
 * 현재 유저의 조직 + 멤버십 조회 (앱 부트스트랩용)
 * org_members JOIN organizations — B2B 역할 유저가 앱 시작 시 자신의 org를 로드할 때 사용
 */
export async function getMyOrg(
  userId: string,
): Promise<{ org: Organization; membership: OrgMember } | null> {
  void userId;
  return requestBackend<{ org: Organization; membership: OrgMember } | null>('/api/v1/org/mine');
}

/** 센터 로고 업로드 */
export async function uploadOrgLogoImage(userId: string, orgId: string, fileUri: string): Promise<string> {
  return uploadImageToPublicStorage('org-logos', `${userId}/${orgId}-${Date.now()}`, fileUri);
}

/** 조직 설정 업데이트 */
export async function updateOrg(
  orgId: string,
  updates: Partial<Pick<Organization, 'name' | 'phone' | 'address' | 'logo_url' | 'settings'>>
): Promise<Organization> {
  return requestBackend<Organization, typeof updates>(`/api/v1/org/${orgId}`, {
    method: 'PATCH',
    body: updates,
  });
}

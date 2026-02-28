/**
 * 대시보드 API — 프로필/통계/최근 로그 조회
 * Parity: APP-001
 */
import { requestBackend, withBackendFallback } from './backend';
import { getDog } from './dog';
import { getLogs } from './log';
import type { BehaviorLog } from 'types/log';

interface BackendDashboardDogProfile {
  id: string;
  name: string;
  breed: string | null;
  age_months: number | null;
  weight_kg: number | null;
  profile_image_url: string | null;
}

interface BackendQuickLogStats {
  total_logs: number;
  current_streak: number;
  last_logged_at: string | null;
}

interface BackendRecentLogItem {
  id: string;
  is_quick_log: boolean;
  quick_category: string | null;
  behavior: string | null;
  intensity: number;
  occurred_at: string;
  antecedent: string | null;
  consequence: string | null;
}

interface BackendDashboardResponse {
  dog_profile: BackendDashboardDogProfile;
  stats: BackendQuickLogStats;
  recent_logs: BackendRecentLogItem[];
  issues?: string[];
  env_triggers?: string[];
}

export interface DashboardData {
  dogProfile: BackendDashboardDogProfile;
  stats: BackendQuickLogStats;
  recentLogs: BehaviorLog[];
  issues: string[];
  envTriggers: string[];
}

function mapRecentLogItem(log: BackendRecentLogItem, dogId: string): BehaviorLog {
  return {
    id: log.id,
    dog_id: dogId,
    is_quick_log: log.is_quick_log,
    quick_category: (log.quick_category as BehaviorLog['quick_category']) ?? null,
    daily_activity: null,
    type_id: null,
    antecedent: log.antecedent ?? null,
    behavior: log.behavior ?? null,
    consequence: log.consequence ?? null,
    intensity: Math.min(10, Math.max(1, log.intensity)) as BehaviorLog['intensity'],
    duration_minutes: null,
    location: null,
    memo: null,
    occurred_at: log.occurred_at,
    created_at: log.occurred_at,
    updated_at: log.occurred_at,
  };
}

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

async function getDashboardFromBackend(dogId?: string): Promise<DashboardData> {
  const query = dogId ? `?dog_id=${encodeURIComponent(dogId)}` : '';
  const data = await requestBackend<BackendDashboardResponse>(`/api/v1/dashboard/${query}`, {
    headers: { 'X-Timezone': getLocalTimezone() },
  });

  return {
    dogProfile: data.dog_profile,
    stats: data.stats,
    recentLogs: (data.recent_logs ?? []).map((log) => mapRecentLogItem(log, data.dog_profile.id)),
    issues: data.issues ?? [],
    envTriggers: data.env_triggers ?? [],
  };
}

async function getDashboardFromFallback(dogId?: string): Promise<DashboardData> {
  if (!dogId) {
    throw new Error('DASHBOARD_DOG_ID_REQUIRED');
  }
  const [dog, logs] = await Promise.all([getDog(dogId), getLogs(dogId, 20)]);

  return {
    dogProfile: {
      id: dog.id,
      name: dog.name,
      breed: dog.breed ?? null,
      age_months: null,
      weight_kg: dog.weight_kg ?? null,
      profile_image_url: dog.profile_image_url ?? null,
    },
    stats: {
      total_logs: logs.length,
      current_streak: 0,
      last_logged_at: logs[0]?.occurred_at ?? null,
    },
    recentLogs: logs.slice(0, 20),
    issues: [],
    envTriggers: [],
  };
}

/** 대시보드 데이터 조회 (backend-first + fallback) */
export async function getDashboard(dogId?: string): Promise<DashboardData> {
  return withBackendFallback(
    () => getDashboardFromBackend(dogId),
    () => getDashboardFromFallback(dogId),
  );
}
